import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useSyncEngine } from "@/hooks/useSyncEngine";

/** Compact pill shown in mobile headers: connectivity + queue depth + manual sync. */
export function SyncStatusBadge() {
  const { online, pending, syncing, sync } = useSyncEngine();
  return (
    <div className="flex items-center gap-1">
      <Badge
        variant={online ? "outline" : "destructive"}
        className="gap-1 text-[10px] h-6"
      >
        {online ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
        {online ? "Online" : "Offline"}
      </Badge>
      {pending > 0 && (
        <Badge variant="secondary" className="text-[10px] h-6">
          {pending} queued
        </Badge>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={() => sync()}
        disabled={!online || syncing || pending === 0}
        title="Sync now"
      >
        {syncing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
