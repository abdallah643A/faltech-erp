import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCommercialControlTower } from '@/hooks/useCommercialControlTower';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign, TrendingDown, TrendingUp, AlertTriangle, Shield,
  FileText, BarChart3, Receipt, Banknote, ClipboardList, Target,
  ArrowDownRight, ArrowUpRight, Percent, Calendar, Users, Plus,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(142,71%,45%)', 'hsl(48,96%,53%)', 'hsl(0,84%,60%)', 'hsl(262,83%,58%)', 'hsl(199,89%,48%)'];
const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function StatusBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const color = value >= thresholds[1] ? 'bg-green-100 text-green-800' : value >= thresholds[0] ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return <Badge className={color}>{value.toFixed(2)}</Badge>;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'text-primary' }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommercialControlTower() {
  const { t } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [newAction, setNewAction] = useState({ title: '', priority: 'high', assignee: '', due_date: '', notes: '' });

  const data = useCommercialControlTower(selectedProjectId);

  const addAction = () => {
    if (!newAction.title) return;
    setActionItems(prev => [...prev, { ...newAction, id: Date.now(), status: 'open', created_at: new Date().toISOString() }]);
    setNewAction({ title: '', priority: 'high', assignee: '', due_date: '', notes: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Project Commercial Control Tower</h1>
          <p className="text-sm text-muted-foreground">Real-time commercial health monitoring across project portfolio</p>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v || null)}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select project..." /></SelectTrigger>
          <SelectContent>
            {data.projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProjectId ? (
        <PortfolioOverview projects={data.projects} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {[
              { v: 'overview', l: 'Overview', i: BarChart3 },
              { v: 'margin', l: 'Margin Erosion', i: TrendingDown },
              { v: 'billing', l: 'Billing Leakage', i: Receipt },
              { v: 'evm', l: 'Earned Value', i: TrendingUp },
              { v: 'retention', l: 'Retention Exposure', i: Shield },
              { v: 'variations', l: 'Variation Orders', i: FileText },
              { v: 'claims', l: 'Claims & Disputes', i: AlertTriangle },
              { v: 'subcontract', l: 'Subcontract Risk', i: Users },
              { v: 'cash', l: 'Cash Forecast', i: Banknote },
              { v: 'actions', l: 'Action Tracker', i: ClipboardList },
            ].map(tab => (
              <TabsTrigger key={tab.v} value={tab.v} className="text-xs gap-1">
                <tab.i className="h-3 w-3" />{tab.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"><OverviewTab data={data} /></TabsContent>
          <TabsContent value="margin"><MarginErosionTab data={data} /></TabsContent>
          <TabsContent value="billing"><BillingLeakageTab data={data} /></TabsContent>
          <TabsContent value="evm"><EarnedValueTab data={data} /></TabsContent>
          <TabsContent value="retention"><RetentionTab data={data} /></TabsContent>
          <TabsContent value="variations"><VariationOrdersTab data={data} /></TabsContent>
          <TabsContent value="claims"><ClaimsTab data={data} /></TabsContent>
          <TabsContent value="subcontract"><SubcontractRiskTab data={data} /></TabsContent>
          <TabsContent value="cash"><CashForecastTab data={data} /></TabsContent>
          <TabsContent value="actions">
            <ActionTrackerTab actions={actionItems} newAction={newAction} setNewAction={setNewAction} onAdd={addAction} setActions={setActionItems} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ── Portfolio Overview (no project selected) ── */
function PortfolioOverview({ projects }: { projects: any[] }) {
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress');
  const totalContract = projects.reduce((s, p) => s + (p.revised_contract_value || p.contract_value || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + (p.budgeted_cost || p.total_budget || 0), 0);
  const totalActual = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Projects" value={projects.length} subtitle={`${activeProjects.length} active`} icon={Target} />
        <KPICard title="Portfolio Value" value={`SAR ${fmt(totalContract)}`} icon={DollarSign} />
        <KPICard title="Total Budget" value={`SAR ${fmt(totalBudget)}`} icon={Banknote} />
        <KPICard title="Actual Cost" value={`SAR ${fmt(totalActual)}`} subtitle={totalBudget > 0 ? fmtPct(totalActual / totalBudget * 100) + ' of budget' : ''} icon={TrendingUp} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Portfolio Risk Ranking</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.slice(0, 20).map(p => {
                const budget = p.budgeted_cost || p.total_budget || 0;
                const actual = p.actual_cost || 0;
                const overBudget = budget > 0 && actual > budget;
                const risk = overBudget ? 'High' : (actual / Math.max(budget, 1)) > 0.85 ? 'Medium' : 'Low';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.project_number || p.code} - {p.name}</TableCell>
                    <TableCell className="text-right">{fmt(p.revised_contract_value || p.contract_value || 0)}</TableCell>
                    <TableCell className="text-right">{fmt(budget)}</TableCell>
                    <TableCell className="text-right">{fmt(actual)}</TableCell>
                    <TableCell className="text-right">{p.percent_complete || 0}%</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    <TableCell>
                      <Badge className={risk === 'High' ? 'bg-red-100 text-red-800' : risk === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                        {risk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 1: Overview ── */
function OverviewTab({ data }: { data: any }) {
  const costBreakdown = [
    { name: 'Actual Cost', value: data.actualCost },
    { name: 'Committed (Uninvoiced)', value: Math.max(0, data.committedTotal - data.invoicedTotal) },
    { name: 'Remaining Budget', value: Math.max(0, data.budgetedCost - data.actualCost - (data.committedTotal - data.invoicedTotal)) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Contract Value" value={`SAR ${fmt(data.contractValue)}`} icon={DollarSign} />
        <KPICard title="Budget" value={`SAR ${fmt(data.budgetedCost)}`} icon={Target} />
        <KPICard title="Actual Cost" value={`SAR ${fmt(data.actualCost)}`} icon={TrendingUp} />
        <KPICard title="Committed" value={`SAR ${fmt(data.committedTotal)}`} icon={Banknote} />
        <KPICard title="Forecast at Completion" value={`SAR ${fmt(data.forecastAtCompletion)}`} icon={BarChart3} color={data.forecastAtCompletion > data.budgetedCost ? 'text-red-600' : 'text-green-600'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Original Margin" value={fmtPct(data.marginOriginal)} icon={Percent} />
        <KPICard title="Forecast Margin" value={fmtPct(data.marginForecast)} icon={Percent} color={data.marginForecast < data.marginOriginal ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="SPI" value={data.spi.toFixed(2)} icon={TrendingUp} color={data.spi < 1 ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="CPI" value={data.cpi.toFixed(2)} icon={TrendingUp} color={data.cpi < 1 ? 'text-red-600' : 'text-green-600'} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={costBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Commercial Exceptions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.marginErosion > 2 && (
              <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Margin erosion of {fmtPct(data.marginErosion)} detected</span>
              </div>
            )}
            {data.billingLeakage > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-sm">
                <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Billing leakage: SAR {fmt(data.billingLeakage)} of certified progress not yet invoiced</span>
              </div>
            )}
            {data.retentionExposure > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-blue-50 border border-blue-200 text-sm">
                <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Retention exposure: SAR {fmt(data.retentionExposure)} held</span>
              </div>
            )}
            {data.pendingVOs.length > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-purple-50 border border-purple-200 text-sm">
                <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                <span>{data.pendingVOs.length} pending VOs worth SAR {fmt(data.totalPendingVOValue)}</span>
              </div>
            )}
            {data.spi > 0 && data.spi < 0.9 && (
              <div className="flex items-center gap-2 p-2 rounded bg-orange-50 border border-orange-200 text-sm">
                <TrendingDown className="h-4 w-4 text-orange-600 shrink-0" />
                <span>Schedule behind: SPI = {data.spi.toFixed(2)}</span>
              </div>
            )}
            {data.cpi > 0 && data.cpi < 0.9 && (
              <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200 text-sm">
                <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />
                <span>Cost overrun: CPI = {data.cpi.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Tab 2: Margin Erosion ── */
function MarginErosionTab({ data }: { data: any }) {
  const drivers = [
    { driver: 'Original Budget Overrun', impact: Math.max(0, data.actualCost - data.budgetedCost), pct: data.budgetedCost > 0 ? Math.max(0, (data.actualCost - data.budgetedCost) / data.contractValue * 100) : 0 },
    { driver: 'Unapproved Cost from VOs', impact: data.totalPendingVOValue, pct: data.contractValue > 0 ? data.totalPendingVOValue / data.contractValue * 100 : 0 },
    { driver: 'Committed but Uninvoiced', impact: Math.max(0, data.committedTotal - data.invoicedTotal), pct: data.contractValue > 0 ? Math.max(0, (data.committedTotal - data.invoicedTotal)) / data.contractValue * 100 : 0 },
  ].filter(d => d.impact > 0);

  const marginTrend = data.evmSnapshots.map((s: any) => ({
    date: s.snapshot_date,
    cpi: s.cpi,
    margin: data.contractValue > 0 ? ((data.contractValue - (s.eac || data.forecastAtCompletion)) / data.contractValue * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Original Margin" value={fmtPct(data.marginOriginal)} icon={Percent} />
        <KPICard title="Current Forecast Margin" value={fmtPct(data.marginForecast)} icon={Percent} color={data.marginForecast < 5 ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="Margin Erosion" value={fmtPct(data.marginErosion)} icon={TrendingDown} color="text-red-600" />
        <KPICard title="Margin at Completion" value={`SAR ${fmt(data.contractValue + data.totalApprovedVOValue - data.forecastAtCompletion)}`} icon={DollarSign} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Erosion Drivers</CardTitle></CardHeader>
          <CardContent>
            {drivers.length === 0 ? <p className="text-sm text-muted-foreground">No margin erosion detected</p> : (
              <div className="space-y-3">
                {drivers.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{d.driver}</span><span className="font-medium text-red-600">SAR {fmt(d.impact)}</span></div>
                    <Progress value={Math.min(d.pct, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground">{fmtPct(d.pct)} of contract value</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Margin Trend</CardTitle></CardHeader>
          <CardContent>
            {marginTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={marginTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="margin" stroke="hsl(var(--primary))" name="Margin %" />
                  <Line type="monotone" dataKey="cpi" stroke="hsl(142,71%,45%)" name="CPI" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No EVM snapshots to show trend</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Tab 3: Billing Leakage ── */
function BillingLeakageTab({ data }: { data: any }) {
  const progressValue = data.contractValue * (data.project?.percent_complete || 0) / 100;
  const certifiedNotBilled = Math.max(0, data.totalCertified - data.totalBilled);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Progress Value" value={`SAR ${fmt(progressValue)}`} subtitle={`${data.project?.percent_complete || 0}% complete`} icon={TrendingUp} />
        <KPICard title="Total Billed" value={`SAR ${fmt(data.totalBilled)}`} icon={Receipt} />
        <KPICard title="Billing Leakage" value={`SAR ${fmt(data.billingLeakage)}`} icon={AlertTriangle} color={data.billingLeakage > 0 ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="Certified Not Billed" value={`SAR ${fmt(certifiedNotBilled)}`} icon={FileText} color={certifiedNotBilled > 0 ? 'text-amber-600' : ''} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">IPA / Billing History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IPA #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Gross Amount</TableHead>
                <TableHead className="text-right">Certified</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ipas.map((ipa: any) => (
                <TableRow key={ipa.id}>
                  <TableCell className="font-medium">{ipa.ipa_number || ipa.id.slice(0, 8)}</TableCell>
                  <TableCell>{ipa.period || '-'}</TableCell>
                  <TableCell className="text-right">{fmt(ipa.gross_amount || ipa.certified_amount || 0)}</TableCell>
                  <TableCell className="text-right">{fmt(ipa.certified_amount || 0)}</TableCell>
                  <TableCell className="text-right">{fmt(ipa.retention_amount || 0)}</TableCell>
                  <TableCell className="text-right">{fmt(ipa.net_amount || 0)}</TableCell>
                  <TableCell><Badge variant="outline">{ipa.status || 'draft'}</Badge></TableCell>
                </TableRow>
              ))}
              {data.ipas.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No IPAs found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 4: Earned Value ── */
function EarnedValueTab({ data }: { data: any }) {
  const evmChart = data.evmSnapshots.map((s: any) => ({
    date: s.snapshot_date,
    PV: s.pv, EV: s.ev, AC: s.ac,
  }));
  const spiCpiChart = data.evmSnapshots.map((s: any) => ({
    date: s.snapshot_date,
    SPI: s.spi, CPI: s.cpi,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KPICard title="BAC" value={`SAR ${fmt(data.budgetedCost)}`} icon={Target} />
        <KPICard title="EAC" value={`SAR ${fmt(data.eac)}`} icon={BarChart3} />
        <KPICard title="SPI" value={data.spi.toFixed(2)} icon={TrendingUp} color={data.spi < 1 ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="CPI" value={data.cpi.toFixed(2)} icon={TrendingUp} color={data.cpi < 1 ? 'text-red-600' : 'text-green-600'} />
        <KPICard title="SV" value={`SAR ${fmt((data.evmSnapshots.slice(-1)[0]?.sv || 0))}`} icon={TrendingDown} />
        <KPICard title="CV" value={`SAR ${fmt((data.evmSnapshots.slice(-1)[0]?.cv || 0))}`} icon={TrendingDown} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">PV / EV / AC Curves</CardTitle></CardHeader>
          <CardContent>
            {evmChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={evmChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                  <Legend />
                  <Area type="monotone" dataKey="PV" stroke="hsl(199,89%,48%)" fill="hsl(199,89%,48%)" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="EV" stroke="hsl(142,71%,45%)" fill="hsl(142,71%,45%)" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="AC" stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No EVM data available</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">SPI / CPI Trend</CardTitle></CardHeader>
          <CardContent>
            {spiCpiChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={spiCpiChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 2]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="SPI" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="CPI" stroke="hsl(142,71%,45%)" strokeWidth={2} />
                  <Line type="monotone" dataKey={() => 1} stroke="#999" strokeDasharray="5 5" name="Baseline" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No EVM data available</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Tab 5: Retention Exposure ── */
function RetentionTab({ data }: { data: any }) {
  const retPct = data.project?.retention_percentage || 10;
  const retentionCalendar = data.ipas.filter((i: any) => i.retention_amount > 0).map((i: any) => ({
    period: i.period || i.ipa_number || 'N/A',
    held: i.retention_amount || 0,
    released: i.retention_released || 0,
    balance: (i.retention_amount || 0) - (i.retention_released || 0),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Retention Rate" value={`${retPct}%`} icon={Percent} />
        <KPICard title="Total Retained" value={`SAR ${fmt(data.retentionHeld)}`} icon={Shield} />
        <KPICard title="Released" value={`SAR ${fmt(data.retentionReleased)}`} icon={DollarSign} />
        <KPICard title="Retention Receivable" value={`SAR ${fmt(data.retentionExposure)}`} icon={Banknote} color="text-amber-600" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Retention Release Schedule</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period / IPA</TableHead>
                <TableHead className="text-right">Held</TableHead>
                <TableHead className="text-right">Released</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retentionCalendar.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.period}</TableCell>
                  <TableCell className="text-right">{fmt(r.held)}</TableCell>
                  <TableCell className="text-right">{fmt(r.released)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(r.balance)}</TableCell>
                </TableRow>
              ))}
              {retentionCalendar.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No retention data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 6: Variation Orders ── */
function VariationOrdersTab({ data }: { data: any }) {
  const voChart = [
    { name: 'Approved', value: data.totalApprovedVOValue, count: data.approvedVOs.length },
    { name: 'Pending', value: data.totalPendingVOValue, count: data.pendingVOs.length },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total VOs" value={data.changeOrders.length} icon={FileText} />
        <KPICard title="Approved Value" value={`SAR ${fmt(data.totalApprovedVOValue)}`} icon={DollarSign} color="text-green-600" />
        <KPICard title="Pending Value" value={`SAR ${fmt(data.totalPendingVOValue)}`} icon={AlertTriangle} color="text-amber-600" />
        <KPICard title="Revised Contract" value={`SAR ${fmt(data.contractValue + data.totalApprovedVOValue)}`} icon={Target} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">VO Summary</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={voChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Variation Order Register</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CO #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.changeOrders.slice(0, 15).map((co: any) => (
                  <TableRow key={co.id}>
                    <TableCell className="font-medium">{co.co_number || co.id.slice(0, 8)}</TableCell>
                    <TableCell>{co.title}</TableCell>
                    <TableCell className="text-right">{fmt(co.cost_impact || 0)}</TableCell>
                    <TableCell>
                      <Badge className={co.status === 'approved' ? 'bg-green-100 text-green-800' : co.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                        {co.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Tab 7: Claims & Disputes ── */
function ClaimsTab({ data }: { data: any }) {
  const claims = data.changeRegister.filter((c: any) => c.change_type === 'claim' || c.change_type === 'dispute' || c.change_type === 'compensation');
  const totalClaimValue = claims.reduce((s: number, c: any) => s + (c.impact_cost || 0), 0);
  const openClaims = claims.filter((c: any) => c.status !== 'closed' && c.status !== 'rejected');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Claims" value={claims.length} icon={AlertTriangle} />
        <KPICard title="Open Claims" value={openClaims.length} icon={FileText} color={openClaims.length > 0 ? 'text-amber-600' : ''} />
        <KPICard title="Total Claim Value" value={`SAR ${fmt(totalClaimValue)}`} icon={DollarSign} />
        <KPICard title="Schedule Impact (Days)" value={claims.reduce((s: number, c: any) => s + (c.impact_days || 0), 0)} icon={Calendar} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Claims & Disputes Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cost Impact</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(claims.length > 0 ? claims : data.changeRegister).slice(0, 20).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.change_number}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell><Badge variant="outline">{c.change_type}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(c.impact_cost || 0)}</TableCell>
                  <TableCell className="text-right">{c.impact_days || 0}</TableCell>
                  <TableCell>
                    <Badge className={c.priority === 'critical' ? 'bg-red-100 text-red-800' : c.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}>
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {data.changeRegister.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No claims or disputes found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 8: Subcontract Risk ── */
function SubcontractRiskTab({ data }: { data: any }) {
  const subCommitments = data.commitments.filter((c: any) => c.type === 'subcontract' || c.type === 'po');
  const totalSubValue = subCommitments.reduce((s: number, c: any) => s + (c.committed_amount || 0), 0);
  const totalSubInvoiced = subCommitments.reduce((s: number, c: any) => s + (c.invoiced_amount || 0), 0);
  const totalSubRemaining = subCommitments.reduce((s: number, c: any) => s + (c.remaining_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Subcontracts" value={subCommitments.length} icon={Users} />
        <KPICard title="Total Committed" value={`SAR ${fmt(totalSubValue)}`} icon={DollarSign} />
        <KPICard title="Invoiced" value={`SAR ${fmt(totalSubInvoiced)}`} icon={Receipt} />
        <KPICard title="Outstanding Liability" value={`SAR ${fmt(totalSubRemaining)}`} icon={AlertTriangle} color={totalSubRemaining > 0 ? 'text-amber-600' : ''} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Subcontract Commitments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subCommitments.length > 0 ? subCommitments : data.commitments).slice(0, 20).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.ref_number || c.id.slice(0, 8)}</TableCell>
                  <TableCell>{c.vendor_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(c.committed_amount || 0)}</TableCell>
                  <TableCell className="text-right">{fmt(c.invoiced_amount || 0)}</TableCell>
                  <TableCell className="text-right">{fmt(c.remaining_amount || 0)}</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {data.commitments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No commitments found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 9: Cash Forecast ── */
function CashForecastTab({ data }: { data: any }) {
  const cashData = data.costForecasts.map((f: any) => ({
    period: f.period,
    bac: f.bac || 0,
    eac: f.eac || 0,
    etc: f.etc || 0,
    variance: f.variance || 0,
  }));

  const inflow = data.totalBilled;
  const outflow = data.actualCost;
  const netCash = inflow - outflow;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Cash Inflow (Billed)" value={`SAR ${fmt(inflow)}`} icon={ArrowUpRight} color="text-green-600" />
        <KPICard title="Cash Outflow (Actual)" value={`SAR ${fmt(outflow)}`} icon={ArrowDownRight} color="text-red-600" />
        <KPICard title="Net Cash Position" value={`SAR ${fmt(netCash)}`} icon={Banknote} color={netCash >= 0 ? 'text-green-600' : 'text-red-600'} />
        <KPICard title="Pending Collections" value={`SAR ${fmt(data.retentionExposure + data.billingLeakage)}`} icon={Receipt} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Cost Forecast by Period</CardTitle></CardHeader>
        <CardContent>
          {cashData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Legend />
                <Bar dataKey="bac" fill="hsl(199,89%,48%)" name="BAC" />
                <Bar dataKey="eac" fill="hsl(0,84%,60%)" name="EAC" />
                <Bar dataKey="etc" fill="hsl(48,96%,53%)" name="ETC" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground">No forecast data available</p>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tab 10: Action Tracker ── */
function ActionTrackerTab({ actions, newAction, setNewAction, onAdd, setActions }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Create Commercial Action</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Action title" value={newAction.title} onChange={e => setNewAction((p: any) => ({ ...p, title: e.target.value }))} />
            <Input placeholder="Assignee" value={newAction.assignee} onChange={e => setNewAction((p: any) => ({ ...p, assignee: e.target.value }))} />
            <Input type="date" value={newAction.due_date} onChange={e => setNewAction((p: any) => ({ ...p, due_date: e.target.value }))} />
            <div className="flex gap-2">
              <Select value={newAction.priority} onValueChange={v => setNewAction((p: any) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Action Items ({actions.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{a.assignee || '-'}</TableCell>
                  <TableCell>{a.due_date || '-'}</TableCell>
                  <TableCell>
                    <Badge className={a.priority === 'critical' ? 'bg-red-100 text-red-800' : a.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}>
                      {a.priority}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setActions((prev: any[]) => prev.map(x => x.id === a.id ? { ...x, status: x.status === 'open' ? 'closed' : 'open' } : x))}>
                      {a.status === 'open' ? 'Close' : 'Reopen'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {actions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No action items yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
