import { useState } from 'react';
import { format } from 'date-fns';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useFinancialClearances, FinancialClearance } from '@/hooks/useFinance';

interface FinancialClearanceListProps {
  searchQuery?: string;
}

export function FinancialClearanceList({ searchQuery = '' }: FinancialClearanceListProps) {
  const { 
    pendingClearances, 
    approvedClearances, 
    isLoading, 
    approveClearance,
    rejectClearance 
  } = useFinancialClearances();

  const [selectedClearance, setSelectedClearance] = useState<FinancialClearance | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = () => {
    if (selectedClearance) {
      approveClearance.mutate({
        id: selectedClearance.id,
        notes: approvalNotes || undefined,
      }, {
        onSuccess: () => {
          setApproveDialogOpen(false);
          setSelectedClearance(null);
          setApprovalNotes('');
        }
      });
    }
  };

  const handleReject = () => {
    if (selectedClearance && rejectReason) {
      rejectClearance.mutate({
        id: selectedClearance.id,
        reason: rejectReason,
      }, {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedClearance(null);
          setRejectReason('');
        }
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getPaymentProgress = (clearance: FinancialClearance) => {
    const total = clearance.total_contract_value || 0;
    const received = clearance.total_received || 0;
    return total > 0 ? (received / total) * 100 : 0;
  };

  const filteredPending = pendingClearances.filter(c =>
    !searchQuery ||
    c.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sales_order?.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clearance_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApproved = approvedClearances.filter(c =>
    !searchQuery ||
    c.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sales_order?.contract_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading clearances...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Clearances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Financial Clearances ({filteredPending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending clearances</p>
          ) : (
            <div className="space-y-4">
              {filteredPending.map((clearance) => (
                <div
                  key={clearance.id}
                  className="p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium capitalize">
                            {clearance.clearance_type?.replace('_', ' ')}
                          </h4>
                          {getStatusBadge(clearance.status)}
                        </div>
                        {clearance.sales_order && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {clearance.sales_order.contract_number || `SO-${clearance.sales_order.doc_num}`} • {clearance.sales_order.customer_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedClearance(clearance);
                          setApproveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedClearance(clearance);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Contract Value</p>
                      <p className="font-semibold text-lg">
                        SAR {clearance.total_contract_value?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="font-semibold text-lg text-green-600">
                        SAR {clearance.total_received?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className="font-semibold text-lg text-orange-600">
                        SAR {clearance.outstanding_amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Payment Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">{getPaymentProgress(clearance).toFixed(0)}%</span>
                    </div>
                    <Progress value={getPaymentProgress(clearance)} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Clearances */}
      {filteredApproved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approved Clearances ({filteredApproved.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredApproved.map((clearance) => (
                <div
                  key={clearance.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-medium text-sm">
                        {clearance.sales_order?.contract_number || `SO-${clearance.sales_order?.doc_num}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {clearance.sales_order?.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">SAR {clearance.total_contract_value?.toLocaleString()}</p>
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">
                          {getPaymentProgress(clearance).toFixed(0)}% received
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-green-500">Approved</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Financial Clearance</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedClearance && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedClearance.sales_order?.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  Contract Value: SAR {selectedClearance.total_contract_value?.toLocaleString()}
                </p>
              </div>
            )}
            <Label>Approval Notes (Optional)</Label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes for this approval..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Approving will move the project to the Operations Verification phase.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveClearance.isPending}>
              {approveClearance.isPending ? 'Approving...' : 'Approve Clearance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Financial Clearance</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || rejectClearance.isPending}>
              {rejectClearance.isPending ? 'Rejecting...' : 'Reject Clearance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
