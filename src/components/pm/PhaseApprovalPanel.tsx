import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ProjectPhaseRecord, 
  PHASE_CONFIG, 
  useProjectPhases 
} from '@/hooks/useIndustrialProjects';
import { 
  Check, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  ArrowRight,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface PhaseApprovalPanelProps {
  projectId: string;
  currentPhase: string;
}

export function PhaseApprovalPanel({ projectId, currentPhase }: PhaseApprovalPanelProps) {
  const { user } = useAuth();
  const { phases, isLoading, approvePhase, rejectPhase, moveToNextPhase } = useProjectPhases(projectId);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhaseRecord | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const currentPhaseRecord = phases?.find(p => p.phase === currentPhase);

  const handleApprove = async () => {
    if (!currentPhaseRecord) return;
    
    await approvePhase.mutateAsync({
      phaseId: currentPhaseRecord.id,
      notes: approvalNotes,
    });
    
    // Auto-advance to next phase after approval
    await moveToNextPhase.mutateAsync(currentPhaseRecord.id);
    setApprovalNotes('');
  };

  const handleReject = async () => {
    if (!currentPhaseRecord || !rejectionReason) return;
    
    await rejectPhase.mutateAsync({
      phaseId: currentPhaseRecord.id,
      reason: rejectionReason,
    });
    
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  };

  const handleAdvance = async () => {
    if (!currentPhaseRecord) return;
    await moveToNextPhase.mutateAsync(currentPhaseRecord.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!currentPhaseRecord) {
    return null;
  }

  const config = PHASE_CONFIG[currentPhaseRecord.phase];
  const requiresApproval = currentPhaseRecord.requires_approval;
  const isAwaitingApproval = currentPhaseRecord.status === 'awaiting_approval';
  const isInProgress = currentPhaseRecord.status === 'in_progress';
  const isCompleted = currentPhaseRecord.status === 'completed' || currentPhaseRecord.status === 'approved';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Current Phase: {config.label}
            </CardTitle>
            <Badge variant={
              isCompleted ? 'default' :
              isAwaitingApproval ? 'secondary' :
              isInProgress ? 'outline' : 'secondary'
            }>
              {currentPhaseRecord.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{config.department}</span>
            </div>
            {currentPhaseRecord.started_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">
                  {format(new Date(currentPhaseRecord.started_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {currentPhaseRecord.notes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{currentPhaseRecord.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {currentPhaseRecord.status === 'rejected' && currentPhaseRecord.rejection_reason && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
              <p className="text-sm">{currentPhaseRecord.rejection_reason}</p>
            </div>
          )}

          {/* Actions */}
          {isInProgress && !isCompleted && (
            <div className="flex flex-col gap-3 pt-4 border-t">
              {requiresApproval ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Approval Notes (Optional)</label>
                    <Textarea
                      value={approvalNotes}
                      onChange={e => setApprovalNotes(e.target.value)}
                      placeholder="Add notes for this approval..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsRejectDialogOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={approvePhase.isPending || moveToNextPhase.isPending}
                    >
                      {(approvePhase.isPending || moveToNextPhase.isPending) ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve & Advance
                    </Button>
                  </div>
                </>
              ) : (
                <Button 
                  onClick={handleAdvance}
                  disabled={moveToNextPhase.isPending}
                >
                  {moveToNextPhase.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Complete & Advance to Next Phase
                </Button>
              )}
            </div>
          )}

          {isCompleted && currentPhase !== 'completed' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">
                This phase has been completed
              </span>
            </div>
          )}

          {currentPhase === 'completed' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">
                Project Completed Successfully!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting the {config.label} phase.
            </p>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || rejectPhase.isPending}
            >
              {rejectPhase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
