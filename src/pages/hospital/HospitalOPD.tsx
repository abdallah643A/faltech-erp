import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useHospEncounters, useUpdateEncounterStatus, useAddNote, useChargeItems, useAddCharge, useCreatePrescription,
} from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Stethoscope, FileText, Pill, Receipt, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function HospitalOPD() {
  const navigate = useNavigate();
  const { data: encounters = [] } = useHospEncounters({ type: 'opd' });
  const updateStatus = useUpdateEncounterStatus();
  const addNote = useAddNote();
  const addCharge = useAddCharge();
  const { data: chargeItems = [] } = useChargeItems();
  const createRx = useCreatePrescription();

  const [active, setActive] = useState<any | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ note_type: 'consultation', title: '', content: '' });
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeItemId, setChargeItemId] = useState('');
  const [rxOpen, setRxOpen] = useState(false);
  const [rxLines, setRxLines] = useState<any[]>([{ drug_name: '', dose: '', frequency: '', duration: '', quantity: 1 }]);

  const consult = (e: any) => {
    setActive(e);
    if (e.status === 'waiting' || e.status === 'registered') {
      updateStatus.mutate({ id: e.id, status: 'in_consultation', extra: { seen_time: new Date().toISOString() } });
    }
  };

  const queue = encounters.filter((e: any) => ['waiting', 'registered', 'in_consultation'].includes(e.status));

  return (
    <HospitalShell title="OPD / Outpatient" subtitle="Consultation queue and clinical workflow" icon={<Stethoscope className="h-5 w-5" />}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Queue ({queue.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {queue.length === 0 && <p className="text-sm text-muted-foreground">No patients in queue</p>}
            {queue.map((e: any) => (
              <div key={e.id} onClick={() => consult(e)}
                className={`border rounded p-2 cursor-pointer hover:bg-muted/50 ${active?.id === e.id ? 'bg-primary/5 border-primary' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{e.patient?.first_name} {e.patient?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{e.encounter_no} · {e.department || '—'}</p>
                  </div>
                  <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
                </div>
                {e.chief_complaint && <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{e.chief_complaint}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{active ? `Consultation — ${active.patient?.first_name} ${active.patient?.last_name}` : 'Select a patient'}</CardTitle>
            {active && <Button size="sm" variant="outline" onClick={() => navigate(`/hospital/patient-files/${active.patient_id}`)}>
              Patient File <ArrowRight className="h-3 w-3 ml-1" />
            </Button>}
          </CardHeader>
          <CardContent>
            {!active && <p className="text-sm text-muted-foreground">Pick a patient from the queue to start consultation.</p>}
            {active && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={statusColor(active.status)}>{active.status}</Badge>
                  <Badge variant="outline">{active.encounter_no}</Badge>
                  <Badge variant="outline">{active.department}</Badge>
                  <span className="text-xs text-muted-foreground">Arrived {active.arrival_time && format(new Date(active.arrival_time), 'p')}</span>
                </div>
                <p className="text-sm"><span className="text-muted-foreground">Chief Complaint:</span> {active.chief_complaint || '—'}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}><FileText className="h-3.5 w-3.5 mr-1" />Add Note</Button>
                  <Button variant="outline" size="sm" onClick={() => setRxOpen(true)}><Pill className="h-3.5 w-3.5 mr-1" />Prescribe</Button>
                  <Button variant="outline" size="sm" onClick={() => setChargeOpen(true)}><Receipt className="h-3.5 w-3.5 mr-1" />Add Charge</Button>
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: active.id, status: 'discharged', extra: { discharge_time: new Date().toISOString() } })}>
                    Complete Visit
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: active.id, status: 'admitted', extra: { is_admitted: true } })}>
                    → Admit to Inpatient
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: active.id, status: 'transfer_pending' })}>
                    → Transfer to ER
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clinical Note</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div>
              <Label>Type</Label>
              <Select value={noteForm.note_type} onValueChange={(v) => setNoteForm({ ...noteForm, note_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="examination">Examination</SelectItem>
                  <SelectItem value="progress">Progress Note</SelectItem>
                  <SelectItem value="plan">Treatment Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea rows={5} value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await addNote.mutateAsync({ ...noteForm, encounter_id: active.id, patient_id: active.patient_id, author_role: 'doctor' });
              setNoteForm({ note_type: 'consultation', title: '', content: '' });
              setNoteOpen(false);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div>
              <Label>Service</Label>
              <Select value={chargeItemId} onValueChange={setChargeItemId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {chargeItems.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — SAR {c.default_price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const ci: any = chargeItems.find((c: any) => c.id === chargeItemId);
              if (!ci) return;
              await addCharge.mutateAsync({
                encounter_id: active.id, patient_id: active.patient_id,
                charge_item_id: ci.id, charge_code: ci.code, description: ci.name,
                source_type: 'consultation', qty: 1, unit_price: ci.default_price,
              });
              setChargeOpen(false); setChargeItemId('');
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rx dialog */}
      <Dialog open={rxOpen} onOpenChange={setRxOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {rxLines.map((l, i) => (
              <div key={i} className="grid grid-cols-5 gap-2">
                <Input placeholder="Drug" value={l.drug_name} onChange={(e) => { const n = [...rxLines]; n[i].drug_name = e.target.value; setRxLines(n); }} />
                <Input placeholder="Dose" value={l.dose} onChange={(e) => { const n = [...rxLines]; n[i].dose = e.target.value; setRxLines(n); }} />
                <Input placeholder="Freq" value={l.frequency} onChange={(e) => { const n = [...rxLines]; n[i].frequency = e.target.value; setRxLines(n); }} />
                <Input placeholder="Duration" value={l.duration} onChange={(e) => { const n = [...rxLines]; n[i].duration = e.target.value; setRxLines(n); }} />
                <Input placeholder="Qty" type="number" value={l.quantity} onChange={(e) => { const n = [...rxLines]; n[i].quantity = +e.target.value; setRxLines(n); }} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRxLines([...rxLines, { drug_name: '', dose: '', frequency: '', duration: '', quantity: 1 }])}>+ Add Line</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRxOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await createRx.mutateAsync({
                order: { encounter_id: active.id, patient_id: active.patient_id, prescribed_at: new Date().toISOString(), status: 'ordered' },
                lines: rxLines.filter(l => l.drug_name).map(l => ({ ...l, status: 'pending' })),
              });
              setRxOpen(false);
              setRxLines([{ drug_name: '', dose: '', frequency: '', duration: '', quantity: 1 }]);
            }}>Send to Pharmacy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
