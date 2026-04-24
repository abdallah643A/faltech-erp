import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, ComposedChart, Area } from 'recharts';
import { TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

export function ProfitabilityForecasting({ projects }: { projects: any[] }) {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || '');
  const [costVariance, setCostVariance] = useState([0]);
  const [revenueVariance, setRevenueVariance] = useState([0]);
  const [riskFactor, setRiskFactor] = useState([10]);

  const project = projects.find(p => p.id === selectedProject) || projects[0];

  const scenarios = useMemo(() => {
    if (!project) return [];
    const bac = project.budget || 100000;
    const revenue = bac * 1.15;
    const pct = (project.percent_complete || 40) / 100;
    const actualCost = project.actual_cost || bac * pct * 0.9;

    const buildScenario = (label: string, costMult: number, revMult: number, risk: number) => {
      const finalCost = actualCost + (bac - actualCost * (1 / pct || 1)) * (1 - pct) * costMult;
      const finalRev = revenue * revMult;
      const riskAdj = finalCost * (risk / 100);
      const adjustedCost = finalCost + riskAdj;
      const profit = finalRev - adjustedCost;
      const margin = finalRev > 0 ? (profit / finalRev) * 100 : 0;
      return {
        scenario: label, revenue: Math.round(finalRev), cost: Math.round(adjustedCost),
        riskReserve: Math.round(riskAdj), profit: Math.round(profit), margin: Math.round(margin * 10) / 10,
      };
    };

    const cv = costVariance[0] / 100;
    const rv = revenueVariance[0] / 100;
    const rf = riskFactor[0];

    return [
      buildScenario('Best Case', 0.9 + cv, 1.05 + rv, rf * 0.5),
      buildScenario('Most Likely', 1.0 + cv, 1.0 + rv, rf),
      buildScenario('Worst Case', 1.15 + cv, 0.95 + rv, rf * 1.5),
      buildScenario('Custom', 1.0 + cv, 1.0 + rv, rf),
    ];
  }, [project, costVariance, revenueVariance, riskFactor]);

  // Forecast timeline
  const forecastTimeline = useMemo(() => {
    if (!project) return [];
    const months = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
    const bac = project.budget || 100000;
    return months.map((m, i) => {
      const pct = (i + 1) / 12;
      return {
        month: m,
        bestCase: Math.round(bac * 1.15 * pct * 1.05 - bac * pct * 0.9) / 1000,
        mostLikely: Math.round(bac * 1.15 * pct - bac * pct) / 1000,
        worstCase: Math.round(bac * 1.15 * pct * 0.95 - bac * pct * 1.15) / 1000,
      };
    });
  }, [project]);

  // Sensitivity
  const sensitivityData = useMemo(() => {
    const factors = [
      { factor: 'Labor Cost +10%', impact: -8.5 },
      { factor: 'Material Cost +15%', impact: -6.2 },
      { factor: 'Revenue -5%', impact: -5.0 },
      { factor: 'Schedule Delay 2mo', impact: -4.3 },
      { factor: 'Overhead +20%', impact: -2.8 },
      { factor: 'Change Orders +10%', impact: 3.5 },
      { factor: 'Efficiency +5%', impact: 2.1 },
    ];
    return factors.sort((a, b) => a.impact - b.impact);
  }, []);

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Profitability Forecasting</h2>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[250px] h-8 text-xs">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name || 'Unnamed'}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Scenario Controls */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Scenario Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-xs">Cost Variance: {costVariance[0] > 0 ? '+' : ''}{costVariance[0]}%</Label>
              <Slider value={costVariance} onValueChange={setCostVariance} min={-20} max={20} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Revenue Variance: {revenueVariance[0] > 0 ? '+' : ''}{revenueVariance[0]}%</Label>
              <Slider value={revenueVariance} onValueChange={setRevenueVariance} min={-15} max={15} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Risk Factor: {riskFactor[0]}%</Label>
              <Slider value={riskFactor} onValueChange={setRiskFactor} min={0} max={30} step={1} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {scenarios.map((s, i) => (
          <Card key={i} className={`p-4 ${i === 1 ? 'ring-2 ring-primary' : ''}`}>
            <div className="text-xs text-muted-foreground mb-1">{s.scenario}</div>
            <div className={`text-xl font-bold ${s.margin >= 15 ? 'text-chart-2' : s.margin >= 5 ? 'text-chart-4' : 'text-destructive'}`}>
              {s.margin}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Profit: {fmt(s.profit)} | Risk: {fmt(s.riskReserve)}
            </div>
            <Badge variant={s.margin >= 15 ? 'default' : s.margin >= 5 ? 'secondary' : 'destructive'} className="mt-2">
              {s.margin >= 15 ? 'Healthy' : s.margin >= 5 ? 'Moderate' : 'At Risk'}
            </Badge>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forecast Timeline */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Profit Forecast ($K)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={forecastTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="bestCase" name="Best Case" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="mostLikely" name="Most Likely" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="worstCase" name="Worst Case" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sensitivity Analysis */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Margin Sensitivity (Tornado)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sensitivityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[-10, 5]} className="text-xs" />
                <YAxis type="category" dataKey="factor" className="text-xs" width={130} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `${v}% margin impact`} />
                <Bar dataKey="impact" name="Margin Impact (%)" radius={[0, 4, 4, 0]}>
                  {sensitivityData.map((d, i) => (
                    <rect key={i} fill={d.impact >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-chart-4" />Profitability Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Negotiate bulk material pricing', impact: '+2.3% margin', priority: 'High' },
              { title: 'Optimize labor scheduling to reduce overtime', impact: '+1.8% margin', priority: 'High' },
              { title: 'Review subcontractor rates for competitive alternatives', impact: '+1.2% margin', priority: 'Medium' },
              { title: 'Accelerate billing cycle to improve cash position', impact: '+0.5% margin', priority: 'Low' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">{r.title}</div>
                  <Badge variant="secondary" className="mt-1">{r.priority}</Badge>
                </div>
                <div className="text-sm font-mono text-chart-2">{r.impact}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
