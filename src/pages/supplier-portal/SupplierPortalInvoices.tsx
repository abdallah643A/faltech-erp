import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SupplierPortalInvoices({ account }: { account: any }) {
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({ invoice_number: '', invoice_date: '', due_date: '', po_number: '', total_amount: '', tax_amount: '' });

  const { data: invoices = [] } = useQuery({
    queryKey: ['sp-invoices-list', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_invoice_submissions' as any).select('*').eq('portal_account_id', account.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const submitInvoice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_invoice_submissions' as any).insert({
        portal_account_id: account.id, company_id: account.company_id, vendor_id: account.vendor_id,
        vendor_name: account.contact_name, invoice_number: form.invoice_number,
        invoice_date: form.invoice_date || new Date().toISOString().split('T')[0],
        due_date: form.due_date || null, po_number: form.po_number || null,
        total_amount: Number(form.total_amount) || 0, tax_amount: Number(form.tax_amount) || 0,
      });
      if (error) throw error;
      await supabase.from('supplier_portal_interactions' as any).insert({ portal_account_id: account.id, company_id: account.company_id, interaction_type: 'invoice_submit', entity_type: 'invoice', entity_reference: form.invoice_number });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sp-invoices-list'] }); setSubmitOpen(false); toast.success('Invoice submitted'); setForm({ invoice_number: '', invoice_date: '', due_date: '', po_number: '', total_amount: '', tax_amount: '' }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Invoices</h2>
        <Button onClick={() => setSubmitOpen(true)}><Plus className="h-4 w-4 mr-2" />Submit Invoice</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Invoice#</TableHead><TableHead>PO#</TableHead><TableHead>Amount</TableHead><TableHead>Tax</TableHead><TableHead>Matching</TableHead><TableHead>Approval</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices submitted</TableCell></TableRow> :
             invoices.map((inv: any) => (
               <TableRow key={inv.id}>
                 <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                 <TableCell className="font-mono text-sm">{inv.po_number || '-'}</TableCell>
                 <TableCell>{inv.total_amount?.toLocaleString()} {inv.currency}</TableCell>
                 <TableCell>{inv.tax_amount?.toLocaleString()}</TableCell>
                 <TableCell><Badge variant="outline">{inv.matching_status}</Badge></TableCell>
                 <TableCell><Badge variant="outline">{inv.approval_status}</Badge></TableCell>
                 <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
               </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Invoice Number</Label><Input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div><Label>PO Number (if applicable)</Label><Input value={form.po_number} onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Amount (SAR)</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
              <div><Label>Tax Amount</Label><Input type="number" value={form.tax_amount} onChange={e => setForm(p => ({ ...p, tax_amount: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button><Button onClick={() => submitInvoice.mutate()} disabled={!form.invoice_number || submitInvoice.isPending}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
