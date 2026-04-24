import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Receipt } from 'lucide-react';
import { useMedicalBills, usePatients } from '@/hooks/useHISEnhanced';

export default function MedicalBillingPage() {
  const { data: bills = [], upsert } = useMedicalBills();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ bill_type: 'opd', status: 'draft', gross_amount: 0, vat_amount: 0, discount_amount: 0, paid_amount: 0 });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(Number(v) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" />Medical Billing</h1>
          <p className="text-muted-foreground">ZATCA-aligned hospital billing with finance integration</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Bill</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Bill #</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead>
            <TableHead>Type</TableHead><TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Net</TableHead><TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead><TableHead>Posted</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {bills.map((b: any) => {
              const p = patients.find((x: any) => x.id === b.patient_id);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.bill_number}</TableCell>
                  <TableCell className="text-xs">{b.bill_date}</TableCell>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name} ${p.last_name}` : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{b.bill_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmt(b.gross_amount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(b.net_amount)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(b.balance_amount)}</TableCell>
                  <TableCell><Badge variant={b.status === 'paid' ? 'default' : b.status === 'rejected' ? 'destructive' : 'secondary'}>{b.status}</Badge></TableCell>
                  <TableCell>{b.posted_to_finance ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                </TableRow>
              );
            })}
            {bills.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No bills</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Medical Bill</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Bill Number</Label><Input value={draft.bill_number || ''} onChange={(e) => setDraft({ ...draft, bill_number: e.target.value })} /></div>
            <div><Label>Bill Date</Label><Input type="date" value={draft.bill_date || ''} onChange={(e) => setDraft({ ...draft, bill_date: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => setDraft({ ...draft, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={draft.bill_type} onValueChange={(v) => setDraft({ ...draft, bill_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['opd', 'ipd', 'er', 'pharmacy', 'lab', 'radiology', 'package'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['draft', 'finalized', 'submitted_to_payer', 'paid', 'partial', 'rejected', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Gross</Label><Input type="number" value={draft.gross_amount} onChange={(e) => setDraft({ ...draft, gross_amount: Number(e.target.value) })} /></div>
            <div><Label>Discount</Label><Input type="number" value={draft.discount_amount} onChange={(e) => setDraft({ ...draft, discount_amount: Number(e.target.value) })} /></div>
            <div><Label>VAT (15%)</Label><Input type="number" value={draft.vat_amount} onChange={(e) => setDraft({ ...draft, vat_amount: Number(e.target.value) })} /></div>
            <div><Label>Insurance Amount</Label><Input type="number" value={draft.insurance_amount || 0} onChange={(e) => setDraft({ ...draft, insurance_amount: Number(e.target.value) })} /></div>
            <div><Label>Patient Amount</Label><Input type="number" value={draft.patient_amount || 0} onChange={(e) => setDraft({ ...draft, patient_amount: Number(e.target.value) })} /></div>
            <div><Label>Paid</Label><Input type="number" value={draft.paid_amount} onChange={(e) => setDraft({ ...draft, paid_amount: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.patient_id || !draft.bill_number}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
