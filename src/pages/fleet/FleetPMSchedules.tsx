import { useState } from 'react';
import { useFleetPMSchedules, useFleetPMMutations } from '@/hooks/useFleetEnhanced';
import { useFleetAssets } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarClock, Plus, AlertTriangle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function FleetPMSchedules() {
  const { data: schedules = [], isLoading } = useFleetPMSchedules();
  const { data: assets = [] } = useFleetAssets();
  const { upsert } = useFleetPMMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    asset_id: '', schedule_name: '', service_type: 'preventive',
    interval_km: 10000, interval_days: 180, reminder_threshold_km: 500, reminder_threshold_days: 7,
    auto_create_wo: true, is_active: true,
  });

  const dueStatus = (s: any) => {
    const days = s.next_due_date ? differenceInDays(new Date(s.next_due_date), new Date()) : null;
    if (days != null && days < 0) return { label: 'Overdue', variant: 'destructive' as const };
    if (days != null && days <= (s.reminder_threshold_days || 7)) return { label: `Due in ${days}d`, variant: 'default' as const };
    return { label: 'OK', variant: 'outline' as const };
  };

  const submit = async () => {
    if (!form.asset_id || !form.schedule_name) return;
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ ...form, asset_id: '', schedule_name: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" /> Preventive Maintenance Schedules
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Schedule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create PM Schedule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Vehicle</Label>
                <Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule Name</Label>
                <Input value={form.schedule_name} onChange={e => setForm({ ...form, schedule_name: e.target.value })} placeholder="e.g. Oil Change" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Interval (km)</Label>
                  <Input type="number" value={form.interval_km} onChange={e => setForm({ ...form, interval_km: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Interval (days)</Label>
                  <Input type="number" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Reminder km before</Label>
                  <Input type="number" value={form.reminder_threshold_km} onChange={e => setForm({ ...form, reminder_threshold_km: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Reminder days before</Label>
                  <Input type="number" value={form.reminder_threshold_days} onChange={e => setForm({ ...form, reminder_threshold_days: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.auto_create_wo} onCheckedChange={v => setForm({ ...form, auto_create_wo: v })} />
                <Label>Auto-create work order on due</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Active schedules — dual trigger (km OR time)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Schedule</TableHead><TableHead>Vehicle</TableHead><TableHead>Every</TableHead>
              <TableHead>Last Service</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
                schedules.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No schedules</TableCell></TableRow> :
                schedules.map((s: any) => {
                  const status = dueStatus(s);
                  const asset = assets.find((a: any) => a.id === s.asset_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-medium">{s.schedule_name}</TableCell>
                      <TableCell className="text-xs">{asset?.asset_name || '—'}</TableCell>
                      <TableCell className="text-xs">{s.interval_km || '—'} km / {s.interval_days || '—'}d</TableCell>
                      <TableCell className="text-xs">{s.last_service_date ? format(new Date(s.last_service_date), 'PP') : '—'}</TableCell>
                      <TableCell className="text-xs">{s.next_due_date ? format(new Date(s.next_due_date), 'PP') : '—'}{s.next_due_km ? ` / ${s.next_due_km}km` : ''}</TableCell>
                      <TableCell><Badge variant={status.variant} className="text-[10px]">{status.label === 'Overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}{status.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
