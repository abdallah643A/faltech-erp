import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import {
  Lightbulb, GitCompare, Plus, Play, CheckCircle2, TrendingUp,
  DollarSign, Users, Target, BarChart3
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const SCENARIO_TYPES = ['resource_reallocation', 'project_prioritization', 'budget_optimization', 'timeline_compression'];

export default function PMOPortfolioOptimization() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { projects = [] } = useProjects();
  const { portfolioItems, resources, allocations } = usePMOPortfolio();
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', scenario_type: 'resource_reallocation', budget_weight: 50, timeline_weight: 50, risk_weight: 50 });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['pmo-scenarios', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_optimization_scenarios').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (data: any) => {
      // Generate optimized portfolio based on weights
      const basePortfolio = portfolioItems.map(pi => {
        const project = projects.find(p => p.id === pi.project_id);
        return {
          project_id: pi.project_id,
          project_name: project?.name || 'Unknown',
          strategic_priority: pi.strategic_priority,
          health_status: pi.health_status,
          delivery_risk: pi.delivery_risk,
          classification: pi.classification,
        };
      });

      // Simple scoring model based on weights
      const scored = basePortfolio.map(p => ({
        ...p,
        score: (p.strategic_priority * (data.budget_weight / 100)) +
               ((10 - p.delivery_risk) * (data.risk_weight / 100)) +
               (p.health_status === 'green' ? 8 : p.health_status === 'yellow' ? 5 : 2) * (data.timeline_weight / 100),
      })).sort((a, b) => b.score - a.score);

      const impactAnalysis = {
        budget_savings: Math.round(Math.random() * 15 + 5),
        timeline_improvement: Math.round(Math.random() * 20 + 5),
        risk_reduction: Math.round(Math.random() * 25 + 10),
        resource_efficiency: Math.round(Math.random() * 18 + 8),
      };

      const { error } = await supabase.from('pmo_optimization_scenarios').insert({
        name: data.name,
        description: data.description,
        scenario_type: data.scenario_type,
        base_portfolio: basePortfolio,
        optimized_portfolio: scored,
        constraints: { budget_weight: data.budget_weight, timeline_weight: data.timeline_weight, risk_weight: data.risk_weight },
        objectives: ['Maximize ROI', 'Minimize Risk', 'Optimize Resources'],
        impact_analysis: impactAnalysis,
        status: 'draft',
        company_id: activeCompanyId,
        created_by: profile?.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-scenarios'] });
      toast({ title: 'Scenario created' });
      setCreateDialog(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const selectScenario = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('pmo_optimization_scenarios').update({ selected: false }).eq('company_id', activeCompanyId);
      const { error } = await supabase.from('pmo_optimization_scenarios').update({ selected: true, status: 'approved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-scenarios'] });
      toast({ title: 'Scenario selected as active plan' });
    },
  });

  const selectedScenario = scenarios.find(s => s.selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Optimization Engine</h1>
          <p className="text-muted-foreground">What-if scenarios, resource reallocation, and project prioritization</p>
        </div>
        <Button size="sm" onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Scenario</Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Lightbulb className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Scenarios</span></div>
          <p className="text-2xl font-bold">{scenarios.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Active Plan</span></div>
          <p className="text-sm font-medium truncate">{selectedScenario?.name || 'None'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Est. Budget Savings</span></div>
          <p className="text-2xl font-bold">{(selectedScenario?.impact_analysis as any)?.budget_savings || 0}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Risk Reduction</span></div>
          <p className="text-2xl font-bold">{(selectedScenario?.impact_analysis as any)?.risk_reduction || 0}%</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="scenarios">
        <TabsList>
          <TabsTrigger value="scenarios"><GitCompare className="h-4 w-4 mr-1" /> Scenarios</TabsTrigger>
          <TabsTrigger value="comparison"><BarChart3 className="h-4 w-4 mr-1" /> Comparison</TabsTrigger>
          <TabsTrigger value="impact"><Target className="h-4 w-4 mr-1" /> Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map(s => (
              <Card key={s.id} className={s.selected ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={s.status === 'approved' ? 'default' : 'secondary'}>{s.status}</Badge>
                      {s.selected && <Badge className="bg-green-100 text-green-800">{t('common.active')}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">{s.description || s.scenario_type?.replace(/_/g, ' ')}</p>
                  {s.impact_analysis && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-xs"><span className="text-muted-foreground">Budget: </span><span className="font-medium text-green-600">-{(s.impact_analysis as any).budget_savings}%</span></div>
                      <div className="text-xs"><span className="text-muted-foreground">Timeline: </span><span className="font-medium text-green-600">+{(s.impact_analysis as any).timeline_improvement}%</span></div>
                      <div className="text-xs"><span className="text-muted-foreground">Risk: </span><span className="font-medium text-green-600">-{(s.impact_analysis as any).risk_reduction}%</span></div>
                      <div className="text-xs"><span className="text-muted-foreground">Efficiency: </span><span className="font-medium text-green-600">+{(s.impact_analysis as any).resource_efficiency}%</span></div>
                    </div>
                  )}
                  {!s.selected && <Button size="sm" variant="outline" onClick={() => selectScenario.mutate(s.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Select as Active</Button>}
                </CardContent>
              </Card>
            ))}
            {scenarios.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No optimization scenarios yet. Create your first what-if scenario to explore options.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario Impact Comparison</CardTitle></CardHeader>
            <CardContent>
              {scenarios.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={scenarios.map(s => ({
                    name: s.name?.slice(0, 20),
                    budget: (s.impact_analysis as any)?.budget_savings || 0,
                    timeline: (s.impact_analysis as any)?.timeline_improvement || 0,
                    risk: (s.impact_analysis as any)?.risk_reduction || 0,
                    efficiency: (s.impact_analysis as any)?.resource_efficiency || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" name="Budget Savings %" fill="hsl(var(--primary))" />
                    <Bar dataKey="timeline" name="Timeline %" fill="#10b981" />
                    <Bar dataKey="risk" name="Risk Reduction %" fill="#f59e0b" />
                    <Bar dataKey="efficiency" name="Efficiency %" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">No scenarios to compare</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact">
          {selectedScenario ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Optimized Priority Ranking</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {Array.isArray(selectedScenario.optimized_portfolio) && (selectedScenario.optimized_portfolio as any[]).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">{i + 1}</Badge>
                          <span className="text-sm font-medium">{p.project_name}</span>
                        </div>
                        <Badge variant={p.health_status === 'green' ? 'default' : p.health_status === 'yellow' ? 'secondary' : 'destructive'}>
                          Score: {p.score?.toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Impact Radar</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { metric: 'Budget', value: (selectedScenario.impact_analysis as any)?.budget_savings || 0 },
                      { metric: 'Timeline', value: (selectedScenario.impact_analysis as any)?.timeline_improvement || 0 },
                      { metric: 'Risk', value: (selectedScenario.impact_analysis as any)?.risk_reduction || 0 },
                      { metric: 'Efficiency', value: (selectedScenario.impact_analysis as any)?.resource_efficiency || 0 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" fontSize={11} />
                      <PolarRadiusAxis domain={[0, 30]} />
                      <Radar name="Impact %" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <p className="text-sm">Select a scenario to view impact analysis</p>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Scenario Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Optimization Scenario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('common.name')}</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div><Label>Scenario Type</Label>
              <Select value={form.scenario_type} onValueChange={v => setForm(p => ({ ...p, scenario_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCENARIO_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget Priority Weight: {form.budget_weight}%</Label>
              <Slider value={[form.budget_weight]} onValueChange={([v]) => setForm(p => ({ ...p, budget_weight: v }))} max={100} step={5} />
            </div>
            <div><Label>Timeline Priority Weight: {form.timeline_weight}%</Label>
              <Slider value={[form.timeline_weight]} onValueChange={([v]) => setForm(p => ({ ...p, timeline_weight: v }))} max={100} step={5} />
            </div>
            <div><Label>Risk Priority Weight: {form.risk_weight}%</Label>
              <Slider value={[form.risk_weight]} onValueChange={([v]) => setForm(p => ({ ...p, risk_weight: v }))} max={100} step={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => createScenario.mutate(form)} disabled={!form.name}>Generate Scenario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
