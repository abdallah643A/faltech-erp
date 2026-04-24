import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFieldVisits, useScheduleVisit, useTechnicians, useServiceTickets } from '@/hooks/useServiceITSM';
import { Calendar, MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function ITSMFieldServicePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: visits = [] } = useFieldVisits(date);
  const { data: techs = [] } = useTechnicians();
  const { data: tickets = [] } = useServiceTickets({});
  const schedule = useScheduleVisit();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: 'scheduled' });

  const grouped = techs.map((t: any) => ({
    tech: t,
    visits: visits.filter((v: any) => v.technician_id === t.id),
  }));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" />Field Service Schedule</h1>
          <p className="text-sm text-muted-foreground">{visits.length} visits on {date}</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Schedule Visit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Field Visit</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Ticket</Label>
                  <Select value={form.ticket_id || ''} onValueChange={(v) => setForm({ ...form, ticket_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select ticket" /></SelectTrigger>
                    <SelectContent>{tickets.filter((t: any) => t.ticket_type === 'field_service' || !['resolved', 'closed'].includes(t.status)).slice(0, 50).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.ticket_number} - {t.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Technician</Label>
                  <Select value={form.technician_id || ''} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                    <SelectContent>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.technician_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="datetime-local" value={form.scheduled_start || ''} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="datetime-local" value={form.scheduled_end || ''} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} /></div>
                </div>
                <div><Label>Zone</Label><Input value={form.zone || ''} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></div>
                <Button onClick={() => schedule.mutate(form, { onSuccess: () => { setOpen(false); setForm({ status: 'scheduled' }); } })} disabled={!form.ticket_id || !form.technician_id || !form.scheduled_start}>Schedule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {grouped.map(({ tech, visits: tv }) => (
          <Card key={tech.id}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{tech.technician_name}</span>
                <Badge variant="outline">{tv.length} visits</Badge>
              </CardTitle>
              {tech.zones?.length > 0 && <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline" /> {tech.zones.join(', ')}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tv.length === 0 && <p className="text-xs text-muted-foreground">No visits scheduled</p>}
                {tv.map((v: any) => (
                  <div key={v.id} className="border rounded p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{v.svc_tickets?.ticket_number}</span>
                      <Badge variant={v.status === 'completed' ? 'default' : 'outline'}>{v.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{v.svc_tickets?.title}</p>
                    <p className="text-xs">{format(new Date(v.scheduled_start), 'HH:mm')} - {format(new Date(v.scheduled_end), 'HH:mm')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">No technicians configured.</p>}
      </div>
    </div>
  );
}
