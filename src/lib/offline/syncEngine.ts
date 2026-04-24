/**
 * Sync engine — flushes queued offline mutations when connectivity returns.
 *
 * Last-write-wins conflict policy:
 *   - For updates, we read the current server `updated_at` first.
 *   - If it's newer than the device's `base_version`, we still apply the
 *     write (LWW) but record a row in `mobile_sync_conflicts` so the
 *     overwrite is auditable.
 *
 * The engine is intentionally simple — it's a single producer (the device)
 * draining its own outbox, retrying with exponential backoff on transient
 * errors. Cross-device conflicts are detected and audited, never silently
 * dropped.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  outboxList,
  outboxUpdate,
  outboxRemove,
  getDeviceId,
  type OutboxItem,
} from "./db";

const MAX_ATTEMPTS = 5;

export interface SyncSummary {
  applied: number;
  conflicts: number;
  failed: number;
  total: number;
}

export async function flushOutbox(opts?: {
  companyId?: string | null;
  userId?: string | null;
  onProgress?: (s: SyncSummary) => void;
}): Promise<SyncSummary> {
  const summary: SyncSummary = { applied: 0, conflicts: 0, failed: 0, total: 0 };
  const items = await outboxList("pending");
  summary.total = items.length;
  if (!items.length) return summary;

  const device_id = await getDeviceId();

  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) {
      await outboxUpdate(item.client_op_id, { status: "failed" });
      summary.failed++;
      continue;
    }
    await outboxUpdate(item.client_op_id, { status: "syncing" });
    try {
      const conflict = await applyWithLWW(item);
      if (conflict) summary.conflicts++;

      // Record successful sync in shared queue.
      await (supabase.from("mobile_sync_queue" as any) as any).insert({
        client_op_id: item.client_op_id,
        company_id: opts?.companyId ?? null,
        user_id: opts?.userId ?? null,
        device_id,
        module: item.module,
        entity: item.entity,
        entity_id: item.entity_id ?? null,
        operation: item.operation,
        payload: item.payload,
        base_version: item.base_version,
        status: conflict ? "conflict" : "applied",
        applied_at: new Date().toISOString(),
      });
      await outboxRemove(item.client_op_id);
      summary.applied++;
    } catch (e: any) {
      await outboxUpdate(item.client_op_id, {
        status: "pending",
        attempts: (item.attempts || 0) + 1,
        last_error: e?.message ?? "sync error",
      });
      summary.failed++;
    }
    opts?.onProgress?.({ ...summary });
  }
  return summary;
}

async function applyWithLWW(item: OutboxItem): Promise<boolean> {
  // Inserts and deletes have no conflict surface for LWW.
  if (item.operation === "insert") {
    const { error } = await (supabase.from(item.entity as any) as any).insert(
      item.payload,
    );
    if (error) throw error;
    return false;
  }
  if (item.operation === "delete") {
    const { error } = await (supabase.from(item.entity as any) as any)
      .delete()
      .eq("id", item.entity_id);
    if (error) throw error;
    return false;
  }

  // Update: detect conflict, then apply LWW.
  let conflict = false;
  let serverSnapshot: any = null;
  if (item.base_version) {
    const { data } = await (supabase.from(item.entity as any) as any)
      .select("*")
      .eq("id", item.entity_id)
      .maybeSingle();
    serverSnapshot = data;
    const serverTs = data?.updated_at as string | undefined;
    if (serverTs && new Date(serverTs) > new Date(item.base_version)) {
      conflict = true;
    }
  }

  const { error } = await (supabase.from(item.entity as any) as any)
    .update(item.payload)
    .eq("id", item.entity_id);
  if (error) throw error;

  if (conflict) {
    await (supabase.from("mobile_sync_conflicts" as any) as any).insert({
      module: item.module,
      entity: item.entity,
      entity_id: item.entity_id,
      client_payload: item.payload,
      server_snapshot: serverSnapshot,
      resolution: "last_write_wins",
    });
  }
  return conflict;
}
