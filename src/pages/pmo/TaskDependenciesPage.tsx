import { useState } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useDependencies, useCreateDependency } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ArrowRight } from 'lucide-react';

export default function TaskDependenciesPage() {
  const [projectId, setProjectId] = useState('');
  const { data: deps, isLoading } = useDependencies(projectId);
  const create = useCreateDependency();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ predecessor_task_id: '', successor_task_id: '', dependency_type: 'FS', lag_days: 0, notes: '' });

  return (
    <PMOPageShell title="Task Dependencies" description="Define predecessor/successor links and lags between project tasks." projectId={projectId} setProjectId={setProjectId}>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Dependencies ({deps?.length ?? 0})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Link</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Dependency</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Predecessor Task ID *</Label><Input value={form.predecessor_task_id} onChange={e => setForm({ ...form, predecessor_task_id: e.target.value })} placeholder="UUID of predecessor task" /></div>
                <div><Label>Successor Task ID *</Label><Input value={form.successor_task_id} onChange={e => setForm({ ...form, successor_task_id: e.target.value })} placeholder="UUID of successor task" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.dependency_type} onValueChange={v => setForm({ ...form, dependency_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FS">FS — Finish to Start</SelectItem>
                        <SelectItem value="SS">SS — Start to Start</SelectItem>
                        <SelectItem value="FF">FF — Finish to Finish</SelectItem>
                        <SelectItem value="SF">SF — Start to Finish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Lag (days)</Label><Input type="number" value={form.lag_days} onChange={e => setForm({ ...form, lag_days: +e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!form.predecessor_task_id || !form.successor_task_id) return;
                  await create.mutateAsync({ ...form, project_id: projectId });
                  setOpen(false); setForm({ predecessor_task_id: '', successor_task_id: '', dependency_type: 'FS', lag_days: 0, notes: '' });
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (deps?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No dependencies defined.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Predecessor</TableHead><TableHead></TableHead><TableHead>Successor</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Lag (d)</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deps!.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{String(d.predecessor_task_id).slice(0, 8)}</TableCell>
                      <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                      <TableCell className="font-mono text-xs">{String(d.successor_task_id).slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline">{d.dependency_type}</Badge></TableCell>
                      <TableCell className="text-right">{d.lag_days}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.notes || '—'}</TableCell>
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

function Badge({ children, variant }: { children: React.ReactNode; variant?: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-muted">{children}</span>;
}
