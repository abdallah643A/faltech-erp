import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatSAR } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ChevronRight, ChevronDown, Pencil, Trash2, AlertTriangle, Link2 } from 'lucide-react';

interface Phase {
  id: string;
  project_id: string;
  parent_phase_id: string | null;
  phase_number: string;
  phase_name: string;
  description: string | null;
  level: number;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  budgeted_amount: number;
  actual_amount: number;
  status: string;
  percent_complete: number;
  depends_on_phase_id: string | null;
  children?: Phase[];
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
];

function getStatusColor(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-muted text-muted-foreground';
}

function buildTree(phases: Phase[]): Phase[] {
  const map = new Map<string, Phase>();
  const roots: Phase[] = [];
  phases.forEach(p => map.set(p.id, { ...p, children: [] }));
  phases.forEach(p => {
    const node = map.get(p.id)!;
    if (p.parent_phase_id && map.has(p.parent_phase_id)) {
      map.get(p.parent_phase_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

interface Props {
  projectId: string;
  projectBudget: number;
}

export default function ProjectPhasesTab({ projectId, projectBudget }: Props) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drillPhase, setDrillPhase] = useState<Phase | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    phase_number: '', phase_name: '', description: '', start_date: '', end_date: '',
    budgeted_amount: 0, status: 'not_started', percent_complete: 0, depends_on_phase_id: '',
  });

  const fetchPhases = async () => {
    setLoading(true);
    const { data } = await supabase.from('cpms_project_phases' as any).select('*')
      .eq('project_id', projectId).order('sort_order').order('phase_number');
    setPhases((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchPhases(); }, [projectId]);

  const tree = buildTree(phases);
  const totalBudgeted = phases.filter(p => !p.parent_phase_id).reduce((s, p) => s + (p.budgeted_amount || 0), 0);
  const totalActual = phases.filter(p => !p.parent_phase_id).reduce((s, p) => s + (p.actual_amount || 0), 0);
  const budgetBalanced = Math.abs(totalBudgeted - projectBudget) < 0.01;

  const openAdd = (pId: string | null = null) => {
    const level = pId ? (phases.find(p => p.id === pId)?.level || 0) + 1 : 1;
    if (level > 3) { toast({ title: 'Max 3 levels of nesting', variant: 'destructive' }); return; }
    const siblings = phases.filter(p => p.parent_phase_id === pId);
    const parentNum = pId ? phases.find(p => p.id === pId)?.phase_number || '' : '';
    const nextNum = parentNum ? `${parentNum}.${siblings.length + 1}` : `${siblings.length + 1}`;
    setParentId(pId);
    setEditingPhase(null);
    setForm({ phase_number: nextNum, phase_name: '', description: '', start_date: '', end_date: '',
      budgeted_amount: 0, status: 'not_started', percent_complete: 0, depends_on_phase_id: '' });
    setShowForm(true);
  };

  const openEdit = (phase: Phase) => {
    setEditingPhase(phase);
    setParentId(phase.parent_phase_id);
    setForm({
      phase_number: phase.phase_number, phase_name: phase.phase_name,
      description: phase.description || '', start_date: phase.start_date || '',
      end_date: phase.end_date || '', budgeted_amount: phase.budgeted_amount,
      status: phase.status, percent_complete: phase.percent_complete,
      depends_on_phase_id: phase.depends_on_phase_id || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.phase_name) return;
    const level = parentId ? (phases.find(p => p.id === parentId)?.level || 0) + 1 : 1;
    const payload = {
      project_id: projectId, parent_phase_id: parentId || null, phase_number: form.phase_number,
      phase_name: form.phase_name, description: form.description || null, level,
      start_date: form.start_date || null, end_date: form.end_date || null,
      budgeted_amount: form.budgeted_amount, status: form.status,
      percent_complete: Math.min(100, Math.max(0, form.percent_complete)),
      depends_on_phase_id: form.depends_on_phase_id || null,
      sort_order: phases.filter(p => p.parent_phase_id === parentId).length,
    };

    if (editingPhase) {
      const { error } = await supabase.from('cpms_project_phases' as any)
        .update(payload as any).eq('id', editingPhase.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Phase updated' });
    } else {
      const { error } = await supabase.from('cpms_project_phases' as any)
        .insert({ ...payload, created_by: user?.id } as any);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Phase created' });
    }
    setShowForm(false);
    fetchPhases();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this phase and all sub-phases?')) return;
    const { error } = await supabase.from('cpms_project_phases' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Phase deleted' });
    fetchPhases();
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderPhaseRow = (phase: Phase, depth: number = 0): React.ReactNode[] => {
    const isExpanded = expanded.has(phase.id);
    const hasChildren = phase.children && phase.children.length > 0;
    const variance = phase.budgeted_amount - phase.actual_amount;
    const dep = phase.depends_on_phase_id ? phases.find(p => p.id === phase.depends_on_phase_id) : null;

    const rows: React.ReactNode[] = [
      <TableRow key={phase.id} className={depth > 0 ? 'bg-muted/30' : ''}>
        <TableCell>
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 24 }}>
            {hasChildren ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(phase.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : <span className="w-6" />}
            <span className="font-mono text-xs text-muted-foreground mr-2">{phase.phase_number}</span>
            <span className="font-medium">{phase.phase_name}</span>
          </div>
        </TableCell>
        <TableCell><Badge className={getStatusColor(phase.status)}>{phase.status.replace('_', ' ')}</Badge></TableCell>
        <TableCell className="text-right font-mono">{formatSAR(phase.budgeted_amount)}</TableCell>
        <TableCell className="text-right font-mono">{formatSAR(phase.actual_amount)}</TableCell>
        <TableCell className={`text-right font-mono ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>
          {variance < 0 && <AlertTriangle className="inline h-3 w-3 mr-1" />}
          {formatSAR(variance)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={phase.percent_complete} className="h-2 flex-1" />
            <span className="text-xs font-mono w-10 text-right">{phase.percent_complete}%</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {phase.start_date && phase.end_date ? `${phase.start_date} → ${phase.end_date}` : '-'}
        </TableCell>
        <TableCell>
          {dep && (
            <span className="text-xs flex items-center gap-1 text-muted-foreground">
              <Link2 className="h-3 w-3" /> {dep.phase_number}
            </span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {phase.level < 3 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdd(phase.id)} title="Add sub-phase">
                <Plus className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(phase)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(phase.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ];

    if (isExpanded && hasChildren) {
      phase.children!.sort((a, b) => a.sort_order - b.sort_order || a.phase_number.localeCompare(b.phase_number));
      phase.children!.forEach(child => rows.push(...renderPhaseRow(child, depth + 1)));
    }

    return rows;
  };

  const topLevelPhases = phases.filter(p => !p.parent_phase_id);

  return (
    <div className="space-y-4">
      {/* Phase Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tree.map(phase => {
          const childActual = phase.children?.reduce((s, c) => s + (c.actual_amount || 0), 0) || 0;
          const totalAct = phase.actual_amount + childActual;
          return (
            <Card key={phase.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDrillPhase(phase)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate">{phase.phase_name}</span>
                  <Badge className={`${getStatusColor(phase.status)} text-xs`}>{phase.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-lg font-bold">{formatSAR(phase.budgeted_amount)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={phase.percent_complete} className="h-2 flex-1" />
                  <span className="text-xs">{phase.percent_complete}%</span>
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{phase.start_date || '-'}</span>
                  <span>{phase.end_date || '-'}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget Validation */}
      {projectBudget > 0 && (
        <div className={`p-3 rounded-lg text-sm ${budgetBalanced ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
          {budgetBalanced
            ? '✅ Phase budgets balanced with project budget'
            : `⚠️ Phase budgets (${formatSAR(totalBudgeted)}) ≠ Project budget (${formatSAR(projectBudget)}). Difference: ${formatSAR(Math.abs(totalBudgeted - projectBudget))}`
          }
        </div>
      )}

      {/* Phase Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Project Phases</CardTitle>
          <Button size="sm" onClick={() => openAdd(null)}><Plus className="h-4 w-4 mr-1" /> Add Phase</Button>
        </CardHeader>
        <CardContent>
          {phases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No phases defined. Click "Add Phase" to start.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget (SAR)</TableHead>
                  <TableHead className="text-right">Actual (SAR)</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Depends On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tree.sort((a, b) => a.sort_order - b.sort_order || a.phase_number.localeCompare(b.phase_number))
                  .flatMap(phase => renderPhaseRow(phase, 0))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gantt-style Timeline */}
      {topLevelPhases.length > 0 && (() => {
        const allDates = phases.filter(p => p.start_date && p.end_date);
        if (allDates.length === 0) return null;
        const minDate = new Date(Math.min(...allDates.map(p => new Date(p.start_date!).getTime())));
        const maxDate = new Date(Math.max(...allDates.map(p => new Date(p.end_date!).getTime())));
        const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <Card>
            <CardHeader><CardTitle className="text-base">Phase Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {phases.filter(p => p.start_date && p.end_date).sort((a, b) => a.phase_number.localeCompare(b.phase_number)).map(phase => {
                  const start = (new Date(phase.start_date!).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
                  const duration = (new Date(phase.end_date!).getTime() - new Date(phase.start_date!).getTime()) / (1000 * 60 * 60 * 24);
                  const left = (start / totalDays) * 100;
                  const width = Math.max(2, (duration / totalDays) * 100);
                  const isCritical = phase.depends_on_phase_id != null;
                  const barColor = phase.status === 'complete' ? 'bg-green-500' : phase.status === 'in_progress' ? 'bg-blue-500' : phase.status === 'on_hold' ? 'bg-yellow-500' : 'bg-muted-foreground/40';

                  return (
                    <div key={phase.id} className="flex items-center gap-2" style={{ paddingLeft: (phase.level - 1) * 16 }}>
                      <span className="text-xs w-36 truncate">{phase.phase_number} {phase.phase_name}</span>
                      <div className="flex-1 h-6 bg-muted rounded relative">
                        <div
                          className={`absolute h-full rounded ${barColor} ${isCritical ? 'ring-2 ring-destructive' : ''}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${phase.start_date} → ${phase.end_date} (${phase.percent_complete}%)`}
                        >
                          <div className="h-full bg-foreground/20 rounded" style={{ width: `${phase.percent_complete}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{minDate.toLocaleDateString()}</span>
                <span>{maxDate.toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="inline-block w-3 h-3 ring-2 ring-destructive rounded mr-1" /> = Critical path (has dependency)
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Phase Drill-Down Dialog */}
      <Dialog open={!!drillPhase} onOpenChange={() => setDrillPhase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillPhase?.phase_number} – {drillPhase?.phase_name}</DialogTitle>
          </DialogHeader>
          {drillPhase && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{drillPhase.description || 'No description'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Budget</Label><p className="font-bold">{formatSAR(drillPhase.budgeted_amount)}</p></div>
                <div><Label className="text-xs">Actual</Label><p className="font-bold">{formatSAR(drillPhase.actual_amount)}</p></div>
                <div><Label className="text-xs">Variance</Label>
                  <p className={`font-bold ${(drillPhase.budgeted_amount - drillPhase.actual_amount) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatSAR(drillPhase.budgeted_amount - drillPhase.actual_amount)}
                  </p>
                </div>
                <div><Label className="text-xs">Progress</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={drillPhase.percent_complete} className="h-3 flex-1" />
                    <span className="font-bold">{drillPhase.percent_complete}%</span>
                  </div>
                </div>
              </div>
              {drillPhase.children && drillPhase.children.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Sub-phases</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phase</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drillPhase.children.map(sub => (
                        <TableRow key={sub.id}>
                          <TableCell>{sub.phase_number} {sub.phase_name}</TableCell>
                          <TableCell><Badge className={getStatusColor(sub.status)}>{sub.status.replace('_', ' ')}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{formatSAR(sub.budgeted_amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={sub.percent_complete} className="h-2 flex-1" />
                              <span className="text-xs">{sub.percent_complete}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Phase Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPhase ? 'Edit Phase' : parentId ? 'Add Sub-Phase' : 'Add Phase'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phase Number</Label><Input value={form.phase_number} onChange={e => setForm(f => ({ ...f, phase_number: e.target.value }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Phase Name *</Label><Input value={form.phase_name} onChange={e => setForm(f => ({ ...f, phase_name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget (SAR)</Label><Input type="number" value={form.budgeted_amount} onChange={e => setForm(f => ({ ...f, budgeted_amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>% Complete</Label><Input type="number" min={0} max={100} value={form.percent_complete} onChange={e => setForm(f => ({ ...f, percent_complete: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) }))} /></div>
            </div>
            <div>
              <Label>Depends On Phase</Label>
              <Select value={form.depends_on_phase_id} onValueChange={v => setForm(f => ({ ...f, depends_on_phase_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {phases.filter(p => p.id !== editingPhase?.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.phase_number} – {p.phase_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">{editingPhase ? 'Update Phase' : 'Create Phase'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
