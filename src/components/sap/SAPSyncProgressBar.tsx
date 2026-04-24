import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface SAPSyncProgressBarProps {
  isLoading: boolean;
  entityLabel?: string;
  result?: { success: boolean; synced?: number; created?: number; error?: string } | null;
  className?: string;
  compact?: boolean;
  syncedSoFar?: number;
  totalToSync?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function SAPSyncProgressBar({ isLoading, entityLabel, result, className, compact = false, syncedSoFar = 0, totalToSync = 0, dateFrom, dateTo }: SAPSyncProgressBarProps) {
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  const hasRealProgress = totalToSync > 0;
  const realProgress = hasRealProgress ? Math.round((syncedSoFar / totalToSync) * 100) : 0;

  useEffect(() => {
    if (!isLoading) {
      if (result) {
        setPhase(result.success ? 'done' : 'error');
        const timer = setTimeout(() => setPhase('idle'), 4000);
        return () => clearTimeout(timer);
      }
      return;
    }
    setPhase('syncing');
  }, [isLoading, result]);

  if (phase === 'idle') return null;

  const progressValue = phase === 'done' ? 100 : phase === 'error' ? 100 : realProgress;

  const dateRangeText = dateFrom || dateTo
    ? ` (${dateFrom || '…'} → ${dateTo || '…'})`
    : '';

  const statusText = phase === 'done'
    ? `Sync complete!${dateRangeText}`
    : phase === 'error'
    ? 'Sync failed'
    : hasRealProgress
    ? `Syncing ${syncedSoFar} of ${totalToSync} records${dateRangeText}...`
    : `Syncing${dateRangeText}...`;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {phase === 'done' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        ) : phase === 'error' ? (
          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <Progress value={progressValue} className="h-1.5" />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {hasRealProgress ? `${syncedSoFar}/${totalToSync}` : `${progressValue}%`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300',
      phase === 'done' ? 'border-success/30 bg-success/5' :
      phase === 'error' ? 'border-destructive/30 bg-destructive/5' :
      'border-primary/30 bg-primary/5',
      className,
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {phase === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : phase === 'error' ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="text-xs font-medium">
            {entityLabel ? `${entityLabel} — ` : ''}{statusText}
          </span>
        </div>
        <span className={cn(
          'text-xs font-bold tabular-nums',
          phase === 'done' ? 'text-success' :
          phase === 'error' ? 'text-destructive' :
          'text-primary',
        )}>
          {hasRealProgress ? `${syncedSoFar} / ${totalToSync}` : `${progressValue}%`}
        </span>
      </div>
      <Progress
        value={progressValue}
        className={cn(
          'h-2.5 transition-all',
          phase === 'done' && '[&>div]:bg-success',
          phase === 'error' && '[&>div]:bg-destructive',
        )}
      />
      {phase === 'done' && result && (
        <p className="text-[10px] text-muted-foreground">
          Synced: {result.synced || 0} • Created: {result.created || 0}
        </p>
      )}
      {phase === 'error' && result?.error && (
        <p className="text-[10px] text-destructive">{result.error}</p>
      )}
    </div>
  );
}
