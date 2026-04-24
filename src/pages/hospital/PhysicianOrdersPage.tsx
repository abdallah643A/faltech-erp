import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Stethoscope } from 'lucide-react';
import { usePhysicianOrders, usePatients } from '@/hooks/useHISEnhanced';

export default function PhysicianOrdersPage() {
  const { data: orders = [], upsert } = usePhysicianOrders();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ order_type: 'lab', priority: 'routine', status: 'pending' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" />Physician Orders (CPOE)</h1>
          <p className="text-muted-foreground">Computerized Provider Order Entry — Lab, Radiology, Medication, Procedures</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Order</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead>
            <TableHead>Order</TableHead><TableHead>Priority</TableHead><TableHead>Codes</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map((o: any) => {
              const p = patients.find((x: any) => x.id === o.patient_id);
              return (
                <TableRow key={o.id}>
                  <TableCell className="text-xs">{new Date(o.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name} ${p.last_name}` : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{o.order_type}</Badge></TableCell>
                  <TableCell className="font-medium">{o.order_name}</TableCell>
                  <TableCell><Badge variant={o.priority === 'stat' ? 'destructive' : o.priority === 'urgent' ? 'default' : 'secondary'}>{o.priority}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{[o.loinc_code, o.cpt_code, o.icd10_code].filter(Boolean).join(' / ') || '—'}</TableCell>
                  <TableCell><Badge variant={o.status === 'completed' ? 'default' : o.status === 'cancelled' ? 'destructive' : 'secondary'}>{o.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No orders</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Physician Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => setDraft({ ...draft, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={draft.order_type} onValueChange={(v) => setDraft({ ...draft, order_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['lab', 'radiology', 'medication', 'procedure', 'diet', 'nursing', 'referral', 'consult', 'observation'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['stat', 'urgent', 'routine', 'timed'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Order Name</Label><Input value={draft.order_name || ''} onChange={(e) => setDraft({ ...draft, order_name: e.target.value })} placeholder="CBC, Chest X-Ray, Paracetamol 500mg…" /></div>
            <div><Label>LOINC</Label><Input value={draft.loinc_code || ''} onChange={(e) => setDraft({ ...draft, loinc_code: e.target.value })} /></div>
            <div><Label>CPT</Label><Input value={draft.cpt_code || ''} onChange={(e) => setDraft({ ...draft, cpt_code: e.target.value })} /></div>
            <div><Label>ICD-10</Label><Input value={draft.icd10_code || ''} onChange={(e) => setDraft({ ...draft, icd10_code: e.target.value })} /></div>
            <div><Label>Scheduled For</Label><Input type="datetime-local" value={draft.scheduled_for || ''} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} /></div>
            {draft.order_type === 'medication' && <>
              <div><Label>Dosage</Label><Input value={draft.dosage || ''} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} /></div>
              <div><Label>Frequency</Label><Input value={draft.frequency || ''} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="BID, TID, QID…" /></div>
              <div><Label>Route</Label><Input value={draft.route || ''} onChange={(e) => setDraft({ ...draft, route: e.target.value })} placeholder="PO, IV, IM…" /></div>
              <div><Label>Duration</Label><Input value={draft.duration || ''} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} /></div>
            </>}
            <div className="col-span-2"><Label>Clinical Indication</Label><Input value={draft.clinical_indication || ''} onChange={(e) => setDraft({ ...draft, clinical_indication: e.target.value })} /></div>
            <div className="col-span-2"><Label>Instructions</Label><Input value={draft.instructions || ''} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ order_type: 'lab', priority: 'routine', status: 'pending' }); }} disabled={!draft.patient_id || !draft.order_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
