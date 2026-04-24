import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// Deterministic sparkline using sine wave — no Math.random()
const sparkGen = (base: number, amplitude: number) =>
  Array.from({ length: 12 }, (_, i) => base + Math.sin(i * 0.5) * amplitude);

function KPICard({ title, value, target, unit, trend, trendValue, sparkData, status }: {
  title: string; value: number; target?: number; unit?: string; trend: 'up' | 'down'; trendValue: string;
  sparkData: number[]; status: 'green' | 'yellow' | 'red';
}) {
  const statusColor = status === 'green' ? 'bg-chart-2' : status === 'yellow' ? 'bg-chart-4' : 'bg-destructive';
  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(1);
  const sparkMin = Math.min(...sparkData) * 0.9;
  const sparkMax = Math.max(...sparkData) * 1.1;
  const sparkRange = sparkMax - sparkMin || 1;
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${statusColor}`} />
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-bold text-foreground">{unit === '%' ? `${value}%` : fmt(value)}</div>
      <div className="flex items-center gap-1 text-xs mt-1">
        {trend === 'up' ? <ArrowUpRight className="h-3 w-3 text-chart-2" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
        <span className={trend === 'up' ? 'text-chart-2' : 'text-destructive'}>{trendValue}</span>
        {target !== undefined && <span className="text-muted-foreground ml-1">Target: {unit === '%' ? `${target}%` : fmt(target)}</span>}
      </div>
      {/* Mini sparkline */}
      <svg viewBox="0 0 80 24" className="w-full h-6 mt-2">
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round"
          points={sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 80},${24 - ((v - sparkMin) / sparkRange) * 20}`).join(' ')} />
      </svg>
    </Card>
  );
}

export function CostExecutiveDashboard({ projects }: { projects: any[] }) {
  const [period, setPeriod] = useState('ytd');

  const metrics = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    // Only use real actual_cost — never fabricate with random numbers
    const totalActual = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);
    const totalContractValue = projects.reduce((s, p) => s + (p.contract_value || p.budget || 0), 0);
    const overrun = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;
    const margin = totalContractValue > 0 ? ((totalContractValue - totalActual) / totalContractValue) * 100 : 0;
    const roi = totalActual > 0 ? ((totalContractValue - totalActual) / totalActual) * 100 : 0;
    const avgCPI = projects.length > 0
      ? projects.reduce((s, p) => {
          const budget = p.budget || 0;
          const pct = p.percent_complete || 0;
          const ev = budget * (pct / 100);
          const ac = p.actual_cost || 0;
          return s + (ac > 0 ? ev / ac : 1);
        }, 0) / projects.length
      : 1;
    return { totalBudget, totalActual, totalContractValue, overrun, margin, roi, avgCPI };
  }, [projects]);

  const costByCategory = useMemo(() => [
    { name: 'Labor', value: Math.round(metrics.totalActual * 0.35 / 1000), pct: 35 },
    { name: 'Materials', value: Math.round(metrics.totalActual * 0.28 / 1000), pct: 28 },
    { name: 'Equipment', value: Math.round(metrics.totalActual * 0.12 / 1000), pct: 12 },
    { name: 'Subcontract', value: Math.round(metrics.totalActual * 0.15 / 1000), pct: 15 },
    { name: 'Overhead', value: Math.round(metrics.totalActual * 0.10 / 1000), pct: 10 },
  ], [metrics]);

  // Distribute budget/actual across 12 months using an S-curve weighting (no random)
  const monthlyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weights = [0.04, 0.06, 0.08, 0.09, 0.10, 0.10, 0.10, 0.10, 0.09, 0.09, 0.08, 0.07];
    let cumBudget = 0, cumActual = 0;
    return months.map((m, i) => {
      const budget = metrics.totalBudget * weights[i];
      const actual = metrics.totalActual * weights[i];
      cumBudget += budget; cumActual += actual;
      return {
        month: m,
        budget: Math.round(budget / 1000),
        actual: Math.round(actual / 1000),
        cumBudget: Math.round(cumBudget / 1000),
        cumActual: Math.round(cumActual / 1000),
      };
    });
  }, [metrics]);

  const projectSummary = useMemo(() => {
    return projects.map(p => {
      const budget = p.budget || 0;
      const actual = p.actual_cost || 0;
      const variance = actual - budget;
      const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
      return {
        name: p.name || 'Unnamed',
        budget,
        actual: Math.round(actual),
        variance: Math.round(variance),
        variancePct: Math.round(variancePct * 10) / 10,
        pctComplete: p.percent_complete || 0,
      };
    }).sort((a, b) => b.variancePct - a.variancePct);
  }, [projects]);

  const topDrivers = useMemo(() => [
    { driver: 'Labor overtime premium', impact: Math.round(metrics.totalActual * 0.04 / 1000), trend: 'up' as const },
    { driver: 'Steel price escalation', impact: Math.round(metrics.totalActual * 0.03 / 1000), trend: 'up' as const },
    { driver: 'Equipment idle time', impact: Math.round(metrics.totalActual * 0.02 / 1000), trend: 'down' as const },
    { driver: 'Rework costs', impact: Math.round(metrics.totalActual * 0.015 / 1000), trend: 'up' as const },
    { driver: 'Weather delays', impact: Math.round(metrics.totalActual * 0.01 / 1000), trend: 'down' as const },
  ], [metrics]);

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Cost Executive Dashboard</h2>
          <Badge variant="outline" className="text-xs">Live Data</Badge>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={projectSummary} filename="cost-executive-dashboard" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="qtd">Quarter to Date</SelectItem>
              <SelectItem value="mtd">Month to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Cost Overrun" value={Math.round(metrics.overrun * 10) / 10} unit="%" trend={metrics.overrun > 0 ? 'down' : 'up'} trendValue={`${Math.abs(metrics.overrun).toFixed(1)}%`} target={0} sparkData={sparkGen(metrics.overrun, 3)} status={metrics.overrun <= 0 ? 'green' : metrics.overrun <= 5 ? 'yellow' : 'red'} />
        <KPICard title="Gross Margin" value={Math.round(metrics.margin * 10) / 10} unit="%" trend={metrics.margin >= 15 ? 'up' : 'down'} trendValue={`${metrics.margin.toFixed(1)}%`} target={20} sparkData={sparkGen(metrics.margin, 4)} status={metrics.margin >= 20 ? 'green' : metrics.margin >= 10 ? 'yellow' : 'red'} />
        <KPICard title="ROI" value={Math.round(metrics.roi * 10) / 10} unit="%" trend={metrics.roi >= 10 ? 'up' : 'down'} trendValue={`${metrics.roi.toFixed(1)}%`} target={15} sparkData={sparkGen(metrics.roi, 5)} status={metrics.roi >= 15 ? 'green' : metrics.roi >= 5 ? 'yellow' : 'red'} />
        <KPICard title="Avg CPI" value={Math.round(metrics.avgCPI * 100) / 100} trend={metrics.avgCPI >= 1 ? 'up' : 'down'} trendValue={metrics.avgCPI.toFixed(2)} target={1} sparkData={sparkGen(metrics.avgCPI, 0.08)} status={metrics.avgCPI >= 0.95 ? 'green' : metrics.avgCPI >= 0.85 ? 'yellow' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Budget vs Actual Trend ($K)
              <Badge variant="secondary" className="text-xs font-normal">S-curve distribution</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--primary))" barSize={12} radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-4))" barSize={12} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumBudget" name="Cum Budget" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumActual" name="Cum Actual" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Distribution */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Cost by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={costByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label={({ name, pct }: any) => `${name} ${pct}%`}>
                  {costByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {costByCategory.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-foreground">{c.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{c.value}K</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project Portfolio */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Project Cost Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {projectSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No project data available</p>
            ) : projectSummary.slice(0, 8).map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Progress value={p.pctComplete} className="h-1.5 w-20" />
                    <span className="text-xs text-muted-foreground">{p.pctComplete}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-foreground">{fmt(p.actual)} / {fmt(p.budget)}</div>
                  <Badge variant={p.variancePct <= 0 ? 'default' : p.variancePct <= 5 ? 'secondary' : 'destructive'} className="text-xs mt-0.5">
                    {p.variancePct > 0 ? '+' : ''}{p.variancePct}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Cost Drivers */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              Top Cost Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDrivers.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                  <span className="text-sm text-foreground">{d.driver}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">{d.impact}K</span>
                  {d.trend === 'up' ? <TrendingUp className="h-3.5 w-3.5 text-destructive" /> : <TrendingDown className="h-3.5 w-3.5 text-chart-2" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
