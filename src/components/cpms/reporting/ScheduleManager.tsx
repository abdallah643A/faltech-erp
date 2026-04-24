import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Clock, Pause, Play, Trash2 } from 'lucide-react';
import type { ScheduledReport } from '@/hooks/useCPMSReporting';

interface Props {
  projects: any[];
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily', cron: '0 8 * * *' },
  { value: 'weekly', label: 'Weekly', cron: '0 8 * * 1' },
  { value: 'monthly', label: 'Monthly', cron: '0 8 1 * *' },
  { value: 'custom', label: 'Custom', cron: '' },
];

const TIMEZONES = ['Asia/Riyadh', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'];

export default function ScheduleManager({ projects, reporting }: Props) {
  const schedules = reporting.schedules.data || [];
  const templates = reporting.templates.data || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', schedule_type: 'weekly', frequency: '0 8 * * 1', timezone: 'Asia/Riyadh',
    report_type: 'summary', export_format: 'pdf', project_id: '',
    template_id: '', recipients: '', conditional_only: false,
  });

  const handleCreate = async () => {
    if (!form.title) return;
    const recipients = form.recipients.split(',').map(r => r.trim()).filter(Boolean);
    await reporting.createSchedule.mutateAsync({
      title: form.title,
      schedule_type: form.schedule_type,
      frequency: form.frequency,
      timezone: form.timezone,
      report_type: form.report_type,
      export_format: form.export_format,
      project_id: form.project_id || null,
      template_id: form.template_id || null,
      recipients,
      conditional_only: form.conditional_only,
      next_run: new Date(Date.now() + 86400000).toISOString(),
    });
    setShowForm(false);
  };

  const toggleActive = async (s: ScheduledReport) => {
    await reporting.updateSchedule.mutateAsync({ id: s.id, is_active: !s.is_active });
    toast({ title: s.is_active ? 'Schedule paused' : 'Schedule resumed' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    await reporting.deleteSchedule.mutateAsync(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Scheduled Reports</h3>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Schedule</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Last Status</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No schedules configured</TableCell></TableRow>
              ) : schedules.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.report_type}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs uppercase">{s.export_format}</Badge></TableCell>
                  <TableCell className="text-xs">{s.schedule_type}</TableCell>
                  <TableCell className="text-xs">{s.next_run ? format(new Date(s.next_run), 'dd MMM HH:mm') : '-'}</TableCell>
                  <TableCell>
                    {s.last_status ? (
                      <Badge variant={s.last_status === 'success' ? 'default' : 'destructive'} className="text-xs">{s.last_status}</Badge>
                    ) : <span className="text-xs text-muted-foreground">Never</span>}
                  </TableCell>
                  <TableCell className="text-xs">{s.run_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(s)} title={s.is_active ? 'Pause' : 'Resume'}>
                        {s.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Scheduled Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Weekly Measurement Summary" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule Type</Label>
                <Select value={form.schedule_type} onValueChange={v => {
                  const preset = SCHEDULE_TYPES.find(s => s.value === v);
                  setForm(f => ({ ...f, schedule_type: v, frequency: preset?.cron || f.frequency }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCHEDULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Timezone</Label>
                <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.schedule_type === 'custom' && (
              <div><Label>Cron Expression</Label><Input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="0 8 * * 1" /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Report Type</Label>
                <Select value={form.report_type} onValueChange={v => setForm(f => ({ ...f, report_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="comparative">Comparative</SelectItem>
                    <SelectItem value="trend">Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Export Format</Label>
                <Select value={form.export_format} onValueChange={v => setForm(f => ({ ...f, export_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Project (optional)</Label>
              <Select value={form.project_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, project_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {templates.length > 0 && (
              <div>
                <Label>Template (optional)</Label>
                <Select value={form.template_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, template_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default</SelectItem>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Recipients (comma-separated emails)</Label><Input value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} placeholder="user@example.com, team@example.com" /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.conditional_only} onCheckedChange={v => setForm(f => ({ ...f, conditional_only: !!v }))} />
              Only run when new measurements exist
            </label>
            <Button onClick={handleCreate} className="w-full" disabled={reporting.createSchedule.isPending}>Create Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
