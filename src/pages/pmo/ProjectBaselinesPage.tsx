import { useState } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useBaselines, useCreateBaseline } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, GitBranch } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectBaselinesPage() {
  const [projectId, setProjectId] = useState('');
  const { data: baselines, isLoading } = useBaselines(projectId);
  const createBaseline = useCreateBaseline();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ baseline_name: '', start_date: '', end_date: '', budget: 0, notes: '' });

  return (
    <PMOPageShell title="Project Baselines" description="Snapshot the schedule and budget at key points to measure variance over time." projectId={projectId} setProjectId={setProjectId}>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><GitBranch className="w-4 h-4" />Baselines ({baselines?.length ?? 0})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Baseline</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Baseline Snapshot</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Baseline Name *</Label><Input value={form.baseline_name} onChange={e => setForm({ ...form, baseline_name: e.target.value })} placeholder="e.g. Initial Plan B1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: +e.target.value })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!form.baseline_name) return;
                  await createBaseline.mutateAsync({ ...form, project_id: projectId, project_kind: 'pm', is_current: true, baseline_number: (baselines?.length || 0) + 1 });
                  setOpen(false); setForm({ baseline_name: '', start_date: '', end_date: '', budget: 0, notes: '' });
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (baselines?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No baselines yet.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Budget</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {baselines!.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">B{b.baseline_number}</TableCell>
                      <TableCell className="font-medium">{b.baseline_name}</TableCell>
                      <TableCell className="text-xs">{b.start_date ? format(new Date(b.start_date), 'MMM d') : '—'} → {b.end_date ? format(new Date(b.end_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right">{Number(b.budget || 0).toLocaleString()}</TableCell>
                      <TableCell>{b.is_current ? <Badge>Current</Badge> : <Badge variant="outline">Historical</Badge>}</TableCell>
                      <TableCell className="text-xs">{format(new Date(b.created_at), 'MMM d, yyyy')}</TableCell>
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
