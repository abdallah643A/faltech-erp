import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useHospPatients } from '@/hooks/useHospital';

const useAppointments = (date: string) =>
  useQuery({
    queryKey: ['hosp-appointments', date],
    queryFn: async () => {
      const sb: any = supabase;
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;
      const { data, error } = await sb.from('hosp_appointments')
        .select('*, patient:hosp_patients(id,mrn,first_name,last_name)')
        .gte('scheduled_at', start).lte('scheduled_at', end)
        .order('scheduled_at');
      if (error) throw error;
      return data || [];
    },
  });

export default function HospitalAppointments() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: appts = [], isLoading } = useAppointments(date);
  const { data: patients = [] } = useHospPatients(search);

  const create = useMutation({
    mutationFn: async (payload: any) => {
      const sb: any = supabase;
      const appointment_no = `APT-${Date.now().toString().slice(-8)}`;
      const { error } = await sb.from('hosp_appointments').insert({ ...payload, appointment_no, status: 'scheduled' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-appointments'] });
      toast.success('Appointment booked');
      setOpen(false); setForm({});
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const sb: any = supabase;
      const { error } = await sb.from('hosp_appointments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosp-appointments'] });
      toast.success('Updated');
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, any[]> = {};
    appts.forEach((a: any) => {
      const hr = new Date(a.scheduled_at).getHours().toString().padStart(2, '0') + ':00';
      (out[hr] = out[hr] || []).push(a);
    });
    return out;
  }, [appts]);

  return (
    <HospitalShell
      title="Appointments"
      subtitle="Outpatient scheduling & no-show tracking"
      icon={<CalendarIcon className="h-5 w-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 w-[160px]" />
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Book</Button>
        </div>
      }
    >
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && appts.length === 0 && <div className="text-sm text-muted-foreground p-8 text-center border rounded-md">No appointments for this day</div>}

      <div className="space-y-3">
        {Object.entries(grouped).map(([hr, list]) => (
          <div key={hr} className="grid grid-cols-[80px_1fr] gap-3">
            <div className="text-sm font-medium text-muted-foreground pt-3"><Clock className="h-3.5 w-3.5 inline mr-1" />{hr}</div>
            <div className="space-y-2">
              {list.map((a: any) => (
                <Card key={a.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm">{a.patient?.first_name} {a.patient?.last_name} <span className="text-xs text-muted-foreground">({a.patient?.mrn})</span></div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {a.duration_minutes && ` • ${a.duration_minutes} min`}
                      {a.department && ` • ${a.department}`}
                      {a.doctor_name && ` • Dr. ${a.doctor_name}`}
                    </div>
                    {a.reason && <div className="text-xs mt-1">{a.reason}</div>}
                  </div>
                  <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                  {a.status === 'scheduled' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => update.mutate({ id: a.id, status: 'arrived' })}>Arrived</Button>
                      <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: a.id, status: 'no_show' })}>No-show</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient (search)</Label>
              <Input placeholder="Search by name or MRN" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Pick patient" /></SelectTrigger>
                <SelectContent>
                  {patients.slice(0, 20).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Scheduled At</Label><Input type="datetime-local" value={form.scheduled_at || ''} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes || ''} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} /></div>
              <div><Label>Department</Label><Input value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>Doctor</Label><Input value={form.doctor_name || ''} onChange={e => setForm({ ...form, doctor_name: e.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ ...form, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : new Date().toISOString() })} disabled={!form.patient_id || create.isPending}>Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
