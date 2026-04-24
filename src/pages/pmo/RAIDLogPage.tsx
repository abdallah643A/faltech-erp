import { useState } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useRaidLog, useCreateRaid } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertOctagon, Lightbulb, AlertCircle, CheckCircle2 } from 'lucide-react';

const sevScore = (p: string, i: string) => {
  const map: Record<string, number> = { low: 1, medium: 2, high: 3 };
  return (map[p] || 0) * (map[i] || 0);
};

export default function RAIDLogPage() {
  const [projectId, setProjectId] = useState('');
  const { data: items, isLoading } = useRaidLog(projectId);
  const create = useCreateRaid();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ entry_type: 'risk', title: '', description: '', probability: 'medium', impact: 'medium', owner_name: '', due_date: '', mitigation: '' });

  const filtered = (type: string) => (items || []).filter((i: any) => i.entry_type === type);

  return (
    <PMOPageShell title="RAID Log" description="Track Risks, Assumptions, Issues, and Decisions across the project." projectId={projectId} setProjectId={setProjectId}>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Entries ({items?.length ?? 0})</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Entry</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New RAID Entry</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div><Label>Type *</Label>
                  <Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="assumption">Assumption</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="decision">Decision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                {(form.entry_type === 'risk' || form.entry_type === 'issue') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Probability</Label>
                      <Select value={form.probability} onValueChange={v => setForm({ ...form, probability: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Impact</Label>
                      <Select value={form.impact} onValueChange={v => setForm({ ...form, impact: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></div>
                  <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
                <div><Label>Mitigation / Action</Label><Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!form.title) return;
                  await create.mutateAsync({ ...form, project_id: projectId, severity_score: sevScore(form.probability, form.impact), due_date: form.due_date || null });
                  setOpen(false); setForm({ entry_type: 'risk', title: '', description: '', probability: 'medium', impact: 'medium', owner_name: '', due_date: '', mitigation: '' });
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="risk">
            <TabsList>
              <TabsTrigger value="risk"><AlertOctagon className="w-3 h-3 mr-1" />Risks ({filtered('risk').length})</TabsTrigger>
              <TabsTrigger value="assumption"><Lightbulb className="w-3 h-3 mr-1" />Assumptions ({filtered('assumption').length})</TabsTrigger>
              <TabsTrigger value="issue"><AlertCircle className="w-3 h-3 mr-1" />Issues ({filtered('issue').length})</TabsTrigger>
              <TabsTrigger value="decision"><CheckCircle2 className="w-3 h-3 mr-1" />Decisions ({filtered('decision').length})</TabsTrigger>
            </TabsList>
            {(['risk', 'assumption', 'issue', 'decision'] as const).map(t => (
              <TabsContent key={t} value={t}>
                {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
                  : filtered(t).length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">None.</div>
                  : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Owner</TableHead>{(t === 'risk' || t === 'issue') && <TableHead>Severity</TableHead>}<TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filtered(t).map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.title}<div className="text-xs text-muted-foreground">{r.description}</div></TableCell>
                            <TableCell className="text-xs">{r.owner_name || '—'}</TableCell>
                            {(t === 'risk' || t === 'issue') && <TableCell><Badge variant={r.severity_score >= 6 ? 'destructive' : r.severity_score >= 3 ? 'secondary' : 'outline'}>{r.severity_score}</Badge></TableCell>}
                            <TableCell className="text-xs">{r.due_date || '—'}</TableCell>
                            <TableCell><Badge variant={r.status === 'closed' ? 'default' : 'outline'}>{r.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </PMOPageShell>
  );
}
