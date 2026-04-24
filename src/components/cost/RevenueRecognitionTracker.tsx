import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Area } from 'recharts';
import { DollarSign, FileText, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

export function RevenueRecognitionTracker({ projects }: { projects: any[] }) {
  const [method, setMethod] = useState<string>('percent_complete');
  const [tab, setTab] = useState('overview');

  const projectRevenue = useMemo(() => {
    return projects.map(p => {
      const contractValue = (p.budget || 100000) * 1.15;
      const pctComplete = (p.percent_complete || 50) / 100;
      const costIncurred = p.actual_cost || contractValue * pctComplete * 0.85;
      const totalEstCost = contractValue * 0.85;
      const inputPct = totalEstCost > 0 ? costIncurred / totalEstCost : 0;
      const effectivePct = method === 'percent_complete' ? inputPct : Math.floor(pctComplete * 4) / 4; // milestone snaps to 25%
      const revenueRecognized = contractValue * Math.min(effectivePct, 1);
      const billed = revenueRecognized * 0.92;
      const unbilled = revenueRecognized - billed;
      const deferred = billed - revenueRecognized > 0 ? billed - revenueRecognized : 0;
      const changeOrders = contractValue * 0.04;
      return {
        id: p.id, name: p.name || 'Unnamed',
        contractValue: Math.round(contractValue),
        pctComplete: Math.round(effectivePct * 100),
        costIncurred: Math.round(costIncurred),
        totalEstCost: Math.round(totalEstCost),
        revenueRecognized: Math.round(revenueRecognized),
        billed: Math.round(billed),
        unbilled: Math.round(Math.max(unbilled, 0)),
        deferred: Math.round(deferred),
        changeOrderRevenue: Math.round(changeOrders),
        remainingRevenue: Math.round(contractValue - revenueRecognized),
      };
    });
  }, [projects, method]);

  const totals = useMemo(() => ({
    contract: projectRevenue.reduce((s, p) => s + p.contractValue, 0),
    recognized: projectRevenue.reduce((s, p) => s + p.revenueRecognized, 0),
    billed: projectRevenue.reduce((s, p) => s + p.billed, 0),
    unbilled: projectRevenue.reduce((s, p) => s + p.unbilled, 0),
    deferred: projectRevenue.reduce((s, p) => s + p.deferred, 0),
    changeOrders: projectRevenue.reduce((s, p) => s + p.changeOrderRevenue, 0),
  }), [projectRevenue]);

  // Timeline data
  const timelineData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let cumRecognized = 0, cumBilled = 0;
    return months.map((m, i) => {
      const monthRev = (totals.recognized / 12) * (0.7 + Math.sin(i * 0.5) * 0.3);
      const monthBill = monthRev * (0.8 + Math.sin(i * 0.7) * 0.15);
      cumRecognized += monthRev;
      cumBilled += monthBill;
      return {
        month: m,
        recognized: Math.round(monthRev / 1000),
        billed: Math.round(monthBill / 1000),
        cumRecognized: Math.round(cumRecognized / 1000),
        cumBilled: Math.round(cumBilled / 1000),
      };
    });
  }, [totals]);

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Revenue Recognition</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent_complete">% Complete (Input Method)</SelectItem>
              <SelectItem value="milestone">Milestone-Based</SelectItem>
            </SelectContent>
          </Select>
          <ExportImportButtons
            data={projectRevenue}
            columns={[
              { key: 'name', header: 'Project', width: 20 },
              { key: 'contractValue', header: 'Contract', width: 15 },
              { key: 'revenueRecognized', header: 'Recognized', width: 15 },
              { key: 'billed', header: 'Billed', width: 15 },
              { key: 'unbilled', header: 'Unbilled', width: 15 },
            ]}
            filename="Revenue_Recognition"
            title="Revenue Recognition"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Contract</div>
          <div className="text-lg font-bold text-foreground">{fmt(totals.contract)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Recognized</div>
          <div className="text-lg font-bold text-primary">{fmt(totals.recognized)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Billed</div>
          <div className="text-lg font-bold text-chart-2">{fmt(totals.billed)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Unbilled</div>
          <div className="text-lg font-bold text-chart-4">{fmt(totals.unbilled)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Deferred</div>
          <div className="text-lg font-bold text-chart-5">{fmt(totals.deferred)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Change Orders</div>
          <div className="text-lg font-bold text-accent-foreground">{fmt(totals.changeOrders)}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">By Project</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>% Complete</TableHead>
                    <TableHead>Recognized</TableHead>
                    <TableHead>Billed</TableHead>
                    <TableHead>Unbilled</TableHead>
                    <TableHead>Change Orders</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectRevenue.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono">{fmt(p.contractValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.pctComplete} className="h-2 w-16" />
                          <span className="text-xs">{p.pctComplete}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-primary">{fmt(p.revenueRecognized)}</TableCell>
                      <TableCell className="font-mono text-chart-2">{fmt(p.billed)}</TableCell>
                      <TableCell className="font-mono text-chart-4">{fmt(p.unbilled)}</TableCell>
                      <TableCell className="font-mono">{fmt(p.changeOrderRevenue)}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{fmt(p.remainingRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Revenue Recognition Timeline</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="recognized" name="Recognized ($K)" fill="hsl(var(--primary))" barSize={20} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="billed" name="Billed ($K)" fill="hsl(var(--chart-2))" barSize={20} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="cumRecognized" name="Cum. Recognized ($K)" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Revenue Reconciliation</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectRevenue.map(p => {
                  const diff = p.billed - p.revenueRecognized;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Recognized: {fmt(p.revenueRecognized)} | Billed: {fmt(p.billed)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${diff > 0 ? 'text-chart-4' : diff < 0 ? 'text-destructive' : 'text-chart-2'}`}>
                          {diff > 0 ? '+' : ''}{fmt(Math.abs(diff))}
                        </div>
                        <Badge variant={Math.abs(diff) < 1000 ? 'default' : 'secondary'}>
                          {diff > 0 ? 'Over-billed' : diff < 0 ? 'Under-billed' : 'Balanced'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
