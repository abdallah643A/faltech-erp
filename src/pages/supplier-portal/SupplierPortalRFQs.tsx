import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SupplierPortalRFQs({ account }: { account: any }) {
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({ rfq_number: '', total_amount: '', delivery_days: '', payment_terms: '', validity_days: '30', notes: '' });

  const { data: responses = [] } = useQuery({
    queryKey: ['sp-rfq-responses', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_rfq_responses' as any).select('*').eq('portal_account_id', account.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const submitQuote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_rfq_responses' as any).insert({
        portal_account_id: account.id,
        company_id: account.company_id,
        vendor_id: account.vendor_id,
        vendor_name: account.contact_name,
        rfq_number: form.rfq_number,
        total_amount: Number(form.total_amount) || 0,
        delivery_days: Number(form.delivery_days) || null,
        payment_terms: form.payment_terms,
        validity_days: Number(form.validity_days) || 30,
        notes: form.notes,
        status: 'submitted',
      });
      if (error) throw error;
      await supabase.from('supplier_portal_interactions' as any).insert({ portal_account_id: account.id, company_id: account.company_id, interaction_type: 'quote_submit', entity_type: 'rfq', entity_reference: form.rfq_number });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sp-rfq-responses'] }); setSubmitOpen(false); toast.success('Quotation submitted'); setForm({ rfq_number: '', total_amount: '', delivery_days: '', payment_terms: '', validity_days: '30', notes: '' }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">RFQs & Quotations</h2>
        <Button onClick={() => setSubmitOpen(true)}><Send className="h-4 w-4 mr-2" />Submit Quotation</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>RFQ#</TableHead><TableHead>Amount</TableHead><TableHead>Delivery</TableHead><TableHead>Validity</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {responses.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotations submitted</TableCell></TableRow> :
               responses.map((r: any) => (
                 <TableRow key={r.id}>
                   <TableCell className="font-mono">{r.rfq_number || '-'}</TableCell>
                   <TableCell>{r.total_amount?.toLocaleString()} {r.currency}</TableCell>
                   <TableCell>{r.delivery_days ? `${r.delivery_days} days` : '-'}</TableCell>
                   <TableCell>{r.validity_days} days</TableCell>
                   <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                   <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Quotation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>RFQ Number</Label><Input value={form.rfq_number} onChange={e => setForm(p => ({ ...p, rfq_number: e.target.value }))} /></div>
            <div><Label>Total Amount (SAR)</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Delivery (days)</Label><Input type="number" value={form.delivery_days} onChange={e => setForm(p => ({ ...p, delivery_days: e.target.value }))} /></div>
              <div><Label>Validity (days)</Label><Input type="number" value={form.validity_days} onChange={e => setForm(p => ({ ...p, validity_days: e.target.value }))} /></div>
            </div>
            <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button><Button onClick={() => submitQuote.mutate()} disabled={!form.rfq_number || submitQuote.isPending}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
