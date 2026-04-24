import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertTriangle } from 'lucide-react';
import { useScheduleRuns, useScheduledOperations } from '@/hooks/useMfgScheduling';
import { format } from 'date-fns';

export default function CapacityPlanning() {
  const { runs, isLoading, runSchedule } = useScheduleRuns();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: ops } = useScheduledOperations(selected || undefined);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ horizon_start: today, horizon_end: in30, strategy: 'forward' as 'forward' | 'backward', notes: '' });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finite Capacity Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate capacity-aware production schedules and identify bottleneck work centers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Play className="w-4 h-4 mr-1" />Run Scheduler</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Run Finite Capacity Scheduler</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Horizon Start</Label><Input type="date" value={form.horizon_start} onChange={e => setForm({ ...form, horizon_start: e.target.value })} /></div>
              <div><Label>Horizon End</Label><Input type="date" value={form.horizon_end} onChange={e => setForm({ ...form, horizon_end: e.target.value })} /></div>
              <div><Label>Strategy</Label>
                <Select value={form.strategy} onValueChange={(v: any) => setForm({ ...form, strategy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forward">Forward (earliest start)</SelectItem>
                    <SelectItem value="backward">Backward (latest start)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={async () => { await runSchedule.mutateAsync(form); setOpen(false); }} disabled={runSchedule.isPending}>
                {runSchedule.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Schedule Runs ({runs?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
              : (runs?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No runs yet. Click Run Scheduler.</div>
              : (
                <Table>
                  <TableHeader><TableRow><TableHead>Run #</TableHead><TableHead>Horizon</TableHead><TableHead>Ops</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {runs!.map((r: any) => (
                      <TableRow key={r.id} className={`cursor-pointer ${selected === r.id ? 'bg-muted/60' : ''}`} onClick={() => setSelected(r.id)}>
                        <TableCell className="font-mono text-xs">{r.run_number}</TableCell>
                        <TableCell className="text-xs">{format(new Date(r.horizon_start), 'MMM d')} → {format(new Date(r.horizon_end), 'MMM d')}</TableCell>
                        <TableCell>{r.total_operations}</TableCell>
                        <TableCell>{Number(r.total_load_hours || 0).toFixed(1)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Scheduled Operations {selected ? `(${ops?.length ?? 0})` : ''}</CardTitle></CardHeader>
          <CardContent>
            {!selected ? <div className="py-8 text-center text-sm text-muted-foreground">Select a run to see scheduled operations.</div>
              : (ops?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No operations scheduled. Make sure work orders have routings.</div>
              : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>WO</TableHead><TableHead>Op</TableHead><TableHead>WC</TableHead><TableHead>Start</TableHead><TableHead>Hrs</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {ops!.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.wo_number}</TableCell>
                          <TableCell className="text-xs">{o.operation_seq} {o.operation_name}</TableCell>
                          <TableCell className="text-xs">{o.work_center_code} {o.is_bottleneck && <AlertTriangle className="w-3 h-3 inline text-destructive ml-1" />}</TableCell>
                          <TableCell className="text-xs">{format(new Date(o.scheduled_start), 'MMM d HH:mm')}</TableCell>
                          <TableCell>{Number(o.duration_hours).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
