import { useState, useMemo } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useResourceAssignments, useCreateResourceAssignment } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ResourceLoadingPage() {
  const [projectId, setProjectId] = useState('');
  const { data: assigns, isLoading } = useResourceAssignments(projectId);
  const create = useCreateResourceAssignment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ resource_name: '', role: '', start_date: '', end_date: '', hours_per_week: 40, hourly_rate: 0, allocation_pct: 100 });

  const totals = useMemo(() => {
    const hours = (assigns || []).reduce((s: number, a: any) => {
      const weeks = a.start_date && a.end_date ? Math.max(1, (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (7 * 86400000)) : 1;
      return s + weeks * Number(a.hours_per_week || 0) * (Number(a.allocation_pct || 100) / 100);
    }, 0);
    const cost = (assigns || []).reduce((s: number, a: any) => {
      const weeks = a.start_date && a.end_date ? Math.max(1, (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (7 * 86400000)) : 1;
      return s + weeks * Number(a.hours_per_week || 0) * (Number(a.allocation_pct || 100) / 100) * Number(a.hourly_rate || 0);
    }, 0);
    return { hours, cost, count: assigns?.length || 0 };
  }, [assigns]);

  return (
    <PMOPageShell title="Resource Loading" description="Allocate people to projects with hours, rates, and date ranges." projectId={projectId} setProjectId={setProjectId}>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p className="text-2xl font-bold">{totals.count}</p><p className="text-xs text-muted-foreground">Assignments</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-2xl font-bold">{totals.hours.toFixed(0)}</p><p className="text-xs text-muted-foreground">Total Allocated Hours</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-2xl font-bold">{totals.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Estimated Labor Cost</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Assignments</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Assignment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Resource Assignment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Resource Name *</Label><Input value={form.resource_name} onChange={e => setForm({ ...form, resource_name: e.target.value })} /></div>
                <div><Label>Role</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start *</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End *</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Hrs/Week</Label><Input type="number" value={form.hours_per_week} onChange={e => setForm({ ...form, hours_per_week: +e.target.value })} /></div>
                  <div><Label>Allocation %</Label><Input type="number" value={form.allocation_pct} onChange={e => setForm({ ...form, allocation_pct: +e.target.value })} /></div>
                  <div><Label>Rate</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: +e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!form.resource_name || !form.start_date || !form.end_date) return;
                  await create.mutateAsync({ ...form, project_id: projectId });
                  setOpen(false); setForm({ resource_name: '', role: '', start_date: '', end_date: '', hours_per_week: 40, hourly_rate: 0, allocation_pct: 100 });
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (assigns?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No assignments.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead>Role</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Hrs/Wk</TableHead><TableHead className="text-right">Alloc %</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {assigns!.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.resource_name}</TableCell>
                      <TableCell className="text-xs">{a.role || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(a.start_date), 'MMM d')} → {format(new Date(a.end_date), 'MMM d')}</TableCell>
                      <TableCell className="text-right">{a.hours_per_week}</TableCell>
                      <TableCell className="text-right">{a.allocation_pct}%</TableCell>
                      <TableCell className="text-right">{Number(a.hourly_rate).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </PMOPageShell>
  );
}
