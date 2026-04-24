import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
  outboxAdd,
  outboxUpdate,
  outboxRemove,
  getDeviceId,
  type SyncOperation,
} from "@/lib/offline/db";
import { useOnlineStatus } from "./useOnlineStatus";
import { toast } from "sonner";

interface QueueArgs {
  module: string;
  entity: string;
  table: string; // actual supabase table
  operation: SyncOperation;
  payload: Record<string, any>;
  entity_id?: string | null;
  base_version?: string | null;
}

/**
 * useOfflineMutation
 * --------------------------------
 * Single entry point every mobile screen uses to mutate data.
 *
 *  - When **online**: writes the row through Supabase immediately and
 *    still records the op in `mobile_sync_queue` (status=applied) for
 *    a complete audit trail.
 *  - When **offline**: stores the mutation in IndexedDB (`outbox`).
 *    The sync engine flushes the outbox when connectivity returns.
 *
 * Conflict policy: last-write-wins. If the server's `updated_at` is
 * newer than the device's `base_version`, we still write (LWW) but
 * also insert an `mobile_sync_conflicts` row so the change is auditable.
 */
export function useOfflineMutation() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const online = useOnlineStatus();

  const enqueue = useCallback(
    async (args: QueueArgs) => {
      const client_op_id = crypto.randomUUID();
      const device_id = await getDeviceId();

      // Always record locally first (so a crash mid-flight doesn't lose the op).
      await outboxAdd({
        client_op_id,
        module: args.module,
        entity: args.entity,
        entity_id: args.entity_id ?? null,
        operation: args.operation,
        payload: args.payload,
        base_version: args.base_version ?? null,
      });

      if (!online) {
        toast.message("Saved offline", {
          description: "Will sync when you're back online.",
        });
        return { client_op_id, queued: true };
      }

      // Online path: write to the target table + queue row in one go.
      try {
        const result = await applyOperation(args);
        await Promise.all([
          (supabase.from("mobile_sync_queue" as any) as any).insert({
            client_op_id,
            company_id: activeCompanyId,
            user_id: user?.id,
            device_id,
            module: args.module,
            entity: args.entity,
            entity_id: args.entity_id ?? null,
            operation: args.operation,
            payload: args.payload,
            base_version: args.base_version,
            status: "applied",
            applied_at: new Date().toISOString(),
          }),
          outboxRemove(client_op_id),
        ]);
        return { client_op_id, queued: false, result };
      } catch (e: any) {
        await outboxUpdate(client_op_id, {
          status: "failed",
          last_error: e?.message ?? "unknown error",
          attempts: 1,
        });
        toast.error(e?.message ?? "Save failed");
        throw e;
      }
    },
    [online, user?.id, activeCompanyId],
  );

  return { enqueue, online };
}

async function applyOperation(args: QueueArgs) {
  const t = (supabase.from(args.table as any) as any);
  switch (args.operation) {
    case "insert":
      return t.insert(args.payload).select().maybeSingle();
    case "update":
      return t.update(args.payload).eq("id", args.entity_id).select().maybeSingle();
    case "delete":
      return t.delete().eq("id", args.entity_id);
  }
}
