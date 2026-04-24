import { Check, Clock, AlertCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectPhaseRecord, PHASE_CONFIG, PhaseStatus } from '@/hooks/useIndustrialProjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PhaseTimelineProps {
  phases: ProjectPhaseRecord[];
  currentPhase: string;
  onPhaseClick?: (phase: ProjectPhaseRecord) => void;
  onApprove?: (phaseId: string) => void;
  onReject?: (phaseId: string) => void;
  onAdvance?: (phaseId: string) => void;
  isAdvancing?: boolean;
}

const statusIcons: Record<PhaseStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
  awaiting_approval: <AlertCircle className="h-4 w-4" />,
  approved: <Check className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  completed: <Check className="h-4 w-4" />,
  skipped: <ArrowRight className="h-4 w-4" />,
};

const statusColors: Record<PhaseStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-muted',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  awaiting_approval: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  skipped: 'bg-muted text-muted-foreground border-muted',
};

export function PhaseTimeline({ 
  phases, 
  currentPhase, 
  onPhaseClick,
  onApprove,
  onReject,
  onAdvance,
  isAdvancing,
}: PhaseTimelineProps) {
  const phaseOrder = [
    'sales_initiation',
    'finance_verification',
    'operations_verification',
    'design_costing',
    'finance_gate_2',
    'procurement',
    'production',
    'final_payment',
    'logistics',
    'completed',
  ];

  const sortedPhases = [...phases].sort((a, b) => 
    phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  );

  return (
    <div className="w-full">
      {/* Horizontal Timeline for larger screens */}
      <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {sortedPhases.map((phase, index) => {
          const config = PHASE_CONFIG[phase.phase];
          const isCurrent = phase.phase === currentPhase;
          const isCompleted = phase.status === 'completed' || phase.status === 'approved';
          
          return (
            <div key={phase.id} className="flex items-center flex-1 min-w-[120px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onPhaseClick?.(phase)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-full',
                      statusColors[phase.status],
                      isCurrent && 'ring-2 ring-primary ring-offset-2',
                      'hover:shadow-md cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      isCompleted ? 'bg-green-500 text-white' : 
                      phase.status === 'in_progress' ? 'bg-blue-500 text-white' :
                      phase.status === 'awaiting_approval' ? 'bg-yellow-500 text-white' :
                      phase.status === 'rejected' ? 'bg-red-500 text-white' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {statusIcons[phase.status]}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium truncate max-w-[100px]">
                        {config.label}
                      </p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {config.department}
                      </Badge>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs capitalize">Status: {phase.status.replace('_', ' ')}</p>
                    {phase.notes && <p className="text-xs">{phase.notes}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {index < sortedPhases.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-2 min-w-[20px]',
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Vertical Timeline for mobile */}
      <div className="md:hidden space-y-3">
        {sortedPhases.map((phase, index) => {
          const config = PHASE_CONFIG[phase.phase];
          const isCurrent = phase.phase === currentPhase;
          const isCompleted = phase.status === 'completed' || phase.status === 'approved';
          
          return (
            <div key={phase.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  isCompleted ? 'bg-green-500 text-white' : 
                  phase.status === 'in_progress' ? 'bg-blue-500 text-white' :
                  phase.status === 'awaiting_approval' ? 'bg-yellow-500 text-white' :
                  phase.status === 'rejected' ? 'bg-red-500 text-white' :
                  'bg-muted text-muted-foreground'
                )}>
                  {statusIcons[phase.status]}
                </div>
                {index < sortedPhases.length - 1 && (
                  <div className={cn(
                    'w-0.5 h-8',
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  )} />
                )}
              </div>
              
              <button
                onClick={() => onPhaseClick?.(phase)}
                className={cn(
                  'flex-1 p-3 rounded-lg border text-left transition-all',
                  statusColors[phase.status],
                  isCurrent && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{config.label}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {config.department}
                  </Badge>
                </div>
                <p className="text-xs capitalize mt-1">
                  {phase.status.replace('_', ' ')}
                </p>
              </button>
            </div>
          );
        })}
      </div>

      {/* Action buttons for current phase */}
      {phases.find(p => p.phase === currentPhase)?.status === 'awaiting_approval' && (
        <div className="flex justify-center gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const current = phases.find(p => p.phase === currentPhase);
              if (current) onReject?.(current.id);
            }}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const current = phases.find(p => p.phase === currentPhase);
              if (current) onApprove?.(current.id);
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      )}

      {phases.find(p => p.phase === currentPhase)?.status === 'in_progress' && currentPhase !== 'completed' && (
        <div className="flex justify-center mt-4 pt-4 border-t">
          <Button
            size="sm"
            onClick={() => {
              const current = phases.find(p => p.phase === currentPhase);
              if (current) onAdvance?.(current.id);
            }}
            disabled={isAdvancing}
          >
            {isAdvancing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Advance to Next Phase
          </Button>
        </div>
      )}
    </div>
  );
}
