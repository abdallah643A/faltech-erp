import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Beaker, Plus, Trash2, Save, Copy, BarChart3 } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { toast } from '@/hooks/use-toast';

interface Scenario {
  id: string;
  name: string;
  laborChange: number;
  materialChange: number;
  equipmentChange: number;
  overheadChange: number;
  revenueChange: number;
  durationChange: number;
}

const defaultScenario = (): Scenario => ({
  id: crypto.randomUUID(), name: 'New Scenario',
  laborChange: 0, materialChange: 0, equipmentChange: 0,
  overheadChange: 0, revenueChange: 0, durationChange: 0,
});

export function WhatIfScenarioAnalysis({ projects }: { projects: any[] }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { ...defaultScenario(), id: '1', name: 'Baseline', laborChange: 0, materialChange: 0, equipmentChange: 0, overheadChange: 0, revenueChange: 0, durationChange: 0 },
    { ...defaultScenario(), id: '2', name: 'Material Surge', laborChange: 0, materialChange: 15, equipmentChange: 5, overheadChange: 3, revenueChange: 0, durationChange: 5 },
    { ...defaultScenario(), id: '3', name: 'Optimistic', laborChange: -5, materialChange: -3, equipmentChange: -2, overheadChange: -5, revenueChange: 5, durationChange: -10 },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);

  const baseBudget = projects.reduce((s, p) => s + (p.budget || 100000), 0);
  const baseRevenue = baseBudget * 1.15;
  const baseCosts = { labor: baseBudget * 0.35, material: baseBudget * 0.25, equipment: baseBudget * 0.08, overhead: baseBudget * 0.07 };

  const results = useMemo(() => {
    return scenarios.map(s => {
      const labor = baseCosts.labor * (1 + s.laborChange / 100);
      const material = baseCosts.material * (1 + s.materialChange / 100);
      const equipment = baseCosts.equipment * (1 + s.equipmentChange / 100);
      const overhead = baseCosts.overhead * (1 + s.overheadChange / 100);
      const revenue = baseRevenue * (1 + s.revenueChange / 100);
      const totalCost = labor + material + equipment + overhead;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const durationDays = 365 * (1 + s.durationChange / 100);
      return {
        name: s.name, revenue: Math.round(revenue), totalCost: Math.round(totalCost),
        profit: Math.round(profit), margin: Math.round(margin * 10) / 10,
        labor: Math.round(labor), material: Math.round(material),
        equipment: Math.round(equipment), overhead: Math.round(overhead),
        durationDays: Math.round(durationDays),
      };
    });
  }, [scenarios, baseCosts, baseRevenue]);

  const comparisonData = results.map(r => ({
    name: r.name,
    Revenue: Math.round(r.revenue / 1000),
    Cost: Math.round(r.totalCost / 1000),
    Profit: Math.round(r.profit / 1000),
  }));

  const radarData = useMemo(() => {
    const metrics = ['Labor', 'Material', 'Equipment', 'Overhead', 'Revenue', 'Duration'];
    return metrics.map(m => {
      const row: any = { metric: m };
      scenarios.forEach((s, i) => {
        const key = m.toLowerCase() + 'Change';
        row[s.name] = 50 + (s as any)[key];
      });
      return row;
    });
  }, [scenarios]);

  const active = scenarios[activeIdx] || scenarios[0];

  const updateActive = (field: keyof Scenario, value: any) => {
    setScenarios(prev => prev.map((s, i) => i === activeIdx ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    const ns = defaultScenario();
    setScenarios(prev => [...prev, ns]);
    setActiveIdx(scenarios.length);
  };

  const removeScenario = (idx: number) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx >= scenarios.length - 1) setActiveIdx(Math.max(0, scenarios.length - 2));
  };

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">What-If Scenario Analysis</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addScenario}><Plus className="h-4 w-4 mr-1" />Add Scenario</Button>
          <ExportImportButtons data={results} columns={[
            { key: 'name', header: 'Scenario', width: 15 },
            { key: 'revenue', header: 'Revenue', width: 15 },
            { key: 'totalCost', header: 'Total Cost', width: 15 },
            { key: 'profit', header: 'Profit', width: 15 },
            { key: 'margin', header: 'Margin %', width: 10 },
          ]} filename="WhatIf_Scenarios" title="Scenarios" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Selector & Editor */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3"><CardTitle className="text-sm">Scenarios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {scenarios.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${i === activeIdx ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setActiveIdx(i)}>
                <div className="flex-1">
                  <Input value={s.name} className="h-7 text-xs border-0 p-0 bg-transparent" onClick={e => e.stopPropagation()}
                    onChange={e => { const v = e.target.value; setScenarios(prev => prev.map((sc, j) => j === i ? { ...sc, name: v } : sc)); }} />
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Margin: <span className={`font-mono font-bold ${results[i]?.margin >= 15 ? 'text-chart-2' : results[i]?.margin >= 5 ? 'text-chart-4' : 'text-destructive'}`}>{results[i]?.margin}%</span>
                  </div>
                </div>
                {scenarios.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); removeScenario(i); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            <div className="border-t border-border pt-3 space-y-3">
              <div>
                <Label className="text-xs">Labor Cost: {active.laborChange > 0 ? '+' : ''}{active.laborChange}%</Label>
                <Slider value={[active.laborChange]} onValueChange={v => updateActive('laborChange', v[0])} min={-30} max={30} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Material Cost: {active.materialChange > 0 ? '+' : ''}{active.materialChange}%</Label>
                <Slider value={[active.materialChange]} onValueChange={v => updateActive('materialChange', v[0])} min={-30} max={30} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Equipment Cost: {active.equipmentChange > 0 ? '+' : ''}{active.equipmentChange}%</Label>
                <Slider value={[active.equipmentChange]} onValueChange={v => updateActive('equipmentChange', v[0])} min={-30} max={30} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Overhead: {active.overheadChange > 0 ? '+' : ''}{active.overheadChange}%</Label>
                <Slider value={[active.overheadChange]} onValueChange={v => updateActive('overheadChange', v[0])} min={-30} max={30} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Revenue: {active.revenueChange > 0 ? '+' : ''}{active.revenueChange}%</Label>
                <Slider value={[active.revenueChange]} onValueChange={v => updateActive('revenueChange', v[0])} min={-20} max={20} step={1} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Duration: {active.durationChange > 0 ? '+' : ''}{active.durationChange}%</Label>
                <Slider value={[active.durationChange]} onValueChange={v => updateActive('durationChange', v[0])} min={-30} max={30} step={1} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Comparison Chart */}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Scenario Comparison ($K)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cost" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Duration (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i} className={i === activeIdx ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono">{fmt(r.revenue)}</TableCell>
                      <TableCell className="font-mono">{fmt(r.totalCost)}</TableCell>
                      <TableCell className={`font-mono font-bold ${r.profit >= 0 ? 'text-chart-2' : 'text-destructive'}`}>{fmt(r.profit)}</TableCell>
                      <TableCell>
                        <Badge variant={r.margin >= 15 ? 'default' : r.margin >= 5 ? 'secondary' : 'destructive'}>{r.margin}%</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{r.durationDays}d</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
