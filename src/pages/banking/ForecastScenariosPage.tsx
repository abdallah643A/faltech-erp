import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Lock, GitBranch, Layers } from 'lucide-react';
import { useForecastScenarios, useForecastLines, useCreateScenario, useLockScenario } from '@/hooks/useBankTreasury';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';

export default function ForecastScenariosPage() {
  const { data: scenarios = [] } = useForecastScenarios();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: lines = [] } = useForecastLines(selectedId || undefined);
  const create = useCreateScenario();
  const lock = useLockScenario();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    scenario_name: '', scenario_type: 'base', horizon_weeks: 13,
    dso_days: 45, dpo_days: 30, collection_rate: 95, growth_rate: 0, notes: '',
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);
  const selectedScenario = scenarios.find((s: any) => s.id === selectedId);

  const chartData = lines.map((l: any) => ({
    period: l.period_label || l.period_start,
    forecast_in: Number(l.forecast_inflow),
    forecast_out: Number(l.forecast_outflow),
    actual_in: Number(l.actual_inflow),
    actual_out: Number(l.actual_outflow),
  }));

  const handleCreate = async () => {
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ scenario_name: '', scenario_type: 'base', horizon_weeks: 13, dso_days: 45, dpo_days: 30, collection_rate: 95, growth_rate: 0, notes: '' });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-primary"/>Forecast Scenarios</h1>
          <p className="text-sm text-muted-foreground">Versioned base/best/worst cash flow forecasts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2"/>New Scenario</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Forecast Scenario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Scenario Name</Label><Input value={form.scenario_name} onChange={e => setForm({ ...form, scenario_name: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.scenario_type} onValueChange={v => setForm({ ...form, scenario_type: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="best">Best Case</SelectItem>
                    <SelectItem value="worst">Worst Case</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Horizon (weeks)</Label><Input type="number" value={form.horizon_weeks} onChange={e => setForm({ ...form, horizon_weeks: Number(e.target.value) })}/></div>
                <div><Label>Collection Rate %</Label><Input type="number" value={form.collection_rate} onChange={e => setForm({ ...form, collection_rate: Number(e.target.value) })}/></div>
                <div><Label>DSO (days)</Label><Input type="number" value={form.dso_days} onChange={e => setForm({ ...form, dso_days: Number(e.target.value) })}/></div>
                <div><Label>DPO (days)</Label><Input type="number" value={form.dpo_days} onChange={e => setForm({ ...form, dpo_days: Number(e.target.value) })}/></div>
                <div><Label>Growth %</Label><Input type="number" value={form.growth_rate} onChange={e => setForm({ ...form, growth_rate: Number(e.target.value) })}/></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!form.scenario_name || create.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4"/>Scenarios ({scenarios.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {scenarios.length === 0 && <p className="text-sm text-muted-foreground">No scenarios yet.</p>}
            {scenarios.map((s: any) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${selectedId === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{s.scenario_name}</span>
                  <Badge variant={s.status === 'locked' ? 'default' : 'outline'} className="text-[10px]">{s.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{s.scenario_type}</Badge>
                  <span>{s.horizon_weeks}w</span>
                  <span>v{s.version}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{selectedScenario?.scenario_name || 'Select a scenario'}</CardTitle>
              {selectedScenario && selectedScenario.status !== 'locked' && (
                <Button size="sm" variant="outline" onClick={() => lock.mutate(selectedScenario.id)}>
                  <Lock className="h-3 w-3 mr-1"/>Lock Baseline
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedScenario ? <p className="text-sm text-muted-foreground">Select a scenario to view forecast.</p> :
              chartData.length === 0 ? <EmptyChartState message="No forecast lines added yet" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                  <XAxis dataKey="period" tick={{ fontSize: 10 }}/>
                  <YAxis tick={{ fontSize: 10 }}/>
                  <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`}/>
                  <Legend/>
                  <Area type="monotone" dataKey="forecast_in" name="Forecast In" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3}/>
                  <Area type="monotone" dataKey="forecast_out" name="Forecast Out" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3}/>
                  <Area type="monotone" dataKey="actual_in" name="Actual In" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2}/>
                  <Area type="monotone" dataKey="actual_out" name="Actual Out" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
            {selectedScenario && (
              <div className="grid grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-2 rounded bg-muted/50"><p className="text-muted-foreground">DSO</p><p className="font-bold">{selectedScenario.dso_days}d</p></div>
                <div className="p-2 rounded bg-muted/50"><p className="text-muted-foreground">DPO</p><p className="font-bold">{selectedScenario.dpo_days}d</p></div>
                <div className="p-2 rounded bg-muted/50"><p className="text-muted-foreground">Collection</p><p className="font-bold">{selectedScenario.collection_rate}%</p></div>
                <div className="p-2 rounded bg-muted/50"><p className="text-muted-foreground">Growth</p><p className="font-bold">{selectedScenario.growth_rate}%</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
