import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line, Area } from 'recharts';
import { Users, Zap, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface Resource {
  id: string; name: string; role: string; skill: string; rate: number;
  availability: number; utilization: number; projects: string[]; costPerDay: number;
}

export function ResourceCostOptimizer({ projects }: { projects: any[] }) {
  const [optimizeFor, setOptimizeFor] = useState<'cost' | 'time' | 'balanced'>('balanced');
  const [maxOverallocation, setMaxOverallocation] = useState([10]);

  const resources: Resource[] = useMemo(() => {
    const roles = ['Project Engineer', 'Site Supervisor', 'Electrician', 'Plumber', 'Welder', 'Carpenter', 'Heavy Equip Operator', 'Safety Officer', 'QC Inspector', 'Surveyor'];
    const skills = ['Senior', 'Mid-Level', 'Junior'];
    return roles.map((role, i) => {
      const skill = skills[i % 3];
      const rate = skill === 'Senior' ? 350 + (i * 17) % 150 : skill === 'Mid-Level' ? 200 + (i * 13) % 100 : 120 + (i * 11) % 80;
      const util = 60 + (i * 7) % 35;
      return {
        id: String(i), name: `R-${(i + 1).toString().padStart(3, '0')}`, role, skill,
        rate: Math.round(rate), availability: Math.round(85 + (i * 5) % 15),
        utilization: Math.round(util), projects: projects.slice(0, 1 + (i % 3)).map(p => p.name || 'Project'),
        costPerDay: Math.round(rate * 8),
      };
    });
  }, [projects]);

  // Leveling results
  const levelingResults = useMemo(() => {
    const factor = optimizeFor === 'cost' ? 0.85 : optimizeFor === 'time' ? 1.1 : 0.95;
    return resources.map(r => {
      const currentCost = r.costPerDay * (r.utilization / 100) * 22;
      const optimizedUtil = Math.min(r.utilization * factor + maxOverallocation[0] * 0.3, 100);
      const optimizedCost = r.costPerDay * (optimizedUtil / 100) * 22;
      const savings = currentCost - optimizedCost;
      return {
        ...r, currentMonthlyCost: Math.round(currentCost), optimizedUtil: Math.round(optimizedUtil),
        optimizedMonthlyCost: Math.round(optimizedCost), savings: Math.round(savings),
        savingsPct: currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0,
        overallocated: optimizedUtil > 90 + maxOverallocation[0],
      };
    });
  }, [resources, optimizeFor, maxOverallocation]);

  const totalCurrentCost = levelingResults.reduce((s, r) => s + r.currentMonthlyCost, 0);
  const totalOptimizedCost = levelingResults.reduce((s, r) => s + r.optimizedMonthlyCost, 0);
  const totalSavings = totalCurrentCost - totalOptimizedCost;

  const utilChart = levelingResults.map(r => ({ name: r.role.substring(0, 10), current: r.utilization, optimized: r.optimizedUtil }));

  const allocationByProject = useMemo(() => {
    return projects.slice(0, 6).map(p => {
      const allocated = Math.round(3 + (i * 7) % 8);
      const cost = allocated * 250 * 22;
      return { name: (p.name || 'Project').substring(0, 12), resources: allocated, cost: Math.round(cost / 1000) };
    });
  }, [projects]);

  const scenarioComparison = useMemo(() => [
    { scenario: 'Current', totalCost: Math.round(totalCurrentCost / 1000), utilization: Math.round(resources.reduce((s, r) => s + r.utilization, 0) / resources.length), headcount: resources.length },
    { scenario: 'Cost Min', totalCost: Math.round(totalCurrentCost * 0.82 / 1000), utilization: Math.round(resources.reduce((s, r) => s + r.utilization, 0) / resources.length * 0.88), headcount: resources.length - 2 },
    { scenario: 'Time Min', totalCost: Math.round(totalCurrentCost * 1.05 / 1000), utilization: Math.round(Math.min(resources.reduce((s, r) => s + r.utilization, 0) / resources.length * 1.12, 95)), headcount: resources.length + 1 },
    { scenario: 'Balanced', totalCost: Math.round(totalCurrentCost * 0.93 / 1000), utilization: Math.round(resources.reduce((s, r) => s + r.utilization, 0) / resources.length * 0.97), headcount: resources.length },
  ], [totalCurrentCost, resources]);

  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Resource Cost Optimizer</h2>
        </div>
        <div className="flex items-center gap-3">
          <Select value={optimizeFor} onValueChange={(v: any) => setOptimizeFor(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">Minimize Cost</SelectItem>
              <SelectItem value="time">Minimize Time</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Max Overallocation: {maxOverallocation[0]}%</Label>
            <Slider value={maxOverallocation} onValueChange={setMaxOverallocation} min={0} max={30} step={5} className="w-24" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Current Monthly Cost</div>
          <div className="text-xl font-bold text-foreground">{fmt(totalCurrentCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Optimized Cost</div>
          <div className="text-xl font-bold text-chart-2">{fmt(totalOptimizedCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Monthly Savings</div>
          <div className={`text-xl font-bold ${totalSavings > 0 ? 'text-chart-2' : 'text-destructive'}`}>{fmt(Math.abs(totalSavings))}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Resources</div>
          <div className="text-xl font-bold text-primary">{resources.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Utilization Comparison */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Utilization: Current vs Optimized</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 110]} className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="current" name="Current %" fill="hsl(var(--chart-4))" barSize={10} radius={[0, 4, 4, 0]} />
                <Bar dataKey="optimized" name="Optimized %" fill="hsl(var(--chart-2))" barSize={10} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scenario Comparison */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Scenario Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={scenarioComparison}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="scenario" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="totalCost" name="Cost ($K)" fill="hsl(var(--primary))" barSize={30} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="utilization" name="Utilization %" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resource Table */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Resource Leveling Results</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Rate/hr</TableHead>
                <TableHead>Current Util</TableHead>
                <TableHead>Optimized</TableHead>
                <TableHead>Current Cost</TableHead>
                <TableHead>Optimized Cost</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levelingResults.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.role}</TableCell>
                  <TableCell><Badge variant="outline">{r.skill}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.rate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1"><Progress value={r.utilization} className="h-2 w-12" /><span className="text-xs">{r.utilization}%</span></div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1"><Progress value={r.optimizedUtil} className="h-2 w-12" /><span className="text-xs">{r.optimizedUtil}%</span></div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fmt(r.currentMonthlyCost)}</TableCell>
                  <TableCell className="font-mono text-xs text-chart-2">{fmt(r.optimizedMonthlyCost)}</TableCell>
                  <TableCell className={`font-mono text-xs font-bold ${r.savings > 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {r.savings > 0 ? '+' : ''}{fmt(r.savings)}
                  </TableCell>
                  <TableCell>
                    {r.overallocated ? <Badge variant="destructive">Over</Badge> : <Badge variant="default">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
