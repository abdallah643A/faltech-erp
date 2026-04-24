import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useProjects } from '@/hooks/useProjects';
import { useEVM } from '@/hooks/useEVM';
import { useFinancialScenarios } from '@/hooks/useProjectControl';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, TrendingUp, Calculator, Layers, GitBranch } from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WhatIfAnalysis() {
  const { t } = useLanguage();
  const { projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { snapshots } = useEVM(selectedProjectId);
  const { scenarios, createScenario } = useFinancialScenarios(selectedProjectId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Live sliders for quick what-if
  const [costAdjust, setCostAdjust] = useState(0);
  const [scheduleAdjust, setScheduleAdjust] = useState(0);
  const [riskContingency, setRiskContingency] = useState(0);

  const snapshotData = snapshots.data || [];
  const scenariosData = scenarios.data || [];
  const latest = snapshotData[snapshotData.length - 1];
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const baseEAC = latest?.eac || selectedProject?.budget || 0;
  const baseBAC = latest?.bac || selectedProject?.budget || 0;

  // Generate 3 default scenarios + live adjustment
  const defaultScenarios = useMemo(() => {
    if (!baseEAC) return [];
    const liveAdjusted = baseEAC * (1 + costAdjust / 100) + (baseEAC * riskContingency / 100);
    return [
      { name: 'Optimistic', eac: baseEAC * 0.95, color: 'hsl(142 71% 45%)' },
      { name: 'Base Case', eac: baseEAC, color: 'hsl(var(--primary))' },
      { name: 'Pessimistic', eac: baseEAC * 1.15, color: 'hsl(0 84% 60%)' },
      { name: 'Your Scenario', eac: liveAdjusted, color: 'hsl(262 83% 58%)' },
    ];
  }, [baseEAC, costAdjust, riskContingency]);

  const scenarioComparison = defaultScenarios.map(s => ({
    scenario: s.name,
    EAC: Math.round(s.eac),
    'vs BAC': Math.round(s.eac - baseBAC),
    'Variance %': baseBAC > 0 ? Number(((s.eac - baseBAC) / baseBAC * 100).toFixed(1)) : 0,
  }));

  // Radar data
  const radarData = [
    { metric: 'Cost Risk', optimistic: 20, base: 50, pessimistic: 85, custom: Math.min(100, 50 + costAdjust) },
    { metric: 'Schedule Risk', optimistic: 15, base: 40, pessimistic: 75, custom: Math.min(100, 40 + scheduleAdjust * 2) },
    { metric: 'Contingency', optimistic: 90, base: 60, pessimistic: 30, custom: Math.max(0, 60 + riskContingency) },
    { metric: 'Confidence', optimistic: 95, base: 70, pessimistic: 35, custom: Math.max(0, 70 - costAdjust - scheduleAdjust) },
    { metric: 'Recovery', optimistic: 90, base: 60, pessimistic: 25, custom: Math.max(0, 60 - costAdjust) },
  ];

  // Cash flow forecast (6 months)
  const cashFlowForecast = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => format(addMonths(new Date(), i), 'MMM yy'));
    return months.map((m, i) => ({
      month: m,
      Planned: Math.round(baseBAC * ((i + 1) / 12)),
      Optimistic: Math.round(baseEAC * 0.95 * ((i + 1) / 12)),
      'Base Case': Math.round(baseEAC * ((i + 1) / 12)),
      Pessimistic: Math.round(baseEAC * 1.15 * ((i + 1) / 12)),
    }));
  }, [baseBAC, baseEAC]);

  const handleCreateScenario = (e: React.FormEvent<HTMLFormElement>) => {
  const { t } = useLanguage();

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createScenario.mutate({
      project_id: selectedProjectId,
      scenario_name: fd.get('scenario_name'),
      scenario_type: 'custom',
      cost_adjustment_percent: costAdjust,
      schedule_adjustment_days: scheduleAdjust,
      risk_contingency_percent: riskContingency,
      projected_total_cost: baseEAC * (1 + costAdjust / 100) + (baseEAC * riskContingency / 100),
      notes: fd.get('notes'),
    });
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">What-If Scenario Analysis</h1>
          <p className="text-sm text-muted-foreground">Model optimistic, base & pessimistic financial outcomes</p>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="py-16 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Select a Project</h3>
          <p className="text-muted-foreground">Choose a project to run financial what-if scenarios</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Interactive Sliders */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Live Scenario Adjustments</CardTitle>
                <CardDescription>Drag sliders to model different outcomes in real-time</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />Save Scenario
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Cost Adjustment</Label>
                    <Badge variant={costAdjust > 0 ? 'destructive' : costAdjust < 0 ? 'default' : 'secondary'}>
                      {costAdjust > 0 ? '+' : ''}{costAdjust}%
                    </Badge>
                  </div>
                  <Slider value={[costAdjust]} onValueChange={([v]) => setCostAdjust(v)} min={-20} max={30} step={1} />
                  <p className="text-xs text-muted-foreground">Increase/decrease projected costs</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Schedule Delay (days)</Label>
                    <Badge variant={scheduleAdjust > 0 ? 'destructive' : 'secondary'}>
                      {scheduleAdjust > 0 ? '+' : ''}{scheduleAdjust}d
                    </Badge>
                  </div>
                  <Slider value={[scheduleAdjust]} onValueChange={([v]) => setScheduleAdjust(v)} min={0} max={90} step={1} />
                  <p className="text-xs text-muted-foreground">Model schedule extension impact</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Risk Contingency</Label>
                    <Badge variant="secondary">{riskContingency}%</Badge>
                  </div>
                  <Slider value={[riskContingency]} onValueChange={([v]) => setRiskContingency(v)} min={0} max={25} step={1} />
                  <p className="text-xs text-muted-foreground">Additional contingency reserve %</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scenario EAC Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={scenarioComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="EAC" radius={[4, 4, 0, 0]}>
                      {defaultScenarios.map((s, i) => (
                        <rect key={i} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Scenario cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {defaultScenarios.map(s => (
                    <div key={s.name} className="border rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.name}</p>
                      <p className="text-lg font-bold">{(s.eac / 1e3).toFixed(0)}K</p>
                      <p className={`text-xs ${s.eac > baseBAC ? 'text-red-600' : 'text-emerald-600'}`}>
                        {s.eac > baseBAC ? '+' : ''}{((s.eac - baseBAC) / 1e3).toFixed(0)}K vs BAC
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risk Profile Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Optimistic" dataKey="optimistic" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.1} />
                    <Radar name="Base" dataKey="base" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                    <Radar name="Pessimistic" dataKey="pessimistic" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60%)" fillOpacity={0.1} />
                    <Radar name="Your Scenario" dataKey="custom" stroke="hsl(262 83% 58%)" fill="hsl(262 83% 58%)" fillOpacity={0.2} strokeWidth={2} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Forecast */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rolling Cash Flow Forecast (6 Months)</CardTitle>
              <CardDescription>Projected spend across scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cashFlowForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Planned" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} />
                  <Line type="monotone" dataKey="Optimistic" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Base Case" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="Pessimistic" stroke="hsl(0 84% 60%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Saved Scenarios */}
          {scenariosData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Saved Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scenariosData.map((s: any) => (
                    <div key={s.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold">{s.scenario_name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>Cost Adj: {s.cost_adjustment_percent > 0 ? '+' : ''}{s.cost_adjustment_percent}%</p>
                        <p>Schedule: +{s.schedule_adjustment_days}d</p>
                        <p>Contingency: {s.risk_contingency_percent}%</p>
                        <p className="font-bold text-foreground">Projected: {s.projected_total_cost?.toLocaleString()}</p>
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground mt-2">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Save Scenario Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Current Scenario</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateScenario} className="space-y-4">
            <div><Label>Scenario Name *</Label><Input name="scenario_name" required placeholder="e.g. Revised estimate Q3" /></div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-muted/50 rounded p-3">
                <p className="text-xs text-muted-foreground">Cost Adj</p>
                <p className="font-bold">{costAdjust > 0 ? '+' : ''}{costAdjust}%</p>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <p className="text-xs text-muted-foreground">Schedule</p>
                <p className="font-bold">+{scheduleAdjust}d</p>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <p className="text-xs text-muted-foreground">Contingency</p>
                <p className="font-bold">{riskContingency}%</p>
              </div>
            </div>
            <div className="bg-primary/10 rounded p-3 text-center">
              <p className="text-xs text-muted-foreground">Projected Total Cost</p>
              <p className="text-xl font-bold">
                {(baseEAC * (1 + costAdjust / 100) + baseEAC * riskContingency / 100).toLocaleString()}
              </p>
            </div>
            <div><Label>{t('common.notes')}</Label><Textarea name="notes" rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit">Save Scenario</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
