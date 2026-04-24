import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useHospDischarges, useHospAdmissions, useInitiateDischarge, useUpdateDischarge, useFinalizeDischarge,
} from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { ClipboardCheck, ArrowRight, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export default function HospitalDischarge() {
  const navigate = useNavigate();
  const { data: pending = [] } = useHospDischarges('in_progress');
  const { data: completed = [] } = useHospDischarges('completed');
  const { data: admissions = [] } = useHospAdmissions('admitted');
  const initiate = useInitiateDischarge();
  const update = useUpdateDischarge();
  const finalize = useFinalizeDischarge();

  const [open, setOpen] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ discharge_type: 'routine', discharge_summary: '', follow_up_date: '', takehome_meds: '' });

  const noDischarge = admissions.filter((a: any) => !pending.find((d: any) => d.encounter_id === a.encounter_id));

  const renderChecklist = (d: any) => {
    const allCleared = d.doctor_cleared && d.nursing_cleared && d.pharmacy_cleared && d.billing_cleared;
    const items = [
      { key: 'doctor_cleared', label: 'Doctor Clearance' },
      { key: 'nursing_cleared', label: 'Nursing Clearance' },
      { key: 'pharmacy_cleared', label: 'Pharmacy Clearance' },
      { key: 'billing_cleared', label: 'Billing Clearance' },
    ];
    return (
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between border rounded p-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={!!d[it.key]} onCheckedChange={(v) =>
                update.mutate({ id: d.id, patch: { [it.key]: !!v, [`${it.key.replace('_cleared', '_cleared_at')}`]: v ? new Date().toISOString() : null } })
              } />
              <span className="text-sm">{it.label}</span>
            </div>
            {d[it.key] ? <Badge variant="outline" className={statusColor('completed')}><Check className="h-3 w-3 mr-1" />Cleared</Badge>
              : <Badge variant="outline" className={statusColor('pending')}>Pending</Badge>}
          </div>
        ))}
        <Button className="w-full" disabled={!allCleared}
          onClick={async () => {
            const adm: any = admissions.find((a: any) => a.encounter_id === d.encounter_id);
            await finalize.mutateAsync({ dischargeId: d.id, encounterId: d.encounter_id, bedId: adm?.current_bed_id });
          }}>
          <Check className="h-4 w-4 mr-2" />Finalize Discharge
        </Button>
      </div>
    );
  };

  return (
    <HospitalShell title="Discharge Management" subtitle="Multi-step discharge workflow with clearances" icon={<ClipboardCheck className="h-5 w-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eligible to Discharge</p><p className="text-2xl font-semibold">{noDischarge.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-semibold text-amber-600">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-semibold text-emerald-600">{completed.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="initiate">
        <TabsList>
          <TabsTrigger value="initiate">Initiate ({noDischarge.length})</TabsTrigger>
          <TabsTrigger value="pending">In Progress ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="initiate">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Adm #</TableHead><TableHead>Patient</TableHead><TableHead>Ward / Bed</TableHead><TableHead>Diagnosis</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {noDischarge.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.admission_no}</TableCell>
                    <TableCell>{a.patient?.first_name} {a.patient?.last_name}</TableCell>
                    <TableCell className="text-xs">{a.ward?.name} · {a.bed?.bed_no}</TableCell>
                    <TableCell className="text-xs">{a.diagnosis || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setOpen(a)}>Initiate Discharge</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {noDischarge.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No admitted patients</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-3">
            {pending.map((d: any) => (
              <Card key={d.id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{d.discharge_no} — {d.patient?.first_name} {d.patient?.last_name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Initiated {d.initiated_at && format(new Date(d.initiated_at), 'PP p')} · {d.discharge_type}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/hospital/patient-files/${d.patient_id}`)}>File <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </CardHeader>
                <CardContent>{renderChecklist(d)}</CardContent>
              </Card>
            ))}
            {pending.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No discharges in progress</p>}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Discharge #</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Finalized</TableHead><TableHead>Follow-up</TableHead></TableRow></TableHeader>
              <TableBody>
                {completed.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.discharge_no}</TableCell>
                    <TableCell>{d.patient?.first_name} {d.patient?.last_name}</TableCell>
                    <TableCell className="capitalize">{d.discharge_type}</TableCell>
                    <TableCell>{d.finalized_at ? format(new Date(d.finalized_at), 'PP p') : '—'}</TableCell>
                    <TableCell>{d.follow_up_date || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Initiate dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Initiate Discharge — {open?.patient?.first_name} {open?.patient?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <select className="w-full border rounded h-9 px-2 bg-background" value={form.discharge_type} onChange={(e) => setForm({ ...form, discharge_type: e.target.value })}>
                <option value="routine">Routine</option>
                <option value="against_medical_advice">Against Medical Advice</option>
                <option value="transfer">Transfer to Other Facility</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
            <div><Label>Summary</Label><Textarea rows={4} value={form.discharge_summary} onChange={(e) => setForm({ ...form, discharge_summary: e.target.value })} /></div>
            <div><Label>Follow-up Date</Label><Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
            <div><Label>Take-home Meds</Label><Textarea rows={3} value={form.takehome_meds} onChange={(e) => setForm({ ...form, takehome_meds: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={async () => {
              await initiate.mutateAsync({
                encounter_id: open.encounter_id, admission_id: open.id, patient_id: open.patient_id,
                ...form,
                follow_up_date: form.follow_up_date || null,
              });
              setOpen(null); setForm({ discharge_type: 'routine', discharge_summary: '', follow_up_date: '', takehome_meds: '' });
            }}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
