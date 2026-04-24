import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingUp, AlertTriangle, Calendar, CheckCircle2, XCircle, Clock,
  BarChart3, ShieldAlert, Package, FileText, ArrowRight, Target, Zap, Users, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, ComposedChart, Area,
} from 'recharts';
import {
  useProcurementIntelligence,
  useBudgetAnalytics,
  useDeliveryCalendar,
  useThreeWayMatching,
  useProcurementCycleAnalytics,
} from '@/hooks/useProcurementIntelligence';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const fmtCurrency = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0);

const statusColors: Record<string, string> = {
  matched: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  discrepancy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  unmatched: 'bg-muted text-muted-foreground',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  caution: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  normal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function ProcurementHub() {
  const { t } = useLanguage();
  const { purchaseOrders, purchaseRequests, goodsReceipts, apInvoices, projects, boqItems } = useProcurementIntelligence();

  const pos = purchaseOrders.data || [];
  const prs = purchaseRequests.data || [];
  const grpos = goodsReceipts.data || [];
  const invoices = apInvoices.data || [];
  const projs = projects.data || [];
  const boqs = boqItems.data || [];

  const budget = useBudgetAnalytics(pos, invoices, projs);
  const calendar = useDeliveryCalendar(pos, grpos, projs);
  const matching = useThreeWayMatching(pos, grpos, invoices);
  const cycle = useProcurementCycleAnalytics(prs, pos, grpos, invoices);

  const matchingPieData = [
    { name: 'Matched', value: matching.matched },
    { name: 'Partial', value: matching.partial },
    { name: 'Discrepancy', value: matching.discrepancy },
    { name: 'Unmatched', value: matching.unmatched },
  ].filter(d => d.value > 0);

  const concentrationPieData = cycle.vendorConcentration.slice(0, 8).map(v => ({ name: v.vendor.length > 18 ? v.vendor.slice(0, 18) + '…' : v.vendor, value: v.spend }));

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Procurement Intelligence Hub
        </h1>
        <p className="text-xs text-muted-foreground">Budget tracking, delivery calendar, three-way matching, and advanced analytics</p>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Budget', value: fmtCurrency(budget.totalBudget), icon: DollarSign, color: 'text-primary' },
          { label: 'Committed', value: fmtCurrency(budget.totalCommitted), icon: Target },
          { label: 'Invoiced', value: fmtCurrency(budget.totalInvoiced), icon: FileText },
          { label: 'Variance', value: fmtCurrency(budget.overallVariance), icon: TrendingUp, color: budget.overallVariance < 0 ? 'text-destructive' : 'text-green-600' },
          { label: 'Avg Cycle', value: `${cycle.avgFullCycle}d`, icon: Clock },
          { label: 'Matched', value: `${matching.matched}`, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Discrepancies', value: `${matching.discrepancy}`, icon: XCircle, color: matching.discrepancy > 0 ? 'text-destructive' : 'text-muted-foreground' },
          { label: 'Late Deliveries', value: `${calendar.delays.length}`, icon: AlertTriangle, color: calendar.delays.length > 0 ? 'text-destructive' : 'text-green-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-3 pb-2">
              <kpi.icon className={`h-4 w-4 mb-1 ${kpi.color || 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-sm font-bold ${kpi.color || 'text-foreground'}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="budget">Budget & Forecast</TabsTrigger>
          <TabsTrigger value="calendar">Delivery Calendar</TabsTrigger>
          <TabsTrigger value="matching">3-Way Matching</TabsTrigger>
          <TabsTrigger value="analytics">Cycle Analytics</TabsTrigger>
          <TabsTrigger value="boq">BOQ → PO</TabsTrigger>
          <TabsTrigger value="compliance">Audit & Compliance</TabsTrigger>
        </TabsList>

        {/* ===== BUDGET & FORECAST ===== */}
        <TabsContent value="budget" className="space-y-4">
          {/* Spend Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Spend Trend & Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={[
                    ...budget.monthlySpend,
                    { month: '+1m', poValue: budget.avgMonthlySpend, invoiceValue: 0, count: 0, forecast: true },
                    { month: '+2m', poValue: budget.avgMonthlySpend, invoiceValue: 0, count: 0, forecast: true },
                    { month: '+3m', poValue: budget.avgMonthlySpend, invoiceValue: 0, count: 0, forecast: true },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmtShort(v)} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area dataKey="poValue" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" name="PO Value" />
                    <Line dataKey="invoiceValue" stroke="hsl(var(--chart-3))" name="Invoiced" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span>📊 Avg Monthly: <b>{fmtCurrency(budget.avgMonthlySpend)}</b></span>
                  <span>📈 3-Month Forecast: <b>{fmtCurrency(budget.forecast3m)}</b></span>
                  <span>📈 6-Month Forecast: <b>{fmtCurrency(budget.forecast6m)}</b></span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Budget Utilization by Project</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={budget.projectBudgets.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="utilization" name="Utilization %" radius={[0, 4, 4, 0]}>
                      {budget.projectBudgets.slice(0, 8).map((p: any, i: number) => (
                        <Cell key={i} fill={p.alertLevel === 'critical' ? 'hsl(var(--destructive))' : p.alertLevel === 'warning' ? 'hsl(45, 93%, 47%)' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Budget Alert Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Project Budget Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-center">Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.projectBudgets.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">{p.name}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(p.budget)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(p.committed)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(p.invoiced)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${p.remaining < 0 ? 'text-destructive' : ''}`}>{fmtCurrency(p.remaining)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={Math.min(p.utilization, 100)} className="h-1.5 w-16" />
                          <span className="text-xs">{p.utilization.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColors[p.alertLevel]} variant="secondary">{p.alertLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {budget.projectBudgets.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No projects with budgets found.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DELIVERY CALENDAR ===== */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Delay Alerts */}
          {calendar.delays.length > 0 && (
            <Card className="border-destructive bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Late Deliveries ({calendar.delays.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Days Late</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calendar.delays.slice(0, 15).map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.po_number}</TableCell>
                        <TableCell className="text-xs">{d.vendor_name}</TableCell>
                        <TableCell className="text-xs">{d.projectName || '—'}</TableCell>
                        <TableCell className="text-xs">{d.delivery_date}</TableCell>
                        <TableCell className="text-right text-destructive font-bold text-xs">{d.daysLate}d</TableCell>
                        <TableCell className="text-right text-xs">{fmtCurrency(d.total || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Monthly Delivery Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Delivery Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(calendar.byMonth).sort().map(([month, events]) => (
                <div key={month} className="mb-4">
                  <h3 className="text-xs font-bold text-muted-foreground mb-2 uppercase">{month}</h3>
                  <div className="space-y-1">
                    {(events as any[]).map((e: any) => (
                      <div key={e.id} className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${e.isLate ? 'border-destructive/30 bg-destructive/5' : 'hover:bg-muted/30'}`}>
                        <span className="text-muted-foreground w-20 shrink-0">{e.date}</span>
                        <span className={`font-medium flex-1 ${e.isLate ? 'text-destructive' : ''}`}>{e.title}</span>
                        {e.projectName && <Badge variant="outline" className="text-[10px]">{e.projectName}</Badge>}
                        <Badge className={statusColors[e.isLate ? 'critical' : 'normal']} variant="secondary">{e.isLate ? 'LATE' : e.status}</Badge>
                        <span className="font-medium w-24 text-right">{fmtCurrency(e.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {calendar.events.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No delivery dates scheduled.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== THREE-WAY MATCHING ===== */}
        <TabsContent value="matching" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-1">
              {[
                { label: 'Fully Matched', value: matching.matched, icon: CheckCircle2, color: 'text-green-600' },
                { label: 'Partial Match', value: matching.partial, icon: Clock, color: 'text-yellow-600' },
                { label: 'Discrepancies', value: matching.discrepancy, icon: XCircle, color: 'text-destructive' },
                { label: 'Unmatched', value: matching.unmatched, icon: Package, color: 'text-muted-foreground' },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <s.icon className={`h-6 w-6 mx-auto mb-1 ${s.color}`} />
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Match Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={matchingPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {matchingPieData.map((_, i) => (
                        <Cell key={i} fill={['hsl(142, 71%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(var(--destructive))', 'hsl(var(--muted))'][i]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Matching Detail Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                PO ↔ Receipt ↔ Invoice Matching
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">PO Total</TableHead>
                    <TableHead className="text-right">Receipt Total</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead className="text-center">{t('common.status')}</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matching.matches.filter((m: any) => m.status !== 'unmatched').slice(0, 30).map((m: any) => (
                    <TableRow key={m.po.id}>
                      <TableCell className="font-mono text-xs">{m.po.po_number}</TableCell>
                      <TableCell className="text-xs">{m.po.vendor_name}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(m.poTotal)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(m.grpoTotal)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtCurrency(m.invoiceTotal)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColors[m.status]} variant="secondary">{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.discrepancies.map((d: string, i: number) => <div key={i}>{d}</div>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {matching.matches.filter((m: any) => m.status !== 'unmatched').length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">No matched documents yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CYCLE ANALYTICS ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'PR → PO Cycle', value: `${cycle.avgPRtoPO} days`, icon: ArrowRight },
              { label: 'PO → Receipt', value: `${cycle.avgPOtoGRPO} days`, icon: ArrowRight },
              { label: 'Full Cycle', value: `${cycle.avgFullCycle} days`, icon: Clock },
              { label: 'Est. Savings', value: fmtCurrency(cycle.savingsEstimate), icon: DollarSign, color: 'text-green-600' },
            ].map((kpi, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3">
                  <kpi.icon className={`h-4 w-4 mb-1 ${kpi.color || 'text-muted-foreground'}`} />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-lg font-bold ${kpi.color || 'text-foreground'}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vendor Concentration */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Supplier Concentration Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={concentrationPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {concentrationPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {cycle.vendorConcentration.filter(v => v.risk !== 'low').slice(0, 5).map(v => (
                    <div key={v.vendor} className="flex items-center justify-between text-xs p-1 rounded bg-muted/30">
                      <span className="truncate max-w-[200px]">{v.vendor}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{v.share.toFixed(1)}%</span>
                        <Badge className={statusColors[v.risk === 'high' ? 'critical' : 'warning']} variant="secondary">{v.risk}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Spend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Category Spend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={cycle.categories.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmtShort(v)} />
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" name="Spend" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== BOQ → PO ===== */}
        <TabsContent value="boq" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Bill of Quantities - PO Generation Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              {boqs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">{t('common.amount')}</TableHead>
                      <TableHead className="text-center">PO Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boqs.slice(0, 30).map((item: any) => {
                      const hasPO = pos.some((po: any) => po.remarks?.includes(item.item_code || item.description?.slice(0, 20)));
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.item_code || '—'}</TableCell>
                          <TableCell className="text-xs">{item.description || item.item_description}</TableCell>
                          <TableCell className="text-right text-xs">{item.quantity || 0}</TableCell>
                          <TableCell className="text-xs">{item.unit || 'EA'}</TableCell>
                          <TableCell className="text-right text-xs">{fmtCurrency(item.rate || item.unit_price || 0)}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmtCurrency(item.amount || (item.quantity || 0) * (item.rate || item.unit_price || 0))}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={hasPO ? statusColors.matched : statusColors.unmatched} variant="secondary">
                              {hasPO ? 'PO Created' : 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No BOQ items found. Create BOQ items in the BOQ Management module to enable bulk PO generation.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AUDIT & COMPLIANCE ===== */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PO Approval Audit */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  PO Approval Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {pos.filter((po: any) => po.approved_by || po.rejected_by).slice(0, 20).map((po: any) => (
                    <div key={po.id} className="p-2 rounded-lg border text-xs hover:bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{po.po_number}</span>
                        <Badge className={po.approval_status === 'approved' ? statusColors.matched : po.approval_status === 'rejected' ? statusColors.discrepancy : statusColors.caution} variant="secondary">
                          {po.approval_status}
                        </Badge>
                      </div>
                      <div className="flex justify-between mt-1 text-muted-foreground">
                        <span>{po.vendor_name}</span>
                        <span>{fmtCurrency(po.total || 0)}</span>
                      </div>
                      {po.approved_by_name && <p className="text-[10px] text-muted-foreground mt-1">Approved by: {po.approved_by_name} on {po.approved_at?.slice(0, 10)}</p>}
                      {po.rejected_reason && <p className="text-[10px] text-destructive mt-1">Reason: {po.rejected_reason}</p>}
                    </div>
                  ))}
                  {pos.filter((po: any) => po.approved_by || po.rejected_by).length === 0 && (
                    <p className="text-center text-muted-foreground py-6">No approval records found.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Compliance Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Procurement Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      label: 'POs with Approval',
                      value: pos.filter((po: any) => po.approved_by).length,
                      total: pos.length,
                      pct: pos.length > 0 ? (pos.filter((po: any) => po.approved_by).length / pos.length * 100) : 0,
                    },
                    {
                      label: 'POs from PRs (Authorized)',
                      value: pos.filter((po: any) => po.purchase_request_id).length,
                      total: pos.length,
                      pct: pos.length > 0 ? (pos.filter((po: any) => po.purchase_request_id).length / pos.length * 100) : 0,
                    },
                    {
                      label: 'POs with Quotation',
                      value: pos.filter((po: any) => po.purchase_quotation_id).length,
                      total: pos.length,
                      pct: pos.length > 0 ? (pos.filter((po: any) => po.purchase_quotation_id).length / pos.length * 100) : 0,
                    },
                    {
                      label: '3-Way Matched',
                      value: matching.matched,
                      total: matching.matches.length,
                      pct: matching.matches.length > 0 ? (matching.matched / matching.matches.length * 100) : 0,
                    },
                  ].map((metric, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{metric.label}</span>
                        <span className="font-medium">{metric.value}/{metric.total} ({metric.pct.toFixed(0)}%)</span>
                      </div>
                      <Progress value={metric.pct} className="h-2" />
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-3 bg-muted/30 rounded-lg text-[10px] text-muted-foreground space-y-1">
                  <p className="font-medium text-xs text-foreground mb-2">Compliance Rules</p>
                  <p>✅ All POs should originate from approved Purchase Requests</p>
                  <p>✅ POs above threshold require management approval</p>
                  <p>✅ Competitive quotations required for POs above threshold</p>
                  <p>✅ Three-way matching (PO-Receipt-Invoice) for payment release</p>
                  <p>✅ Budget availability check before PO creation</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
