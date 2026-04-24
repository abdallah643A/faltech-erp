import { ReactNode } from 'react';
import { Hospital } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function HospitalShell({ title, subtitle, icon, actions, children }: Props) {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            {icon || <Hospital className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function statusColor(status: string): string {
  const s = status?.toLowerCase() || '';
  if (['critical', 'in_icu', 'in_nicu', 'deceased', 'rejected', 'overdue'].includes(s)) return 'bg-destructive/10 text-destructive border-destructive/30';
  if (['urgent', 'discharge_pending', 'transfer_pending', 'partial', 'in_progress', 'pending'].includes(s)) return 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400';
  if (['discharged', 'completed', 'paid', 'dispensed', 'closed', 'available'].includes(s)) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';
  if (['admitted', 'in_consultation', 'in_ward', 'in_surgery', 'occupied', 'open', 'ordered'].includes(s)) return 'bg-primary/10 text-primary border-primary/30';
  if (['waiting', 'registered', 'in_triage', 'cleaning', 'standard'].includes(s)) return 'bg-muted text-foreground border-border';
  return 'bg-muted text-muted-foreground border-border';
}
