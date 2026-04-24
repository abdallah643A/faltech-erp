import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_FLOW } from '@/hooks/useInsuranceWorkflow';

interface Props {
  current: string;
}

const STAGE_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  insurer_review: 'Insurer Review',
  medical_review: 'Medical Review',
  pending: 'Pending',
  approved: 'Approved',
  partial: 'Partial',
  rejected: 'Rejected',
  appealed: 'Appealed',
  expired: 'Expired',
  cancelled: 'Cancelled',
  requested: 'Requested',
};

export function InsuranceStageStepper({ current }: Props) {
  const isTerminal = ['rejected', 'expired', 'cancelled'].includes(current);
  const isPartial = current === 'partial';
  const isAppeal = current === 'appealed';

  const steps = STAGE_FLOW;
  const currentIdx = steps.indexOf(current as any);

  return (
    <div className="flex items-center gap-1 flex-wrap text-xs">
      {steps.map((step, i) => {
        const reached = currentIdx >= 0 && i <= currentIdx;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md border',
                isCurrent
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : reached
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-300'
                  : 'border-border text-muted-foreground'
              )}
            >
              {reached && !isCurrent ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : isCurrent ? (
                <Clock className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>{STAGE_LABEL[step]}</span>
            </div>
            {i < steps.length - 1 && <div className="w-3 h-px bg-border" />}
          </div>
        );
      })}
      {isTerminal && (
        <div className="ml-2 px-2 py-1 rounded-md border border-destructive/40 bg-destructive/10 text-destructive font-medium">
          {STAGE_LABEL[current]}
        </div>
      )}
      {isPartial && (
        <div className="ml-2 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 font-medium">
          Partial
        </div>
      )}
      {isAppeal && (
        <div className="ml-2 px-2 py-1 rounded-md border border-violet-500/40 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 font-medium">
          Appealed
        </div>
      )}
    </div>
  );
}
