import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalInvoices({ subcontractor }: Props) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    subcontract_order_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
    amount: '', description: '', remarks: ''
  });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const [invRes, ordersRes] = await Promise.all([
      supabase.from('cpms_subcontractor_invoices').select('*').eq('subcontractor_id', subcontractor.id).order('invoice_date', { ascending: false }) as any,
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id) as any,
    ]);
    setInvoices(invRes.data || []);
    setOrders(ordersRes.data || []);
  };

  const handleCreate = async () => {
    if (!form.subcontract_order_id || !form.invoice_number || !form.amount) {
      toast.error('Contract, invoice number, and amount are required');
      return;
    }
    const order = orders.find((o: any) => o.id === form.subcontract_order_id);
    const amount = parseFloat(form.amount);
    const retentionPct = order?.retention_pct || 5;
    const retentionHeld = amount * (retentionPct / 100);
    
    const { error } = await supabase.from('cpms_subcontractor_invoices').insert({
      subcontractor_id: subcontractor.id,
      subcontract_order_id: form.subcontract_order_id,
      project_id: order?.project_id,
      company_id: subcontractor.company_id,
      invoice_number: form.invoice_number,
      invoice_date: form.invoice_date,
      amount,
      retention_held: retentionHeld,
      amount_to_pay: amount - retentionHeld,
      description: form.description,
      remarks: form.remarks,
      status: 'submitted',
    } as any);
    if (error) { toast.error('Failed to submit invoice'); return; }
    toast.success('Invoice submitted');
    setCreateOpen(false);
    setForm({ subcontract_order_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], amount: '', description: '', remarks: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Invoices</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1"><Upload className="h-4 w-4" /> Submit Invoice</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices yet</TableCell></TableRow>
              ) : invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-sm">{inv.invoice_number}</TableCell>
                  <TableCell className="text-xs">{orders.find((o: any) => o.id === inv.subcontract_order_id)?.order_number || '—'}</TableCell>
                  <TableCell className="text-xs">{inv.invoice_date}</TableCell>
                  <TableCell className="text-right text-sm">{(inv.amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm">{(inv.retention_held || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{(inv.amount_to_pay || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={inv.status === 'paid' ? 'outline' : inv.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{inv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Invoice</DialogTitle>
            <DialogDescription>Upload an invoice against a subcontract order</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Contract *</Label>
              <Select value={form.subcontract_order_id} onValueChange={v => setForm(f => ({ ...f, subcontract_order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.order_number} — {(o.contract_value || 0).toLocaleString()} SAR</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Invoice Number *</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" /></div>
              <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-1"><Label>Remarks</Label><Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Submit Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}