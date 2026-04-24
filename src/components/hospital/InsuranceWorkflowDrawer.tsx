import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, History, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { InsuranceStageStepper } from './InsuranceStageStepper';
import {
  nextAllowed,
  useAdvanceInsuranceStage,
  useInsuranceHistory,
  type InsuranceApproval,
} from '@/hooks/useInsuranceWorkflow';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  approval: InsuranceApproval | null;
}

const STAGE_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  insurer_review: 'Insurer Review',
  medical_review: 'Medical Review',
  pending: 'Pending',
  approved: 'Approve',
  partial: 'Partial Approve',
  rejected: 'Reject',
  appealed: 'File Appeal',
  expired: 'Mark Expired',
  cancelled: 'Cancel',
};

export function InsuranceWorkflowDrawer({ open, onOpenChange, approval }: Props) {
  const advance = useAdvanceInsuranceStage();
  const { data: history = [] } = useInsuranceHistory(approval?.id);

  const [target, setTarget] = useState<string>('');
  const [comments, setComments] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [approvalNo, setApprovalNo] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!approval) return null;

  const allowed = nextAllowed(approval.status);
  const isApprovalDecision = ['approved', 'partial'].includes(target);
  const isRejection = target === 'rejected';

  const submit = async () => {
    if (!target) return;
    await advance.mutateAsync({
      id: approval.id,
      to_status: target,
      comments: comments || undefined,
      approved_amount: isApprovalDecision && approvedAmount ? parseFloat(approvedAmount) : undefined,
      approval_no: isApprovalDecision && approvalNo ? approvalNo : undefined,
      rejection_reason: isRejection && rejectionReason ? rejectionReason : undefined,
    });
    setTarget(''); setComments(''); setApprovedAmount(''); setApprovalNo(''); setRejectionReason('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Pre-Authorization · {approval.payer}
            <Badge variant="outline">{approval.priority}</Badge>
            {approval.appeal_count > 0 && (
              <Badge variant="outline" className="border-violet-500/40 text-violet-700">
                Appeal #{approval.appeal_count}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Stage progress */}
          <div className="border rounded-md p-3 bg-muted/30">
            <InsuranceStageStepper current={approval.status} />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Policy:</span> {approval.policy_no || '—'}</div>
            <div><span className="text-muted-foreground">Approval #:</span> {approval.approval_no || '—'}</div>
            <div><span className="text-muted-foreground">Requested:</span> {Number(approval.requested_amount || 0).toFixed(2)}</div>
            <div><span className="text-muted-foreground">Approved:</span> {approval.approved_amount != null ? Number(approval.approved_amount).toFixed(2) : '—'}</div>
            {approval.expected_service_date && (
              <div><span className="text-muted-foreground">Service:</span> {approval.expected_service_date}</div>
            )}
            {approval.sla_due_at && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">SLA:</span> {format(new Date(approval.sla_due_at), 'PP p')}
                {new Date(approval.sla_due_at) < new Date() && approval.responded_at == null && (
                  <Badge variant="outline" className="border-destructive/40 text-destructive ml-1">overdue</Badge>
                )}
              </div>
            )}
          </div>

          {approval.rejection_reason && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3 text-sm">
              <div className="flex items-center gap-1 font-medium text-destructive mb-1">
                <XCircle className="h-3.5 w-3.5" /> Rejection reason
              </div>
              {approval.rejection_reason}
            </div>
          )}

          <Separator />

          {/* Action panel */}
          {allowed.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-1">
                <ArrowRight className="h-4 w-4" /> Advance workflow
              </div>
              <div>
                <Label>Next action</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue placeholder="Choose next stage" /></SelectTrigger>
                  <SelectContent>
                    {allowed.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABEL[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isApprovalDecision && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Approved amount</Label>
                    <Input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
                  </div>
                  <div><Label>Approval #</Label>
                    <Input value={approvalNo} onChange={(e) => setApprovalNo(e.target.value)} />
                  </div>
                </div>
              )}

              {isRejection && (
                <div>
                  <Label>Rejection reason</Label>
                  <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g. Service not covered" />
                </div>
              )}

              <div>
                <Label>Comments</Label>
                <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
              </div>

              <Button onClick={submit} disabled={!target || advance.isPending} className="w-full">
                {target === 'rejected' ? <XCircle className="h-4 w-4 mr-1" />
                  : isApprovalDecision ? <CheckCircle2 className="h-4 w-4 mr-1" />
                  : <ArrowRight className="h-4 w-4 mr-1" />}
                {target ? `Move to ${STAGE_LABEL[target] || target}` : 'Select an action'}
              </Button>
            </div>
          ) : (
            <div className="border border-muted rounded-md p-3 text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No further actions available from this state.
            </div>
          )}

          <Separator />

          {/* History */}
          <div>
            <div className="text-sm font-medium flex items-center gap-1 mb-2">
              <History className="h-4 w-4" /> History ({history.length})
            </div>
            {history.length === 0 ? (
              <div className="text-xs text-muted-foreground">No transitions yet.</div>
            ) : (
              <ol className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{h.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {h.from_status || '∅'} → {h.to_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(h.created_at), 'PP p')}
                      </span>
                    </div>
                    {h.comments && <div className="text-xs text-muted-foreground mt-0.5">{h.comments}</div>}
                    {h.approved_amount != null && (
                      <div className="text-xs">Approved amount: <strong>{Number(h.approved_amount).toFixed(2)}</strong></div>
                    )}
                    {h.rejection_reason && (
                      <div className="text-xs text-destructive">Reason: {h.rejection_reason}</div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
