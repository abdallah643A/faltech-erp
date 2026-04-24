import { useState } from 'react';
import { Scissors, Plus, Play, CheckCircle2, Clock } from 'lucide-react';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHospSurgeries, useCreateSurgery, useUpdateSurgery, useHospEncounters } from '@/hooks/useHospital';
import { EquipmentAvailabilityBanner } from '@/components/hospital/EquipmentAvailabilityBanner';
import { useNavigate } from 'react-router-dom';

export default function HospitalOR() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('scheduled');
  const [open, setOpen] = useState(false);
  const { data: surgeries = [], isLoading } = useHospSurgeries(tab);
  const { data: encounters = [] } = useHospEncounters({});
  const create = useCreateSurgery();
  const update = useUpdateSurgery();

  const [form, setForm] = useState<any>({});

  const submit = () => {
    if (!form.encounter_id || !form.procedure_name) return;
    const enc = encounters.find((e: any) => e.id === form.encounter_id);
    create.mutate({
      ...form,
      patient_id: enc?.patient?.id || enc?.patient_id,
    }, { onSuccess: () => { setOpen(false); setForm({}); } });
  };

  return (
    <HospitalShell
      title="Operating Theatre"
      subtitle="Surgical scheduling & OR workflow"
      icon={<Scissors className="h-5 w-5" />}
      actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Schedule Surgery</Button>}
    >
      <EquipmentAvailabilityBanner category="or" onManage={() => navigate('/hospital/equipment')} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scheduled"><Clock className="h-3.5 w-3.5 mr-1" /> Scheduled</TabsTrigger>
          <TabsTrigger value="in_progress"><Play className="h-3.5 w-3.5 mr-1" /> In Progress</TabsTrigger>
          <TabsTrigger value="completed"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && surgeries.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No surgeries</div>}
          {surgeries.map((s: any) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold">{s.procedure_name}</div>
                <div className="text-xs text-muted-foreground">{s.surgery_no} • {s.patient ? `${s.patient.first_name} ${s.patient.last_name} (${s.patient.mrn})` : '—'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Surgeon: {s.surgeon_name || '—'} • OR: {s.ot_room || '—'} • {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'TBD'}
                </div>
              </div>
              <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
              <div className="flex gap-2">
                {s.status === 'scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: s.id, status: 'in_progress', start_time: new Date().toISOString() })}>Start</Button>
                )}
                {s.status === 'in_progress' && (
                  <Button size="sm" onClick={() => update.mutate({ id: s.id, status: 'completed', end_time: new Date().toISOString() })}>Complete</Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Surgery</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Encounter</Label>
              <Select value={form.encounter_id} onValueChange={v => setForm({ ...form, encounter_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select encounter" /></SelectTrigger>
                <SelectContent>
                  {encounters.slice(0, 50).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.encounter_no} — {e.patient?.first_name} {e.patient?.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Procedure</Label>
              <Input value={form.procedure_name || ''} onChange={e => setForm({ ...form, procedure_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Surgeon</Label><Input value={form.surgeon_name || ''} onChange={e => setForm({ ...form, surgeon_name: e.target.value })} /></div>
              <div><Label>Anesthetist</Label><Input value={form.anesthetist_name || ''} onChange={e => setForm({ ...form, anesthetist_name: e.target.value })} /></div>
              <div><Label>OR Room</Label><Input value={form.ot_room || ''} onChange={e => setForm({ ...form, ot_room: e.target.value })} /></div>
              <div><Label>Scheduled At</Label><Input type="datetime-local" value={form.scheduled_at || ''} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
