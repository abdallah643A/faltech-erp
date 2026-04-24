import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  registered:           { label: 'Registered',         classes: 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300' },
  waiting:              { label: 'Waiting',            classes: 'bg-muted text-foreground border-border' },
  in_triage:            { label: 'In Triage',          classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  in_consultation:      { label: 'In Consultation',    classes: 'bg-primary/10 text-primary border-primary/30' },
  sent_to_lab:          { label: 'Sent to Lab',        classes: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400' },
  sent_to_radiology:    { label: 'Sent to Radiology',  classes: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-400' },
  prescription_pending: { label: 'Rx Pending',         classes: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400' },
  admitted:             { label: 'Admitted',           classes: 'bg-primary/10 text-primary border-primary/30' },
  in_ward:              { label: 'In Ward',            classes: 'bg-primary/10 text-primary border-primary/30' },
  in_surgery:           { label: 'In Surgery',         classes: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400' },
  in_recovery:          { label: 'In Recovery',        classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  in_icu:               { label: 'In ICU',             classes: 'bg-destructive/10 text-destructive border-destructive/30' },
  in_nicu:              { label: 'In NICU',            classes: 'bg-destructive/10 text-destructive border-destructive/30' },
  transfer_pending:     { label: 'Transfer Pending',   classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  discharge_pending:    { label: 'Discharge Pending',  classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  discharged:           { label: 'Discharged',         classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  cancelled:            { label: 'Cancelled',          classes: 'bg-muted text-muted-foreground border-border' },
  deceased:             { label: 'Deceased',           classes: 'bg-destructive/20 text-destructive border-destructive/40' },
};

export function PatientStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, classes: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={cn(cfg.classes, 'font-medium', className)}>
      {cfg.label}
    </Badge>
  );
}

export const PATIENT_STATUSES = Object.keys(STATUS_CONFIG);
