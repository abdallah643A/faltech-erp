import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useHospAdmissions, useCreateAdmission, useHospEncounters, useHospBeds, useHospWards,
} from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Users, BedDouble, Plus, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function HospitalInpatient() {
  const navigate = useNavigate();
  const { data: admissions = [] } = useHospAdmissions('admitted');
  const { data: pendingEnc = [] } = useHospEncounters({ status: 'admitted' });
  const { data: wards = [] } = useHospWards();
  const { data: beds = [] } = useHospBeds();
  const createAdm = useCreateAdmission();

  const [open, setOpen] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ admission_type: 'planned', diagnosis: '', expected_discharge: '', current_ward_id: '', current_bed_id: '' });

  const availableBeds = beds.filter((b: any) => b.status === 'available' && (!form.current_ward_id || b.ward_id === form.current_ward_id));
  // encounters that are "admitted" but no admission record yet
  const needsAdmission = pendingEnc.filter((e: any) => !admissions.find((a: any) => a.encounter_id === e.id));

  return (
    <HospitalShell title="Inpatient / Ward" subtitle="Admissions, ward census, and progress tracking" icon={<Users className="h-5 w-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Currently Admitted</p><p className="text-2xl font-semibold">{admissions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting Admission</p><p className="text-2xl font-semibold text-amber-600">{needsAdmission.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available Beds</p><p className="text-2xl font-semibold text-emerald-600">{beds.filter((b: any) => b.status === 'available').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cleaning</p><p className="text-2xl font-semibold">{beds.filter((b: any) => b.status === 'cleaning').length}</p></CardContent></Card>
      </div>

      {needsAdmission.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Awaiting Admission</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Encounter</TableHead><TableHead>Patient</TableHead><TableHead>Source</TableHead><TableHead>Complaint</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {needsAdmission.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.encounter_no}</TableCell>
                    <TableCell>{e.patient?.first_name} {e.patient?.last_name}</TableCell>
                    <TableCell className="uppercase text-xs">{e.encounter_type}</TableCell>
                    <TableCell className="text-xs">{e.chief_complaint || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setOpen(e)}><Plus className="h-3 w-3 mr-1" />Admit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Active Admissions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Adm #</TableHead><TableHead>Patient</TableHead><TableHead>Ward / Bed</TableHead>
              <TableHead>Diagnosis</TableHead><TableHead>Doctor</TableHead><TableHead>LOS</TableHead><TableHead className="text-right">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {admissions.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.admission_no}</TableCell>
                  <TableCell>{a.patient?.first_name} {a.patient?.last_name}</TableCell>
                  <TableCell className="text-xs">{a.ward?.name || '—'} · {a.bed?.bed_no || '—'}</TableCell>
                  <TableCell className="text-xs">{a.diagnosis || '—'}</TableCell>
                  <TableCell className="text-xs">{a.admitting_doctor_name || '—'}</TableCell>
                  <TableCell className="text-xs">{a.admitted_at ? formatDistanceToNow(new Date(a.admitted_at)) : '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/hospital/patient-files/${a.patient_id}`)}>File</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/hospital/discharge')}>Discharge <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {admissions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No admissions</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Admission Dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admit Patient — {open?.patient?.first_name} {open?.patient?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.admission_type} onValueChange={(v) => setForm({ ...form, admission_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="day_care">Day Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div>
              <Label>Ward</Label>
              <Select value={form.current_ward_id} onValueChange={(v) => setForm({ ...form, current_ward_id: v, current_bed_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {wards.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bed (available only)</Label>
              <Select value={form.current_bed_id} onValueChange={(v) => setForm({ ...form, current_bed_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent>
                  {availableBeds.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.bed_no} ({b.ward?.name})</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{availableBeds.length} bed(s) available</p>
            </div>
            <div><Label>Expected Discharge</Label><Input type="date" value={form.expected_discharge} onChange={(e) => setForm({ ...form, expected_discharge: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={async () => {
              await createAdm.mutateAsync({
                encounter_id: open.id, patient_id: open.patient_id,
                admitted_at: new Date().toISOString(),
                status: 'admitted',
                ...form,
                current_ward_id: form.current_ward_id || null,
                current_bed_id: form.current_bed_id || null,
                expected_discharge: form.expected_discharge || null,
              });
              setOpen(null); setForm({ admission_type: 'planned', diagnosis: '', expected_discharge: '', current_ward_id: '', current_bed_id: '' });
            }}>Confirm Admission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
