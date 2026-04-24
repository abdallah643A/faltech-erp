import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHospEncounters, useCreateTriage, useUpdateEncounterStatus } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function HospitalER() {
  const navigate = useNavigate();
  const { data: encounters = [] } = useHospEncounters({ type: 'er' });
  const createTriage = useCreateTriage();
  const updateStatus = useUpdateEncounterStatus();

  const [triageOpen, setTriageOpen] = useState<any | null>(null);
  const [tForm, setTForm] = useState<any>({ triage_level: 3, triage_category: 'urgent', pulse: '', bp_systolic: '', bp_diastolic: '', temperature: '', spo2: '', respiration: '', pain_score: '' });

  const active = encounters.filter((e: any) => !['discharged', 'cancelled'].includes(e.status));
  const sorted = [...active].sort((a: any, b: any) => {
    const order: Record<string, number> = { critical: 0, urgent: 1, standard: 2 };
    return (order[a.visit_priority] ?? 3) - (order[b.visit_priority] ?? 3);
  });

  return (
    <HospitalShell title="Emergency Room" subtitle="Triage queue and ER workflow" icon={<Activity className="h-5 w-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical</p><p className="text-2xl font-semibold text-destructive">{active.filter((e: any) => e.visit_priority === 'critical').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Urgent</p><p className="text-2xl font-semibold text-amber-600">{active.filter((e: any) => e.visit_priority === 'urgent').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Standard</p><p className="text-2xl font-semibold">{active.filter((e: any) => e.visit_priority === 'standard').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Active</p><p className="text-2xl font-semibold">{active.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">ER Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 && <p className="text-sm text-muted-foreground">No active ER cases</p>}
          {sorted.map((e: any) => (
            <div key={e.id} className={`border rounded p-3 ${e.visit_priority === 'critical' ? 'border-destructive bg-destructive/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {e.visit_priority === 'critical' && <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />}
                    <p className="font-medium">{e.patient?.first_name} {e.patient?.last_name}</p>
                    <Badge variant="outline" className={statusColor(e.visit_priority || e.status)}>{e.visit_priority || 'standard'}</Badge>
                    <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.encounter_no} · MRN {e.patient?.mrn} · {e.chief_complaint || 'No complaint recorded'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Wait: {e.arrival_time ? formatDistanceToNow(new Date(e.arrival_time), { addSuffix: false }) : '—'}
                    {e.triage_time && ` · Triaged ${format(new Date(e.triage_time), 'HH:mm')}`}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {!e.triage_time && <Button size="sm" onClick={() => setTriageOpen(e)}>Triage</Button>}
                  {e.triage_time && e.status === 'in_triage' && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: e.id, status: 'in_consultation', extra: { seen_time: new Date().toISOString() } })}>See Now</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate(`/hospital/patient-files/${e.patient_id}`)}>
                    File <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: e.id, status: 'admitted', extra: { is_admitted: true } })}>Admit</Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Triage Dialog */}
      <Dialog open={!!triageOpen} onOpenChange={(o) => !o && setTriageOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Triage — {triageOpen?.patient?.first_name} {triageOpen?.patient?.last_name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Triage Level (1-5, 1=most severe)</Label>
              <Select value={String(tForm.triage_level)} onValueChange={(v) => {
                const lvl = +v;
                setTForm({ ...tForm, triage_level: lvl, triage_category: lvl <= 2 ? 'critical' : lvl === 3 ? 'urgent' : 'standard' });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Resuscitation</SelectItem>
                  <SelectItem value="2">2 — Emergent</SelectItem>
                  <SelectItem value="3">3 — Urgent</SelectItem>
                  <SelectItem value="4">4 — Less Urgent</SelectItem>
                  <SelectItem value="5">5 — Non-Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Pulse (bpm)</Label><Input type="number" value={tForm.pulse} onChange={(e) => setTForm({ ...tForm, pulse: e.target.value })} /></div>
            <div><Label>BP Systolic</Label><Input type="number" value={tForm.bp_systolic} onChange={(e) => setTForm({ ...tForm, bp_systolic: e.target.value })} /></div>
            <div><Label>BP Diastolic</Label><Input type="number" value={tForm.bp_diastolic} onChange={(e) => setTForm({ ...tForm, bp_diastolic: e.target.value })} /></div>
            <div><Label>Temperature (°C)</Label><Input type="number" step="0.1" value={tForm.temperature} onChange={(e) => setTForm({ ...tForm, temperature: e.target.value })} /></div>
            <div><Label>SpO₂ (%)</Label><Input type="number" value={tForm.spo2} onChange={(e) => setTForm({ ...tForm, spo2: e.target.value })} /></div>
            <div><Label>Respiration</Label><Input type="number" value={tForm.respiration} onChange={(e) => setTForm({ ...tForm, respiration: e.target.value })} /></div>
            <div><Label>Pain Score (0-10)</Label><Input type="number" value={tForm.pain_score} onChange={(e) => setTForm({ ...tForm, pain_score: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriageOpen(null)}>Cancel</Button>
            <Button onClick={async () => {
              await createTriage.mutateAsync({
                encounter_id: triageOpen.id, patient_id: triageOpen.patient_id,
                ...tForm,
                pulse: tForm.pulse ? +tForm.pulse : null,
                bp_systolic: tForm.bp_systolic ? +tForm.bp_systolic : null,
                bp_diastolic: tForm.bp_diastolic ? +tForm.bp_diastolic : null,
                temperature: tForm.temperature ? +tForm.temperature : null,
                spo2: tForm.spo2 ? +tForm.spo2 : null,
                respiration: tForm.respiration ? +tForm.respiration : null,
                pain_score: tForm.pain_score ? +tForm.pain_score : null,
                triaged_at: new Date().toISOString(),
              });
              setTriageOpen(null);
            }}>Save Triage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
