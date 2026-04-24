import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncStatusBadgeProps {
  syncStatus: string | null;
  lastSyncError?: string | null;
  size?: 'sm' | 'md';
}

export function SyncStatusBadge({ syncStatus, lastSyncError, size = 'sm' }: SyncStatusBadgeProps) {
  const textSize = size === 'sm' ? 'text-[10px] px-1 py-0' : 'text-xs';
  
  const badge = (() => {
    switch (syncStatus) {
      case 'synced':
        return <Badge variant="outline" className={`${textSize} border-success text-success`}>Synced</Badge>;
      case 'error':
        return <Badge variant="destructive" className={`${textSize}`}>Error</Badge>;
      case 'pending':
        return <Badge variant="secondary" className={`${textSize} bg-warning/10 text-warning`}>Pending</Badge>;
      default:
        return <Badge variant="secondary" className={`${textSize}`}>{syncStatus || 'Local'}</Badge>;
    }
  })();

  if (syncStatus === 'error' && lastSyncError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs break-words">
          <p className="font-semibold text-destructive mb-1">Sync Error:</p>
          <p>{lastSyncError}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
