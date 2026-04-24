import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Activity } from 'lucide-react';
import { useTriageAssessments, usePatients } from '@/hooks/useHISEnhanced';

const ESI_COLORS: Record<number, string> = { 1: 'destructive', 2: 'destructive', 3: 'default', 4: 'secondary', 5: 'outline' };
const ESI_LABEL: Record<number, string> = { 1: 'Resuscitation', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-Urgent' };

export default function TriageAssessmentPage() {
  const { data: triages = [], upsert } = useTriageAssessments();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ visit_type: 'er', esi_level: 3, status: 'waiting' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Triage & Vitals (ESI 1–5)</h1>
          <p className="text-muted-foreground">MOH-aligned ER & OPD triage with auto-BMI</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Triage</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(lvl => (
          <Card key={lvl}><CardContent className="pt-6">
            <Badge variant={ESI_COLORS[lvl] as any}>ESI {lvl}</Badge>
            <div className="text-2xl font-bold mt-2">{triages.filter((t: any) => t.esi_level === lvl).length}</div>
            <div className="text-xs text-muted-foreground">{ESI_LABEL[lvl]}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Arrival</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>ESI</TableHead>
            <TableHead>Vitals (T/HR/BP/SpO₂)</TableHead><TableHead>Pain</TableHead><TableHead>BMI</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {triages.map((t: any) => {
              const p = patients.find((x: any) => x.id === t.patient_id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{new Date(t.arrival_time).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name} ${p.last_name}` : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{t.visit_type}</Badge></TableCell>
                  <TableCell><Badge variant={ESI_COLORS[t.esi_level] as any}>ESI {t.esi_level}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{t.temperature_c}°/{t.pulse_bpm}/{t.systolic_bp}/{t.diastolic_bp}/{t.spo2}%</TableCell>
                  <TableCell>{t.pain_score ?? '—'}</TableCell>
                  <TableCell className="text-xs">{t.bmi || '—'}</TableCell>
                  <TableCell><Badge variant={t.status === 'completed' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {triages.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No triage records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Triage Assessment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => setDraft({ ...draft, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visit Type</Label>
              <Select value={draft.visit_type} onValueChange={(v) => setDraft({ ...draft, visit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['er', 'opd', 'walk_in'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ESI Level</Label>
              <Select value={String(draft.esi_level)} onValueChange={(v) => setDraft({ ...draft, esi_level: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} – {ESI_LABEL[n]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Chief Complaint</Label><Input value={draft.chief_complaint || ''} onChange={(e) => setDraft({ ...draft, chief_complaint: e.target.value })} /></div>
            <div><Label>Temp (°C)</Label><Input type="number" step="0.1" value={draft.temperature_c || ''} onChange={(e) => setDraft({ ...draft, temperature_c: Number(e.target.value) })} /></div>
            <div><Label>Pulse (bpm)</Label><Input type="number" value={draft.pulse_bpm || ''} onChange={(e) => setDraft({ ...draft, pulse_bpm: Number(e.target.value) })} /></div>
            <div><Label>Systolic BP</Label><Input type="number" value={draft.systolic_bp || ''} onChange={(e) => setDraft({ ...draft, systolic_bp: Number(e.target.value) })} /></div>
            <div><Label>Diastolic BP</Label><Input type="number" value={draft.diastolic_bp || ''} onChange={(e) => setDraft({ ...draft, diastolic_bp: Number(e.target.value) })} /></div>
            <div><Label>RR</Label><Input type="number" value={draft.respiratory_rate || ''} onChange={(e) => setDraft({ ...draft, respiratory_rate: Number(e.target.value) })} /></div>
            <div><Label>SpO₂ (%)</Label><Input type="number" value={draft.spo2 || ''} onChange={(e) => setDraft({ ...draft, spo2: Number(e.target.value) })} /></div>
            <div><Label>Pain (0–10)</Label><Input type="number" min={0} max={10} value={draft.pain_score || ''} onChange={(e) => setDraft({ ...draft, pain_score: Number(e.target.value) })} /></div>
            <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={draft.weight_kg || ''} onChange={(e) => setDraft({ ...draft, weight_kg: Number(e.target.value) })} /></div>
            <div><Label>Height (cm)</Label><Input type="number" step="0.1" value={draft.height_cm || ''} onChange={(e) => setDraft({ ...draft, height_cm: Number(e.target.value) })} /></div>
            <div><Label>Glucose</Label><Input type="number" step="0.1" value={draft.glucose || ''} onChange={(e) => setDraft({ ...draft, glucose: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ visit_type: 'er', esi_level: 3, status: 'waiting' }); }} disabled={!draft.patient_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
