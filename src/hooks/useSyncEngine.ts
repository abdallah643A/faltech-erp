import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useOnlineStatus } from "./useOnlineStatus";
import { flushOutbox, type SyncSummary } from "@/lib/offline/syncEngine";
import { outboxCountPending } from "@/lib/offline/db";
import { toast } from "sonner";

/**
 * useSyncEngine
 *  - exposes pending count + manual `sync()` trigger
 *  - auto-flushes when the device transitions offline -> online
 */
export function useSyncEngine() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null);

  const refresh = useCallback(async () => {
    setPending(await outboxCountPending());
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const s = await flushOutbox({
        companyId: activeCompanyId,
        userId: user?.id,
      });
      setLastSummary(s);
      if (s.applied > 0) {
        toast.success(
          `Synced ${s.applied} change${s.applied === 1 ? "" : "s"}` +
            (s.conflicts ? ` · ${s.conflicts} conflict${s.conflicts === 1 ? "" : "s"} auto-resolved` : ""),
        );
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncing, activeCompanyId, user?.id, refresh]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  // Auto-flush on reconnect.
  useEffect(() => {
    if (online && pending > 0 && !syncing) {
      void sync();
    }
  }, [online, pending, syncing, sync]);

  return { online, pending, syncing, lastSummary, sync, refresh };
}
