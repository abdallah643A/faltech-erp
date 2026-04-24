import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  GitBranch, AlertTriangle, Network, Target, Plus, ArrowRight,
  Clock, Zap, Route, Shield
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const DEP_TYPES = [
  { value: 'finish_to_start', label: 'Finish → Start' },
  { value: 'start_to_start', label: 'Start → Start' },
  { value: 'finish_to_finish', label: 'Finish → Finish' },
  { value: 'start_to_finish', label: 'Start → Finish' },
];

export default function PMODependencyTracking() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { dependencies, createDependency } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState('graph');
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ source_project_id: '', target_project_id: '', dependency_type: 'finish_to_start', description: '', is_critical: false });

  // Critical path snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['pmo-critical-path', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_critical_path_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(10);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const generateSnapshot = useMutation({
    mutationFn: async () => {
      // Build critical path from dependencies
      const criticalDeps = dependencies.filter(d => d.is_critical);
      const nodes = criticalDeps.map(d => ({
        source: projects.find(p => p.id === d.source_project_id)?.name || 'Unknown',
        target: projects.find(p => p.id === d.target_project_id)?.name || 'Unknown',
        type: d.dependency_type,
      }));

      // Identify bottlenecks (projects with most dependencies)
      const depCounts: Record<string, number> = {};
      dependencies.forEach(d => {
        depCounts[d.target_project_id] = (depCounts[d.target_project_id] || 0) + 1;
      });
      const bottlenecks = Object.entries(depCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ project: projects.find(p => p.id === id)?.name || id, dependency_count: count }));

      const { error } = await supabase.from('pmo_critical_path_snapshots').insert({
        critical_path_nodes: nodes,
        bottleneck_nodes: bottlenecks,
        total_duration_days: criticalDeps.length * 14,
        cascading_risks: criticalDeps.filter(d => d.status === 'active').map(d => ({
          from: projects.find(p => p.id === d.source_project_id)?.name,
          to: projects.find(p => p.id === d.target_project_id)?.name,
          risk: 'Delay cascade possible',
        })),
        company_id: activeCompanyId,
        created_by: profile?.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-critical-path'] });
      toast({ title: 'Critical path snapshot generated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleAdd = () => {
    if (!form.source_project_id || !form.target_project_id) return;
    createDependency.mutate({ ...form, created_by: profile?.user_id } as any);
    setAddDialog(false);
    setForm({ source_project_id: '', target_project_id: '', dependency_type: 'finish_to_start', description: '', is_critical: false });
  };

  // Stats
  const criticalCount = dependencies.filter(d => d.is_critical).length;
  const activeCount = dependencies.filter(d => d.status === 'active').length;

  // Dependency count per project
  const depByProject = useMemo(() => {
    const counts: Record<string, { name: string; incoming: number; outgoing: number }> = {};
    dependencies.forEach(d => {
      const src = projects.find(p => p.id === d.source_project_id);
      const tgt = projects.find(p => p.id === d.target_project_id);
      if (src) {
        if (!counts[src.id]) counts[src.id] = { name: src.name, incoming: 0, outgoing: 0 };
        counts[src.id].outgoing++;
      }
      if (tgt) {
        if (!counts[tgt.id]) counts[tgt.id] = { name: tgt.name, incoming: 0, outgoing: 0 };
        counts[tgt.id].incoming++;
      }
    });
    return Object.values(counts).sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing)).slice(0, 10);
  }, [dependencies, projects]);

  const latestSnapshot = snapshots[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dependency & Constraint Tracking</h1>
          <p className="text-muted-foreground">Critical path analysis, bottleneck detection, and cascading risks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateSnapshot.mutate()} disabled={generateSnapshot.isPending}>
            <Zap className="h-4 w-4 mr-1" /> Generate Critical Path
          </Button>
          <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Dependency</Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><GitBranch className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Dependencies</span></div>
          <p className="text-2xl font-bold">{dependencies.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Critical</span></div>
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Route className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Critical Path Length</span></div>
          <p className="text-2xl font-bold">{latestSnapshot?.total_duration_days || 0}d</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Network className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Bottlenecks</span></div>
          <p className="text-2xl font-bold">{Array.isArray(latestSnapshot?.bottleneck_nodes) ? latestSnapshot.bottleneck_nodes.length : 0}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="graph"><Network className="h-4 w-4 mr-1" /> Dependency Graph</TabsTrigger>
          <TabsTrigger value="critical"><Route className="h-4 w-4 mr-1" /> Critical Path</TabsTrigger>
          <TabsTrigger value="bottlenecks"><AlertTriangle className="h-4 w-4 mr-1" /> Bottlenecks</TabsTrigger>
          <TabsTrigger value="list"><GitBranch className="h-4 w-4 mr-1" /> All Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Dependency Connections per Project</CardTitle></CardHeader>
            <CardContent>
              {depByProject.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={depByProject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                    <Tooltip />
                    <Bar dataKey="incoming" name="Incoming" fill="hsl(var(--primary))" stackId="a" />
                    <Bar dataKey="outgoing" name="Outgoing" fill="hsl(var(--warning))" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No dependencies defined. Add project dependencies to visualize the graph.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visual dependency flow */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Dependency Flow</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dependencies.map(dep => {
                  const src = projects.find(p => p.id === dep.source_project_id);
                  const tgt = projects.find(p => p.id === dep.target_project_id);
                  return (
                    <div key={dep.id} className={`flex items-center gap-3 p-3 rounded-lg border ${dep.is_critical ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                      <Badge variant="outline" className="min-w-[100px] justify-center text-xs">{src?.name || 'Unknown'}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowRight className="h-4 w-4" />
                        <span>{DEP_TYPES.find(t => t.value === dep.dependency_type)?.label}</span>
                      </div>
                      <Badge variant="outline" className="min-w-[100px] justify-center text-xs">{tgt?.name || 'Unknown'}</Badge>
                      {dep.is_critical && <Badge variant="destructive" className="ml-auto text-xs">Critical</Badge>}
                    </div>
                  );
                })}
                {dependencies.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No dependencies defined yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Critical Path Analysis</CardTitle></CardHeader>
            <CardContent>
              {latestSnapshot ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Snapshot: {new Date(latestSnapshot.snapshot_date).toLocaleDateString()}</span>
                    <Badge>Duration: {latestSnapshot.total_duration_days} days</Badge>
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(latestSnapshot.critical_path_nodes) && (latestSnapshot.critical_path_nodes as any[]).map((node: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded border border-destructive/20 bg-destructive/5">
                        <Badge variant="destructive" className="text-xs">{i + 1}</Badge>
                        <span className="text-sm">{node.source}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{node.target}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{node.type?.replace(/_/g, ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No critical path analysis yet. Click "Generate Critical Path" to analyze.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cascading Risks */}
          {latestSnapshot && Array.isArray(latestSnapshot.cascading_risks) && (latestSnapshot.cascading_risks as any[]).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cascading Risks</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(latestSnapshot.cascading_risks as any[]).map((risk: any, i: number) => (
                    <div key={i} className="p-3 rounded border border-warning/20 bg-warning/5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-sm font-medium">{risk.from} → {risk.to}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{risk.risk}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Bottleneck Projects</CardTitle></CardHeader>
            <CardContent>
              {latestSnapshot && Array.isArray(latestSnapshot.bottleneck_nodes) && (latestSnapshot.bottleneck_nodes as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(latestSnapshot.bottleneck_nodes as any[]).map((bn: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive">{i + 1}</Badge>
                        <span className="font-medium">{bn.project}</span>
                      </div>
                      <Badge variant="outline">{bn.dependency_count} dependencies</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Generate a critical path snapshot to identify bottlenecks.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependencies.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{projects.find(p => p.id === d.source_project_id)?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">{DEP_TYPES.find(t => t.value === d.dependency_type)?.label}</TableCell>
                      <TableCell className="font-medium">{projects.find(p => p.id === d.target_project_id)?.name || 'Unknown'}</TableCell>
                      <TableCell>{d.is_critical ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                      <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {dependencies.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No dependencies</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dependency Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Project Dependency</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Source Project</Label>
              <Select value={form.source_project_id} onValueChange={v => setForm(p => ({ ...p, source_project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Target Project</Label>
              <Select value={form.target_project_id} onValueChange={v => setForm(p => ({ ...p, target_project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                <SelectContent>{projects.filter(p => p.id !== form.source_project_id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('common.type')}</Label>
              <Select value={form.dependency_type} onValueChange={v => setForm(p => ({ ...p, dependency_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_critical} onCheckedChange={v => setForm(p => ({ ...p, is_critical: !!v }))} />
              <Label>Critical dependency</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAdd} disabled={!form.source_project_id || !form.target_project_id}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
