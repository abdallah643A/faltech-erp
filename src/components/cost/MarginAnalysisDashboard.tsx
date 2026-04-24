import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Area, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Percent } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

export function MarginAnalysisDashboard({ projects }: { projects: any[] }) {
  const [period, setPeriod] = useState('monthly');
  const [groupBy, setGroupBy] = useState('project');

  // Project-level margin data
  const projectMargins = useMemo(() => {
    return projects.map(p => {
      const revenue = (p.budget || 100000) * 1.15;
      const directCost = p.actual_cost || (p.budget || 100000) * 0.80;
      const overhead = revenue * 0.075;
      const gross = revenue - directCost;
      const operating = gross - overhead;
      const net = operating * 0.85; // tax
      return {
        id: p.id,
        name: p.name || 'Unnamed',
        type: p.project_type || 'General',
        client: p.client || 'Unknown',
        revenue: Math.round(revenue),
        directCost: Math.round(directCost),
        overhead: Math.round(overhead),
        grossProfit: Math.round(gross),
        operatingProfit: Math.round(operating),
        netProfit: Math.round(net),
        grossMargin: revenue > 0 ? Math.round((gross / revenue) * 1000) / 10 : 0,
        operatingMargin: revenue > 0 ? Math.round((operating / revenue) * 1000) / 10 : 0,
        netMargin: revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0,
        target: 20,
      };
    }).sort((a, b) => b.grossMargin - a.grossMargin);
  }, [projects]);

  // Margin trends
  const trendData = useMemo(() => {
    const periods = period === 'monthly'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Q1', 'Q2', 'Q3', 'Q4'];
    return periods.map((p, i) => ({
      period: p,
      grossMargin: 22 + Math.sin(i * 0.5) * 4 + Math.cos(i * 1.1) * 1,
      operatingMargin: 15 + Math.sin(i * 0.5) * 3 + Math.cos(i * 1.3) * 1,
      netMargin: 10 + Math.sin(i * 0.5) * 2 + Math.cos(i * 1.5) * 1,
      target: 20,
    }));
  }, [period]);

  const avgGross = projectMargins.length > 0 ? projectMargins.reduce((s, p) => s + p.grossMargin, 0) / projectMargins.length : 0;
  const avgOperating = projectMargins.length > 0 ? projectMargins.reduce((s, p) => s + p.operatingMargin, 0) / projectMargins.length : 0;
  const avgNet = projectMargins.length > 0 ? projectMargins.reduce((s, p) => s + p.netMargin, 0) / projectMargins.length : 0;
  const lowMargin = projectMargins.filter(p => p.grossMargin < 15);
  const totalRevenue = projectMargins.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = projectMargins.reduce((s, p) => s + p.netProfit, 0);

  // By type analysis
  const byType = useMemo(() => {
    const types = [...new Set(projectMargins.map(p => p.type))];
    return types.map(t => {
      const items = projectMargins.filter(p => p.type === t);
      return {
        type: t,
        count: items.length,
        avgGross: items.length > 0 ? Math.round(items.reduce((s, p) => s + p.grossMargin, 0) / items.length * 10) / 10 : 0,
        totalRevenue: items.reduce((s, p) => s + p.revenue, 0),
        totalProfit: items.reduce((s, p) => s + p.netProfit, 0),
      };
    });
  }, [projectMargins]);

  const exportCols = [
    { key: 'name', header: 'Project' }, { key: 'type', header: 'Type' },
    { key: 'revenue', header: 'Revenue' }, { key: 'directCost', header: 'Direct Cost' },
    { key: 'grossMargin', header: 'Gross Margin %' }, { key: 'operatingMargin', header: 'Operating Margin %' },
    { key: 'netMargin', header: 'Net Margin %' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Percent className="h-5 w-5 text-primary" /> Margin Analysis</h3>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <ExportImportButtons data={projectMargins} columns={exportCols} filename="MarginAnalysis" title="Margin Analysis" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Gross Margin</p>
          <p className="text-xl font-bold text-emerald-600">{avgGross.toFixed(1)}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Operating Margin</p>
          <p className="text-xl font-bold">{avgOperating.toFixed(1)}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Net Margin</p>
          <p className="text-xl font-bold">{avgNet.toFixed(1)}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold">{(totalRevenue / 1000000).toFixed(1)}M</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Profit</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{(totalProfit / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card className={lowMargin.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low Margin</p>
            <p className="text-xl font-bold text-destructive">{lowMargin.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Margin Trends</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
          <TabsTrigger value="alerts">Low Margin Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Margin Trend ({period})</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 40]} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend />
                  <Area dataKey="target" fill="hsl(var(--muted-foreground) / 0.1)" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Target" />
                  <Line dataKey="grossMargin" stroke="hsl(var(--primary))" strokeWidth={2} name="Gross Margin" dot={{ r: 3 }} />
                  <Line dataKey="operatingMargin" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Operating Margin" dot={{ r: 3 }} />
                  <Line dataKey="netMargin" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Net Margin" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Margin by Project</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectMargins.slice(0, 12)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 40]} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="grossMargin" name="Gross" radius={[0, 4, 4, 0]}>
                    {projectMargins.slice(0, 12).map((e, i) => (
                      <Cell key={i} fill={e.grossMargin < 15 ? 'hsl(var(--destructive))' : e.grossMargin < 20 ? 'hsl(var(--chart-3))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Type</TableHead><TableHead>Revenue</TableHead>
                <TableHead>Direct Cost</TableHead><TableHead>Gross %</TableHead><TableHead>Operating %</TableHead>
                <TableHead>Net %</TableHead><TableHead>vs Target</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {projectMargins.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                    <TableCell>{p.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{p.directCost.toLocaleString()}</TableCell>
                    <TableCell className={p.grossMargin < 15 ? 'text-destructive font-bold' : 'text-emerald-600 font-bold'}>{p.grossMargin}%</TableCell>
                    <TableCell>{p.operatingMargin}%</TableCell>
                    <TableCell>{p.netMargin}%</TableCell>
                    <TableCell>
                      {p.grossMargin >= p.target
                        ? <Badge className="bg-emerald-500/10 text-emerald-600"><TrendingUp className="h-3 w-3 mr-1" /> Above</Badge>
                        : <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" /> Below</Badge>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="types">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Gross Margin by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="avgGross" fill="hsl(var(--primary))" name="Avg Gross Margin" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead><TableHead>Projects</TableHead><TableHead>Avg Margin</TableHead>
                    <TableHead>Revenue</TableHead><TableHead>Profit</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {byType.map(t => (
                      <TableRow key={t.type}>
                        <TableCell className="font-medium">{t.type}</TableCell>
                        <TableCell>{t.count}</TableCell>
                        <TableCell className={t.avgGross < 15 ? 'text-destructive font-bold' : 'text-emerald-600 font-bold'}>{t.avgGross}%</TableCell>
                        <TableCell>{(t.totalRevenue / 1000).toFixed(0)}K</TableCell>
                        <TableCell>{(t.totalProfit / 1000).toFixed(0)}K</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Low Margin Projects (Below 15%)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lowMargin.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">All projects are above the margin threshold 🎉</p>
              ) : lowMargin.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">Revenue: {p.revenue.toLocaleString()} SAR · Type: {p.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-destructive">{p.grossMargin}%</p>
                    <p className="text-xs text-muted-foreground">Target: {p.target}%</p>
                  </div>
                </div>
              ))}
              {lowMargin.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="text-sm font-medium mb-2">💡 Recommendations</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Review direct cost structure for overruns on low-margin projects</li>
                      <li>• Consider renegotiating subcontractor rates for underperforming contracts</li>
                      <li>• Evaluate overhead allocation methodology for cost-heavy projects</li>
                      <li>• Implement change order pricing to recover unexpected costs</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
