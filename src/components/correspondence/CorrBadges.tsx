import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CorrStatus, CorrPriority, CorrConfidentiality, CorrSyncStatus } from '@/integrations/supabase/correspondence-tables';

const statusColors: Record<CorrStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  registered: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  in_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  assigned: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  in_progress: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  pending_approval: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  returned: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  rejected: 'bg-destructive/15 text-destructive',
  dispatched: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  delivered: 'bg-green-500/15 text-green-700 dark:text-green-300',
  closed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  archived: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function CorrStatusBadge({ status }: { status: CorrStatus }) {
  return <Badge variant="outline" className={cn('font-medium border-0', statusColors[status])}>{status.replace('_', ' ')}</Badge>;
}

const priorityColors: Record<CorrPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  high: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  urgent: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  critical: 'bg-destructive/15 text-destructive',
};
export function CorrPriorityBadge({ p }: { p: CorrPriority }) {
  return <Badge variant="outline" className={cn('border-0', priorityColors[p])}>{p}</Badge>;
}

const confColors: Record<CorrConfidentiality, string> = {
  public: 'bg-green-500/15 text-green-700 dark:text-green-300',
  internal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  confidential: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  restricted: 'bg-destructive/15 text-destructive',
  top_secret: 'bg-destructive text-destructive-foreground',
};
export function CorrConfBadge({ c }: { c: CorrConfidentiality }) {
  return <Badge variant="outline" className={cn('border-0', confColors[c])}>{c.replace('_', ' ')}</Badge>;
}

const syncColors: Record<CorrSyncStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  synced: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-destructive/15 text-destructive',
  retry_required: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  not_required: 'bg-muted text-muted-foreground',
};
export function CorrEcmBadge({ s }: { s: CorrSyncStatus }) {
  return <Badge variant="outline" className={cn('border-0', syncColors[s])}>{s.replace('_', ' ')}</Badge>;
}
