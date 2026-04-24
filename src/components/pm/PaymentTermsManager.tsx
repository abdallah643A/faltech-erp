import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ProjectPaymentTerm, useProjectPaymentTerms } from '@/hooks/useIndustrialProjects';
import { Plus, Trash2, Edit, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentTermsManagerProps {
  projectId: string;
  contractValue: number;
}

export function PaymentTermsManager({ projectId, contractValue }: PaymentTermsManagerProps) {
  const { paymentTerms, isLoading, createPaymentTerm, updatePaymentTerm, deletePaymentTerm } = useProjectPaymentTerms(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ProjectPaymentTerm | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    percentage: 0,
    amount: 0,
    due_date: '',
  });

  const totalPercentage = paymentTerms?.reduce((sum, t) => sum + (t.percentage || 0), 0) || 0;
  const totalAmount = paymentTerms?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const handleOpenDialog = (term?: ProjectPaymentTerm) => {
    if (term) {
      setEditingTerm(term);
      setFormData({
        description: term.description,
        percentage: term.percentage,
        amount: term.amount,
        due_date: term.due_date || '',
      });
    } else {
      setEditingTerm(null);
      setFormData({
        description: '',
        percentage: 0,
        amount: 0,
        due_date: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handlePercentageChange = (value: number) => {
    const amount = (contractValue * value) / 100;
    setFormData(prev => ({
      ...prev,
      percentage: value,
      amount: Math.round(amount * 100) / 100,
    }));
  };

  const handleAmountChange = (value: number) => {
    const percentage = contractValue > 0 ? (value / contractValue) * 100 : 0;
    setFormData(prev => ({
      ...prev,
      amount: value,
      percentage: Math.round(percentage * 100) / 100,
    }));
  };

  const handleSubmit = () => {
    const nextNumber = (paymentTerms?.length || 0) + 1;
    
    if (editingTerm) {
      updatePaymentTerm.mutate({
        id: editingTerm.id,
        ...formData,
        due_date: formData.due_date || null,
      });
    } else {
      createPaymentTerm.mutate({
        project_id: projectId,
        payment_number: nextNumber,
        ...formData,
        due_date: formData.due_date || null,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment term?')) {
      deletePaymentTerm.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      invoiced: 'secondary',
      paid: 'default',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="text-xl font-bold">{contractValue.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Allocated</p>
              <p className="text-xl font-bold">{totalAmount.toLocaleString()} SAR</p>
              <p className="text-xs text-muted-foreground">{totalPercentage.toFixed(1)}% of contract</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold">{(contractValue - totalAmount).toLocaleString()} SAR</p>
              <p className="text-xs text-muted-foreground">{(100 - totalPercentage).toFixed(1)}% remaining</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Terms</CardTitle>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Term
          </Button>
        </CardHeader>
        <CardContent>
          {paymentTerms && paymentTerms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTerms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell>{term.payment_number}</TableCell>
                    <TableCell>{term.description}</TableCell>
                    <TableCell>{term.percentage}%</TableCell>
                    <TableCell>{term.amount.toLocaleString()} SAR</TableCell>
                    <TableCell>
                      {term.due_date ? format(new Date(term.due_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(term.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenDialog(term)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(term.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No payment terms defined. Add payment milestones to track project payments.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? 'Edit Payment Term' : 'Add Payment Term'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Advance Payment, Upon Delivery, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.percentage}
                  onChange={e => handlePercentageChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (SAR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.amount}
                  onChange={e => handleAmountChange(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.description}>
                {editingTerm ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
