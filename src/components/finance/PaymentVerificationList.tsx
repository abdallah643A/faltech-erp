import { useState } from 'react';
import { format } from 'date-fns';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileText,
  DollarSign,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePaymentVerifications, PaymentVerification } from '@/hooks/useFinance';

interface PaymentVerificationListProps {
  searchQuery?: string;
}

export function PaymentVerificationList({ searchQuery = '' }: PaymentVerificationListProps) {
  const { 
    pendingVerifications, 
    verifiedPayments, 
    isLoading, 
    verifyPayment,
    rejectPayment,
    uploadConfirmation 
  } = usePaymentVerifications();

  const [selectedVerification, setSelectedVerification] = useState<PaymentVerification | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    verified_amount: 0,
    payment_date: '',
    payment_reference: '',
    payment_method: '',
    bank_name: '',
    notes: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  const handleVerify = () => {
    if (selectedVerification) {
      verifyPayment.mutate({
        id: selectedVerification.id,
        ...verifyForm,
      }, {
        onSuccess: () => {
          setVerifyDialogOpen(false);
          setSelectedVerification(null);
          setVerifyForm({
            verified_amount: 0,
            payment_date: '',
            payment_reference: '',
            payment_method: '',
            bank_name: '',
            notes: '',
          });
        }
      });
    }
  };

  const handleReject = () => {
    if (selectedVerification && rejectReason) {
      rejectPayment.mutate({
        id: selectedVerification.id,
        reason: rejectReason,
      }, {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setSelectedVerification(null);
          setRejectReason('');
        }
      });
    }
  };

  const handleFileUpload = (verification: PaymentVerification, file: File) => {
    uploadConfirmation.mutate({ id: verification.id, file });
  };

  const openVerifyDialog = (verification: PaymentVerification) => {
    setSelectedVerification(verification);
    setVerifyForm({
      verified_amount: verification.expected_amount || 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: '',
      payment_method: '',
      bank_name: '',
      notes: '',
    });
    setVerifyDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified': return <Badge className="bg-green-500">Verified</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredPending = pendingVerifications.filter(v =>
    !searchQuery ||
    v.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.sales_order?.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.payment_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVerified = verifiedPayments.filter(v =>
    !searchQuery ||
    v.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading verifications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Verifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Payment Verifications ({filteredPending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending verifications</p>
          ) : (
            <div className="space-y-4">
              {filteredPending.map((verification) => (
                <div
                  key={verification.id}
                  className="p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium capitalize">
                            {verification.payment_type?.replace('_', ' ')} - Term #{verification.payment_term_number}
                          </h4>
                          {getStatusBadge(verification.verification_status)}
                        </div>
                        {verification.sales_order && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {verification.sales_order.contract_number || `SO-${verification.sales_order.doc_num}`} • {verification.sales_order.customer_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Expected:</span>{' '}
                            <span className="font-medium">SAR {verification.expected_amount?.toLocaleString()}</span>
                          </div>
                        </div>
                        {verification.confirmation_document_url && (
                          <a
                            href={verification.confirmation_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 mt-2"
                          >
                            <FileText className="h-3 w-3" />
                            View Confirmation Document
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openVerifyDialog(verification)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedVerification(verification);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(verification, e.target.files[0]);
                            }
                          }}
                        />
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Doc
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified Payments */}
      {filteredVerified.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Verified Payments ({filteredVerified.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredVerified.map((verification) => (
                <div
                  key={verification.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-medium text-sm capitalize">
                        {verification.payment_type?.replace('_', ' ')} - SAR {verification.verified_amount?.toLocaleString()}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {verification.sales_order?.customer_name} • {verification.payment_reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500">Verified</Badge>
                    {verification.verified_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(verification.verified_at), 'PP')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Verified Amount (SAR)</Label>
                <Input
                  type="number"
                  value={verifyForm.verified_amount}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verified_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={verifyForm.payment_date}
                  onChange={(e) => setVerifyForm({ ...verifyForm, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={verifyForm.payment_method}
                onValueChange={(value) => setVerifyForm({ ...verifyForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input
                value={verifyForm.payment_reference}
                onChange={(e) => setVerifyForm({ ...verifyForm, payment_reference: e.target.value })}
                placeholder="Transaction ID, Check Number, etc."
              />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input
                value={verifyForm.bank_name}
                onChange={(e) => setVerifyForm({ ...verifyForm, bank_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={verifyForm.notes}
                onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerify} disabled={verifyPayment.isPending}>
              {verifyPayment.isPending ? 'Verifying...' : 'Verify Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
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
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || rejectPayment.isPending}>
              {rejectPayment.isPending ? 'Rejecting...' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
