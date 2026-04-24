import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, LogOut } from 'lucide-react';
import { useDischargePlans, usePatients } from '@/hooks/useHISEnhanced';

export default function DischargePlanningPage() {
  const { data: plans = [], upsert } = useDischargePlans();
  const { data: patients = [] } = usePatients();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ status: 'planning', discharge_disposition: 'home' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LogOut className="h-6 w-6 text-primary" />Discharge Planning</h1>
          <p className="text-muted-foreground">Multidisciplinary discharge with bilingual instructions</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Discharge Plan</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Patient</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead>
            <TableHead>Disposition</TableHead><TableHead>Diagnosis</TableHead>
            <TableHead>Follow-up</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {plans.map((d: any) => {
              const p = patients.find((x: any) => x.id === d.patient_id);
              return (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{p ? `${p.mrn} — ${p.first_name} ${p.last_name}` : '—'}</TableCell>
                  <TableCell className="text-xs">{d.planned_discharge_date || '—'}</TableCell>
                  <TableCell className="text-xs">{d.actual_discharge_date || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{d.discharge_disposition}</Badge></TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{d.diagnosis_primary || '—'}</TableCell>
                  <TableCell className="text-xs">{d.follow_up_date || '—'}</TableCell>
                  <TableCell><Badge variant={d.status === 'discharged' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {plans.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No discharge plans</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Discharge Plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Patient</Label>
              <Select value={draft.patient_id || ''} onValueChange={(v) => setDraft({ ...draft, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{patients.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.mrn} — {p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Planned Date</Label><Input type="date" value={draft.planned_discharge_date || ''} onChange={(e) => setDraft({ ...draft, planned_discharge_date: e.target.value })} /></div>
            <div><Label>Actual Date</Label><Input type="date" value={draft.actual_discharge_date || ''} onChange={(e) => setDraft({ ...draft, actual_discharge_date: e.target.value })} /></div>
            <div>
              <Label>Disposition</Label>
              <Select value={draft.discharge_disposition} onValueChange={(v) => setDraft({ ...draft, discharge_disposition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['home', 'transfer_hospital', 'rehab', 'ltc', 'dama', 'expired', 'absconded'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['planning', 'ready', 'discharged', 'cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Primary Diagnosis</Label><Input value={draft.diagnosis_primary || ''} onChange={(e) => setDraft({ ...draft, diagnosis_primary: e.target.value })} /></div>
            <div className="col-span-2"><Label>Discharge Summary</Label><Textarea rows={3} value={draft.discharge_summary || ''} onChange={(e) => setDraft({ ...draft, discharge_summary: e.target.value })} /></div>
            <div className="col-span-2"><Label>Follow-up Instructions (EN)</Label><Textarea rows={2} value={draft.follow_up_instructions || ''} onChange={(e) => setDraft({ ...draft, follow_up_instructions: e.target.value })} /></div>
            <div className="col-span-2"><Label dir="rtl">تعليمات المتابعة</Label><Textarea dir="rtl" rows={2} value={draft.follow_up_instructions_ar || ''} onChange={(e) => setDraft({ ...draft, follow_up_instructions_ar: e.target.value })} /></div>
            <div><Label>Follow-up Date</Label><Input type="date" value={draft.follow_up_date || ''} onChange={(e) => setDraft({ ...draft, follow_up_date: e.target.value })} /></div>
            <div><Label>Follow-up Clinic</Label><Input value={draft.follow_up_clinic || ''} onChange={(e) => setDraft({ ...draft, follow_up_clinic: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={draft.patient_education_provided || false} onCheckedChange={(v) => setDraft({ ...draft, patient_education_provided: v })} /><Label>Patient Education</Label></div>
            <div className="flex items-center gap-2"><Switch checked={draft.transportation_arranged || false} onCheckedChange={(v) => setDraft({ ...draft, transportation_arranged: v })} /><Label>Transport Arranged</Label></div>
            <div className="flex items-center gap-2"><Switch checked={draft.home_care_required || false} onCheckedChange={(v) => setDraft({ ...draft, home_care_required: v })} /><Label>Home Care</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ status: 'planning', discharge_disposition: 'home' }); }} disabled={!draft.patient_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
