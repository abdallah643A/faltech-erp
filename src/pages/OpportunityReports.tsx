import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, PieChart, Users, Filter, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))'];

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function OpportunityReports() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('forecast');
  const { opportunities, isLoading } = useOpportunities();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let data = opportunities || [];
    if (dateFrom) data = data.filter(o => (o.expected_close || '') >= dateFrom);
    if (dateTo) data = data.filter(o => (o.expected_close || '') <= dateTo);
    return data;
  }, [opportunities, dateFrom, dateTo]);

  const openOpps = filtered.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage));
  const wonOpps = filtered.filter(o => o.stage === 'Closed Won');
  const lostOpps = filtered.filter(o => o.stage === 'Closed Lost');
  const myOpenOpps = openOpps.filter(o => o.owner_id === user?.id);
  const myClosedOpps = filtered.filter(o => ['Closed Won', 'Closed Lost'].includes(o.stage) && o.owner_id === user?.id);

  // Forecast data
  const forecastData = useMemo(() => {
    const monthMap: Record<string, { month: string; total: number; weighted: number }> = {};
    openOpps.forEach(o => {
      const month = (o.expected_close || '').substring(0, 7) || 'Unset';
      if (!monthMap[month]) monthMap[month] = { month, total: 0, weighted: 0 };
      monthMap[month].total += o.value;
      monthMap[month].weighted += o.value * (o.probability / 100);
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [openOpps]);

  // Stage analysis
  const stageData = useMemo(() => STAGES.map(s => ({
    stage: s, count: filtered.filter(o => o.stage === s).length,
    value: filtered.filter(o => o.stage === s).reduce((sum, o) => sum + o.value, 0),
  })), [filtered]);

  // Statistics
  const stats = useMemo(() => {
    const total = filtered.length;
    const totalValue = filtered.reduce((s, o) => s + o.value, 0);
    const avgValue = total ? totalValue / total : 0;
    const winRate = (wonOpps.length + lostOpps.length) > 0 ? (wonOpps.length / (wonOpps.length + lostOpps.length) * 100) : 0;
    const avgProb = total ? filtered.reduce((s, o) => s + o.probability, 0) / total : 0;
    return { total, totalValue, avgValue, winRate, avgProb };
  }, [filtered, wonOpps, lostOpps]);

  // Pipeline by stage for pie chart
  const pipelineData = stageData.filter(s => s.count > 0).map((s, i) => ({ ...s, fill: COLORS[i % COLORS.length] }));

  const DateFilters = () => (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-2"><Label className="text-sm">From:</Label><Input type="date" className="h-8 w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
      <div className="flex items-center gap-2"><Label className="text-sm">To:</Label><Input type="date" className="h-8 w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-foreground">Opportunities Reports</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/opportunities')}><div className="text-xs text-muted-foreground">Total Opportunities</div><div className="text-xl font-bold">{stats.total}</div></Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/opportunities')}><div className="text-xs text-muted-foreground">Total Value</div><div className="text-xl font-bold">{fmt(stats.totalValue)}</div></Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/opportunities')}><div className="text-xs text-muted-foreground">Avg Value</div><div className="text-xl font-bold">{fmt(stats.avgValue)}</div></Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/opportunities')}><div className="text-xs text-muted-foreground">Win Rate</div><div className="text-xl font-bold text-primary">{stats.winRate.toFixed(1)}%</div></Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/opportunities')}><div className="text-xs text-muted-foreground">Avg Probability</div><div className="text-xl font-bold">{stats.avgProb.toFixed(0)}%</div></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="forecast">Forecast Report</TabsTrigger>
          <TabsTrigger value="forecast-time">Forecast Over Time</TabsTrigger>
          <TabsTrigger value="statistics">Statistics Report</TabsTrigger>
          <TabsTrigger value="report">Opportunities Report</TabsTrigger>
          <TabsTrigger value="stage">Stage Analysis</TabsTrigger>
          <TabsTrigger value="won">Won Report</TabsTrigger>
          <TabsTrigger value="lost">Lost Report</TabsTrigger>
          <TabsTrigger value="my-open">My Open</TabsTrigger>
          <TabsTrigger value="my-closed">My Closed</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* FORECAST */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Opportunities Forecast Report</CardTitle></CardHeader>
            <CardContent>
              <DateFilters />
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="total" name="Total Value" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="weighted" name="Weighted Value" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
              <Table>
                <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total Pipeline</TableHead><TableHead className="text-right">Weighted Forecast</TableHead></TableRow></TableHeader>
                <TableBody>{forecastData.map((r, i) => (
                  <TableRow key={i}><TableCell>{r.month}</TableCell><TableCell className="text-right font-mono">{fmt(r.total)}</TableCell><TableCell className="text-right font-mono">{fmt(r.weighted)}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORECAST OVER TIME */}
        <TabsContent value="forecast-time">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Forecast Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} /><Legend />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="weighted" name="Weighted" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATISTICS */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Opportunities Statistics Report</CardTitle></CardHeader>
            <CardContent>
              <DateFilters />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-muted/30"><div className="text-sm text-muted-foreground">Open</div><div className="text-2xl font-bold">{openOpps.length}</div><div className="text-xs text-muted-foreground">{fmt(openOpps.reduce((s,o)=>s+o.value,0))}</div></Card>
                <Card className="p-4 bg-primary/10"><div className="text-sm text-muted-foreground">Won</div><div className="text-2xl font-bold text-primary">{wonOpps.length}</div><div className="text-xs text-muted-foreground">{fmt(wonOpps.reduce((s,o)=>s+o.value,0))}</div></Card>
                <Card className="p-4 bg-destructive/10"><div className="text-sm text-muted-foreground">Lost</div><div className="text-2xl font-bold text-destructive">{lostOpps.length}</div><div className="text-xs text-muted-foreground">{fmt(lostOpps.reduce((s,o)=>s+o.value,0))}</div></Card>
                <Card className="p-4"><div className="text-sm text-muted-foreground">Win Rate</div><div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div></Card>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stage" /><YAxis />
                  <Tooltip /><Legend />
                  <Bar dataKey="count" name="Count" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="value" name="Value" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPPORTUNITIES REPORT */}
        <TabsContent value="report">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Opportunities Report</CardTitle></CardHeader>
            <CardContent>
              <DateFilters />
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.name')}</TableHead><TableHead>Company</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Prob.</TableHead><TableHead>Expected Close</TableHead><TableHead>Owner</TableHead>
                </TableRow></TableHeader>
                <TableBody>{filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.company}</TableCell>
                    <TableCell><Badge variant="outline">{o.stage}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmt(o.value)}</TableCell>
                    <TableCell className="text-right">{o.probability}%</TableCell>
                    <TableCell className="text-xs">{o.expected_close}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.owner_name}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAGE ANALYSIS */}
        <TabsContent value="stage">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Stage Analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie data={pipelineData} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={100} label={({ stage, count }: any) => `${stage}: ${count}`}>
                      {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <Table>
                  <TableHeader><TableRow><TableHead>Stage</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">% of Total</TableHead></TableRow></TableHeader>
                  <TableBody>{stageData.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge style={{ backgroundColor: COLORS[i % COLORS.length], color: '#fff' }}>{s.stage}</Badge></TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(s.value)}</TableCell>
                      <TableCell className="text-right">{stats.total ? (s.count / stats.total * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WON */}
        <TabsContent value="won">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Won Opportunities Report ({wonOpps.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Close Date</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
                <TableBody>{wonOpps.map(o => (
                  <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.company}</TableCell><TableCell className="text-right font-mono">{fmt(o.value)}</TableCell><TableCell className="text-xs">{o.expected_close}</TableCell><TableCell className="text-xs">{o.owner_name}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
              {wonOpps.length > 0 && <div className="mt-3 text-sm font-bold text-primary">Total Won: {fmt(wonOpps.reduce((s,o)=>s+o.value,0))}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOST */}
        <TabsContent value="lost">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Lost Opportunities Report ({lostOpps.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Close Date</TableHead><TableHead>Owner</TableHead><TableHead>{t('common.notes')}</TableHead></TableRow></TableHeader>
                <TableBody>{lostOpps.map(o => (
                  <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.company}</TableCell><TableCell className="text-right font-mono">{fmt(o.value)}</TableCell><TableCell className="text-xs">{o.expected_close}</TableCell><TableCell className="text-xs">{o.owner_name}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{o.notes}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
              {lostOpps.length > 0 && <div className="mt-3 text-sm font-bold text-destructive">Total Lost: {fmt(lostOpps.reduce((s,o)=>s+o.value,0))}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MY OPEN */}
        <TabsContent value="my-open">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">My Open Opportunities ({myOpenOpps.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Company</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Prob.</TableHead><TableHead>Expected Close</TableHead></TableRow></TableHeader>
                <TableBody>{myOpenOpps.map(o => (
                  <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.company}</TableCell><TableCell><Badge variant="outline">{o.stage}</Badge></TableCell><TableCell className="text-right font-mono">{fmt(o.value)}</TableCell><TableCell className="text-right">{o.probability}%</TableCell><TableCell className="text-xs">{o.expected_close}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
              {myOpenOpps.length === 0 && <div className="text-center py-8 text-muted-foreground">No open opportunities assigned to you</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MY CLOSED */}
        <TabsContent value="my-closed">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">My Closed Opportunities ({myClosedOpps.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Company</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Expected Close</TableHead></TableRow></TableHeader>
                <TableBody>{myClosedOpps.map(o => (
                  <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.company}</TableCell><TableCell><Badge variant={o.stage === 'Closed Won' ? 'default' : 'destructive'}>{o.stage}</Badge></TableCell><TableCell className="text-right font-mono">{fmt(o.value)}</TableCell><TableCell className="text-xs">{o.expected_close}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Opportunities Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-4">
                {STAGES.filter(s => s !== 'Closed Lost').map((stage, i) => {
                  const stageOpps = filtered.filter(o => o.stage === stage);
                  const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
                  return (
                    <div key={stage} className="min-w-[200px] flex-1">
                      <div className="rounded-t-lg p-2 text-center text-sm font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{stage} ({stageOpps.length})</div>
                      <div className="border rounded-b-lg p-2 space-y-1 min-h-[100px] bg-muted/20">
                        <div className="text-xs text-muted-foreground text-center mb-2">Total: {fmt(stageValue)}</div>
                        {stageOpps.slice(0, 5).map(o => (
                          <div key={o.id} className="bg-background rounded p-2 border text-xs">
                            <div className="font-medium truncate">{o.name}</div>
                            <div className="text-muted-foreground">{o.company} • {fmt(o.value)}</div>
                          </div>
                        ))}
                        {stageOpps.length > 5 && <div className="text-xs text-center text-muted-foreground">+{stageOpps.length - 5} more</div>}
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
