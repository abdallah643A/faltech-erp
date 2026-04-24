import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Plus, Check } from 'lucide-react';
import { useDisputes } from '@/hooks/useQuoteToCash';

export default function DisputesManagementPage() {
  const { disputes, isLoading, stats, createDispute, resolveDispute } = useDisputes();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ dispute_number: '', invoice_number: '', customer_name: '', dispute_amount: 0, dispute_reason: '', dispute_category: 'price', status: 'open' });

  const handleCreate = async () => {
    await createDispute.mutateAsync({ ...form, customer_id: crypto.randomUUID() });
    setOpen(false);
    setForm({ dispute_number: '', invoice_number: '', customer_name: '', dispute_amount: 0, dispute_reason: '', dispute_category: 'price', status: 'open' });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertCircle className="h-6 w-6 text-primary" /> Invoice Disputes</h1>
          <p className="text-sm text-muted-foreground">Log, classify, and resolve customer disputes (blocks dunning while open)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Log Dispute</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Invoice Dispute</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Dispute Number</Label><Input value={form.dispute_number} onChange={(e) => setForm({ ...form, dispute_number: e.target.value })} /></div>
                <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
              </div>
              <div><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Dispute Amount</Label><Input type="number" value={form.dispute_amount} onChange={(e) => setForm({ ...form, dispute_amount: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Category</Label><Input value={form.dispute_category} onChange={(e) => setForm({ ...form, dispute_category: e.target.value })} /></div>
              </div>
              <div><Label>Reason</Label><Textarea value={form.dispute_reason} onChange={(e) => setForm({ ...form, dispute_reason: e.target.value })} /></div>
              <Button onClick={handleCreate} className="w-full">Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{stats.open}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-success">{stats.resolved}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Disputes ({disputes.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && disputes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No disputes</TableCell></TableRow>}
              {disputes.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.dispute_number}</TableCell>
                  <TableCell>{d.invoice_number || '—'}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{Number(d.dispute_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{d.dispute_category}</Badge></TableCell>
                  <TableCell><Badge variant={d.status === 'open' ? 'destructive' : 'default'}>{d.status}</Badge></TableCell>
                  <TableCell>
                    {d.status === 'open' && <Button size="sm" variant="ghost" onClick={() => resolveDispute.mutate({ id: d.id, resolution_type: 'approved', approved_amount: d.dispute_amount, notes: 'Approved' })}><Check className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
