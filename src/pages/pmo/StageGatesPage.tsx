import { useState } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useStageGates, useCreateStageGate } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Flag, CheckCircle2, XCircle, Clock } from 'lucide-react';

const statusIcon = (s: string) => s === 'passed' ? <CheckCircle2 className="w-4 h-4 text-primary" />
  : s === 'failed' ? <XCircle className="w-4 h-4 text-destructive" />
  : s === 'in_review' ? <Clock className="w-4 h-4 text-amber-600" />
  : <Flag className="w-4 h-4 text-muted-foreground" />;

export default function StageGatesPage() {
  const [projectId, setProjectId] = useState('');
  const { data: gates, isLoading } = useStageGates(projectId);
  const create = useCreateStageGate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ gate_name: '', gate_type: 'phase', planned_date: '', approver_name: '' });

  return (
    <PMOPageShell title="Stage Gates" description="Define and approve project phase gates with criteria and sign-offs." projectId={projectId} setProjectId={setProjectId}>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Gates ({gates?.length ?? 0})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Gate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Stage Gate</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Gate Name *</Label><Input value={form.gate_name} onChange={e => setForm({ ...form, gate_name: e.target.value })} placeholder="e.g. G1 — Concept Approval" /></div>
                <div><Label>Type</Label>
                  <Select value={form.gate_type} onValueChange={v => setForm({ ...form, gate_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phase">Phase Gate</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="approval">Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
                  <div><Label>Approver</Label><Input value={form.approver_name} onChange={e => setForm({ ...form, approver_name: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!form.gate_name) return;
                  await create.mutateAsync({ ...form, project_id: projectId, gate_seq: (gates?.length || 0) + 1, planned_date: form.planned_date || null });
                  setOpen(false); setForm({ gate_name: '', gate_type: 'phase', planned_date: '', approver_name: '' });
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : (gates?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No gates defined.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Gate</TableHead><TableHead>Type</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead><TableHead>Approver</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {gates!.sort((a: any, b: any) => a.gate_seq - b.gate_seq).map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono">G{g.gate_seq}</TableCell>
                      <TableCell className="font-medium">{g.gate_name}</TableCell>
                      <TableCell><Badge variant="outline">{g.gate_type}</Badge></TableCell>
                      <TableCell className="text-xs">{g.planned_date || '—'}</TableCell>
                      <TableCell className="text-xs">{g.actual_date || '—'}</TableCell>
                      <TableCell className="text-xs">{g.approver_name || '—'}</TableCell>
                      <TableCell><div className="flex items-center gap-1">{statusIcon(g.status)}<span className="text-xs capitalize">{g.status.replace('_', ' ')}</span></div></TableCell>
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
