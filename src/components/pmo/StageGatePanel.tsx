import { useState } from 'react';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

const gateStatusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  in_review: <Shield className="h-4 w-4 text-amber-500" />,
  approved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

const defaultGates = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closure'];

export function StageGatePanel() {
  const { stageGates, createStageGate, updateStageGate } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ project_id: '', gate_name: '', gate_order: 1 });

  const handleCreateDefault = (projectId: string) => {
    defaultGates.forEach((gate, i) => {
      createStageGate.mutate({ project_id: projectId, gate_name: gate, gate_order: i + 1 } as any);
    });
  };

  // Group gates by project
  const gatesByProject: Record<string, typeof stageGates> = {};
  stageGates.forEach(g => {
    if (!gatesByProject[g.project_id]) gatesByProject[g.project_id] = [];
    gatesByProject[g.project_id].push(g);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Stage-Gate Governance</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Gate</Button>
      </div>

      {/* Gate Health Summary */}
      <div className="grid grid-cols-4 gap-4">
        {['pending', 'in_review', 'approved', 'rejected'].map(status => (
          <Card key={status}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              {gateStatusIcon[status]}
              <div>
                <p className="text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
                <p className="text-xl font-bold">{stageGates.filter(g => g.status === status).length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gates by Project */}
      {Object.entries(gatesByProject).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm mb-3">No stage gates defined. Select a project to create default gates.</p>
            {projects.length > 0 && (
              <Select onValueChange={handleCreateDefault}>
                <SelectTrigger className="w-64 mx-auto"><SelectValue placeholder="Select project to initialize gates" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      ) : Object.entries(gatesByProject).map(([projectId, gates]) => {
        const project = projects.find(p => p.id === projectId);
        const sortedGates = [...gates].sort((a, b) => a.gate_order - b.gate_order);
        return (
          <Card key={projectId}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{project?.name || 'Project'}</CardTitle></CardHeader>
            <CardContent>
              {/* Gate timeline */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                {sortedGates.map((gate, i) => (
                  <div key={gate.id} className="flex items-center">
                    <div className={`flex flex-col items-center min-w-[100px] p-2 rounded border ${
                      gate.status === 'approved' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' :
                      gate.status === 'rejected' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                      gate.status === 'in_review' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' :
                      'border-border'
                    }`}>
                      {gateStatusIcon[gate.status]}
                      <span className="text-xs font-medium mt-1">{gate.gate_name}</span>
                      <Badge variant="outline" className="text-[10px] mt-1">{gate.status}</Badge>
                    </div>
                    {i < sortedGates.length - 1 && <div className="h-0.5 w-6 bg-border mx-1" />}
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                {sortedGates.filter(g => g.status === 'pending' || g.status === 'in_review').slice(0, 1).map(gate => (
                  <div key={gate.id} className="flex gap-2">
                    {gate.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateStageGate.mutate({ id: gate.id, status: 'in_review' })}>Start Review: {gate.gate_name}</Button>
                    )}
                    {gate.status === 'in_review' && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStageGate.mutate({ id: gate.id, status: 'approved', approved_at: new Date().toISOString() })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStageGate.mutate({ id: gate.id, status: 'rejected' })}>Reject</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add Gate Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stage Gate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project *</Label>
              <Select value={form.project_id} onValueChange={v => setForm({...form, project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Gate Name *</Label><Input value={form.gate_name} onChange={e => setForm({...form, gate_name: e.target.value})} /></div>
            <div><Label>Gate Order</Label><Input type="number" value={form.gate_order} onChange={e => setForm({...form, gate_order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={() => { createStageGate.mutate(form as any); setIsOpen(false); }} disabled={!form.project_id || !form.gate_name}>Create Gate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
