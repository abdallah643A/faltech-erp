import { useState } from 'react';
import { useCapacitySnapshots } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus, AlertTriangle } from 'lucide-react';

export default function CapacityPlanningPage() {
  const { list, create } = useCapacitySnapshots();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    snapshot_date: new Date().toISOString().slice(0, 10),
    week_start: new Date().toISOString().slice(0, 10),
    department: '', skill_category: '', capacity_hours: 40, allocated_hours: 0,
  });

  const snaps = list.data ?? [];
  const overallocated = snaps.filter((s: any) => s.is_overallocated).length;
  const avgUtil = snaps.length > 0
    ? snaps.reduce((sum: number, s: any) => sum + Number(s.utilization_percent || 0), 0) / snaps.length
    : 0;

  return (
    <div className="p-4 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Resource Capacity Planning</h1>
          <p className="text-sm text-muted-foreground">Weekly capacity vs demand snapshots — detect over-allocation across teams and skills</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Snapshot</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Capacity Snapshot</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Snapshot Date</Label><Input type="date" value={form.snapshot_date} onChange={e => setForm({ ...form, snapshot_date: e.target.value })} /></div>
              <div><Label>Week Start</Label><Input type="date" value={form.week_start} onChange={e => setForm({ ...form, week_start: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>Skill Category</Label><Input value={form.skill_category} onChange={e => setForm({ ...form, skill_category: e.target.value })} /></div>
              <div><Label>Capacity (h)</Label><Input type="number" value={form.capacity_hours} onChange={e => setForm({ ...form, capacity_hours: +e.target.value })} /></div>
              <div><Label>Allocated (h)</Label><Input type="number" value={form.allocated_hours} onChange={e => setForm({ ...form, allocated_hours: +e.target.value })} /></div>
            </div>
            <Button onClick={() => create.mutate(form, { onSuccess: () => setOpen(false) })} disabled={create.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Snapshots</div><div className="text-2xl font-bold mt-1">{snaps.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg Utilization</div><div className="text-2xl font-bold mt-1">{avgUtil.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Over-allocated</span><AlertTriangle className="h-4 w-4 text-destructive" /></div><div className="text-2xl font-bold mt-1 text-destructive">{overallocated}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Capacity vs Demand</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {snaps.slice(0, 50).map((s: any) => (
              <div key={s.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.department || 'All'} · {s.skill_category || '—'}</span>
                    <Badge variant="outline" className="text-[10px]">Week of {s.week_start}</Badge>
                    {s.is_overallocated && <Badge className="bg-destructive/10 text-destructive text-[10px]"><AlertTriangle className="inline h-3 w-3 mr-1" />Over</Badge>}
                  </div>
                  <span className="text-sm font-bold">{Number(s.utilization_percent).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, Number(s.utilization_percent))} className="h-2 mb-1" />
                <div className="text-xs text-muted-foreground">
                  Capacity: {s.capacity_hours}h · Allocated: {s.allocated_hours}h · Available: {s.available_hours}h
                </div>
              </div>
            ))}
            {snaps.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No capacity snapshots yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
