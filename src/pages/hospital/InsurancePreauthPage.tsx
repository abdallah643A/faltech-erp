import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShieldCheck } from 'lucide-react';
import { useInsurancePreauth, usePatients } from '@/hooks/useHISEnhanced';

export default function InsurancePreauthPage() {
  const { data: preauths = [], upsert } = useInsurancePreauth();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ status: 'draft', validity_days: 30 });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA').format(Number(v) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Insurance Preauthorization (NPHIES)</h1>
          <p className="text-muted-foreground">CCHI-aligned eligibility & preauth workflow</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Preauth</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Preauth #</TableHead><TableHead>Patient</TableHead><TableHead>Payer</TableHead>
            <TableHead>Service</TableHead><TableHead className="text-right">Estimated</TableHead>
            <TableHead className="text-right">Approved</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {preauths.map((pa: any) => {
              const p = patients.find((x: any) => x.id === pa.patient_id);
              return (
                <TableRow key={pa.id}>
                  <TableCell className="font-mono text-xs">{pa.preauth_number || '—'}</TableCell>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name} ${p.last_name}` : '—'}</TableCell>
                  <TableCell>{pa.payer_name}</TableCell>
                  <TableCell className="text-xs">{pa.service_type || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(pa.estimated_amount)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(pa.approved_amount)}</TableCell>
                  <TableCell><Badge variant={pa.status === 'approved' ? 'default' : pa.status === 'rejected' ? 'destructive' : 'secondary'}>{pa.status}</Badge></TableCell>
                  <TableCell className="text-xs">{pa.expires_at ? new Date(pa.expires_at).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              );
            })}
            {preauths.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No preauthorizations</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Preauthorization</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => {
                const p = patients.find((x: any) => x.id === v);
                setDraft({ ...draft, patient_id: v, payer_name: p?.insurance_payer || draft.payer_name, policy_number: p?.insurance_policy_no || draft.policy_number });
              }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payer Name</Label><Input value={draft.payer_name || ''} onChange={(e) => setDraft({ ...draft, payer_name: e.target.value })} placeholder="Bupa, Tawuniya…" /></div>
            <div><Label>Policy Number</Label><Input value={draft.policy_number || ''} onChange={(e) => setDraft({ ...draft, policy_number: e.target.value })} /></div>
            <div><Label>Service Type</Label><Input value={draft.service_type || ''} onChange={(e) => setDraft({ ...draft, service_type: e.target.value })} placeholder="MRI, Surgery, Admission…" /></div>
            <div><Label>Preauth Number</Label><Input value={draft.preauth_number || ''} onChange={(e) => setDraft({ ...draft, preauth_number: e.target.value })} /></div>
            <div><Label>Estimated Amount</Label><Input type="number" value={draft.estimated_amount || ''} onChange={(e) => setDraft({ ...draft, estimated_amount: Number(e.target.value) })} /></div>
            <div><Label>Approved Amount</Label><Input type="number" value={draft.approved_amount || ''} onChange={(e) => setDraft({ ...draft, approved_amount: Number(e.target.value) })} /></div>
            <div><Label>Copay</Label><Input type="number" value={draft.copay_amount || ''} onChange={(e) => setDraft({ ...draft, copay_amount: Number(e.target.value) })} /></div>
            <div><Label>Deductible</Label><Input type="number" value={draft.deductible || ''} onChange={(e) => setDraft({ ...draft, deductible: Number(e.target.value) })} /></div>
            <div><Label>NPHIES Request ID</Label><Input value={draft.nphies_request_id || ''} onChange={(e) => setDraft({ ...draft, nphies_request_id: e.target.value })} /></div>
            <div><Label>NPHIES Response ID</Label><Input value={draft.nphies_response_id || ''} onChange={(e) => setDraft({ ...draft, nphies_response_id: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['draft', 'submitted', 'pending', 'approved', 'partial', 'rejected', 'expired', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Validity (days)</Label><Input type="number" value={draft.validity_days} onChange={(e) => setDraft({ ...draft, validity_days: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ status: 'draft', validity_days: 30 }); }} disabled={!draft.patient_id || !draft.payer_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
