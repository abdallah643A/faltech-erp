import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Download, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

const formatSAR = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-SA');
};

const formatFullSAR = (n: number) => n.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Period {
  label: string;
  start: Date;
  end: Date;
  moneyIn: number;
  moneyOut: number;
  net: number;
  cumulative: number;
  inDetails: { source: string; amount: number; ref: string }[];
  outDetails: { source: string; amount: number; ref: string }[];
}

export default function CPMSCashFlowForecast() {
  const { t } = useLanguage();
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [delayDays, setDelayDays] = useState([0]);
  const [deferDays, setDeferDays] = useState([0]);
  const [forecastDays] = useState(90);

  const today = new Date();
  const endDate = addDays(today, forecastDays);

  // Fetch AR invoices (money in)
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['cashflow-ar-invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices')
        .select('doc_num, customer_name, total, doc_due_date, status, balance_due')
        .in('status', ['open', 'overdue', 'partially_paid'])
        .gte('doc_due_date', format(today, 'yyyy-MM-dd'))
        .lte('doc_due_date', format(endDate, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  // Fetch AP invoices (money out)
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['cashflow-ap-invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices')
        .select('invoice_number, vendor_name, total, doc_due_date, status')
        .in('status', ['open', 'overdue', 'partially_paid'])
        .gte('doc_due_date', format(today, 'yyyy-MM-dd'))
        .lte('doc_due_date', format(endDate, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  // Fetch CPMS expenses (money out - upcoming unpaid)
  const { data: expenses = [] } = useQuery({
    queryKey: ['cashflow-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('cpms_expenses')
        .select('vendor_name, amount, expense_date, category')
        .eq('paid', false)
        .gte('expense_date', format(today, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  // Retention releases (money in)
  const { data: retentionInvoices = [] } = useQuery({
    queryKey: ['cashflow-retention'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices')
        .select('doc_num, customer_name, retention_amount, doc_due_date')
        .gt('retention_amount', 0)
        .not('retention_amount', 'is', null);
      return data || [];
    },
  });

  const periods = useMemo(() => {
    const result: Period[] = [];
    let cursor = new Date(today);
    let cumulative = 0;

    while (cursor < endDate) {
      let pStart: Date, pEnd: Date, label: string;
      if (groupBy === 'week') {
        pStart = startOfWeek(cursor, { weekStartsOn: 0 });
        if (pStart < today) pStart = new Date(today);
        pEnd = endOfWeek(cursor, { weekStartsOn: 0 });
        if (pEnd > endDate) pEnd = endDate;
        const weekNum = result.length + 1;
        label = `Week ${weekNum} (${format(pStart, 'MMM d')}-${format(pEnd, 'MMM d')})`;
        cursor = addDays(pEnd, 1);
      } else {
        pStart = startOfMonth(cursor);
        if (pStart < today) pStart = new Date(today);
        pEnd = endOfMonth(cursor);
        if (pEnd > endDate) pEnd = endDate;
        label = format(pStart, 'MMMM yyyy');
        cursor = addDays(pEnd, 1);
      }

      const inDetails: { source: string; amount: number; ref: string }[] = [];
      const outDetails: { source: string; amount: number; ref: string }[] = [];

      // Money IN: AR invoices
      arInvoices.forEach(inv => {
        if (!inv.doc_due_date) return;
        const dueDate = addDays(parseISO(inv.doc_due_date), delayDays[0]);
        if (isWithinInterval(dueDate, { start: pStart, end: pEnd })) {
          const amt = Number(inv.balance_due || inv.total || 0);
          inDetails.push({ source: 'AR Invoice', amount: amt, ref: `INV-${inv.doc_num} - ${inv.customer_name}` });
        }
      });

      // Money IN: Retention releases (simplified - assume release 90 days after invoice)
      retentionInvoices.forEach(inv => {
        if (!inv.doc_due_date) return;
        const releaseDate = addDays(parseISO(inv.doc_due_date), 90);
        if (isWithinInterval(releaseDate, { start: pStart, end: pEnd })) {
          inDetails.push({ source: 'Retention Release', amount: Number(inv.retention_amount || 0), ref: `INV-${inv.doc_num} - ${inv.customer_name}` });
        }
      });

      // Money OUT: AP invoices
      apInvoices.forEach(inv => {
        if (!inv.doc_due_date) return;
        const dueDate = addDays(parseISO(inv.doc_due_date), deferDays[0]);
        if (isWithinInterval(dueDate, { start: pStart, end: pEnd })) {
          outDetails.push({ source: 'AP Invoice', amount: Number(inv.total || 0), ref: `${inv.invoice_number} - ${inv.vendor_name}` });
        }
      });

      // Money OUT: Expenses
      expenses.forEach(exp => {
        if (!exp.expense_date) return;
        const dueDate = addDays(parseISO(exp.expense_date), deferDays[0]);
        if (isWithinInterval(dueDate, { start: pStart, end: pEnd })) {
          outDetails.push({ source: exp.category || 'Expense', amount: Number(exp.amount || 0), ref: exp.vendor_name || 'Unknown' });
        }
      });

      const moneyIn = inDetails.reduce((s, d) => s + d.amount, 0);
      const moneyOut = outDetails.reduce((s, d) => s + d.amount, 0);
      const net = moneyIn - moneyOut;
      cumulative += net;

      result.push({ label, start: pStart, end: pEnd, moneyIn, moneyOut, net, cumulative, inDetails, outDetails });
    }
    return result;
  }, [arInvoices, apInvoices, expenses, retentionInvoices, groupBy, delayDays, deferDays, forecastDays]);

  const totalIn = periods.reduce((s, p) => s + p.moneyIn, 0);
  const totalOut = periods.reduce((s, p) => s + p.moneyOut, 0);
  const proj30 = periods.filter(p => differenceInDays(p.end, today) <= 30).reduce((s, p) => s + p.net, 0);
  const proj60 = periods.filter(p => differenceInDays(p.end, today) <= 60).reduce((s, p) => s + p.net, 0);
  const proj90 = periods.reduce((s, p) => s + p.net, 0);

  const alerts = useMemo(() => {
    const a: { type: 'danger' | 'warning'; message: string }[] = [];
    periods.forEach(p => {
      if (p.cumulative < 0) {
        a.push({ type: 'danger', message: `⚠️ Cash deficit predicted in ${p.label}: ${formatFullSAR(p.cumulative)} SAR` });
      }
      p.outDetails.filter(d => d.amount > 50_000_000).forEach(d => {
        a.push({ type: 'warning', message: `Large payment due ${p.label}: ${formatFullSAR(d.amount)} SAR to ${d.ref}` });
      });
    });
    return a.slice(0, 8);
  }, [periods]);

  const chartData = periods.map(p => ({
    name: p.label.replace(/Week \d+ \(/, '').replace(')', ''),
    'Money In': p.moneyIn,
    'Money Out': p.moneyOut,
    'Net Flow': p.net,
    Cumulative: p.cumulative,
  }));

  const exportToExcel = () => {
    const rows = periods.map(p => ({
      Period: p.label,
      'Money IN (SAR)': p.moneyIn,
      'Money OUT (SAR)': p.moneyOut,
      'Net Flow (SAR)': p.net,
      'Cumulative (SAR)': p.cumulative,
    }));
    rows.push({
      Period: 'TOTAL',
      'Money IN (SAR)': totalIn,
      'Money OUT (SAR)': totalOut,
      'Net Flow (SAR)': totalIn - totalOut,
      'Cumulative (SAR)': proj90,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow Forecast');
    XLSX.writeFile(wb, `CashFlow_Forecast_${format(today, 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exported to Excel');
  };

  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground">Next 90 days projected cash position</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={groupBy} onValueChange={(v: 'week' | 'month') => setGroupBy(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">By Week</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Projection Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Money IN</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatSAR(totalIn)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total Money OUT</span>
            </div>
            <p className="text-xl font-bold text-destructive">{formatSAR(totalOut)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {proj30 >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
              <span className="text-xs text-muted-foreground">30-Day Projection</span>
            </div>
            <p className={`text-xl font-bold ${proj30 >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatSAR(proj30)} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {proj90 >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              <span className="text-xs text-muted-foreground">90-Day Projection</span>
            </div>
            <p className={`text-xl font-bold ${proj90 >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatSAR(proj90)} SAR</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-foreground">Cash Flow Alerts</h3>
            </div>
            {alerts.map((a, i) => (
              <div key={i} className={`text-sm px-3 py-1.5 rounded ${a.type === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'}`}>
                {a.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Cash Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tickFormatter={(v) => formatSAR(v)} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <RTooltip formatter={(v: number) => formatFullSAR(v) + ' SAR'} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="Money In" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Money Out" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Net Flow" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
                <Area type="monotone" dataKey="Cumulative" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} stroke="hsl(217, 91%, 60%)" strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Modeling */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Scenario Modeling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What if client delays payment by <span className="text-primary font-bold">{delayDays[0]}</span> days?
              </label>
              <Slider value={delayDays} onValueChange={setDelayDays} min={0} max={60} step={5} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0 days</span><span>60 days</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What if we defer payments by <span className="text-primary font-bold">{deferDays[0]}</span> days?
              </label>
              <Slider value={deferDays} onValueChange={setDeferDays} min={0} max={60} step={5} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0 days</span><span>60 days</span>
              </div>
            </div>
          </div>
          {(delayDays[0] > 0 || deferDays[0] > 0) && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              📊 Scenario: Client payments delayed by {delayDays[0]} days, outgoing payments deferred by {deferDays[0]} days. Chart and table update in real-time.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Period Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Period</TableHead>
                  <TableHead className="text-right min-w-[140px]">Money IN (SAR)</TableHead>
                  <TableHead className="text-right min-w-[140px]">Money OUT (SAR)</TableHead>
                  <TableHead className="text-right min-w-[140px]">Net Flow (SAR)</TableHead>
                  <TableHead className="text-right min-w-[140px]">Cumulative (SAR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p, i) => (
                  <React.Fragment key={i}>
                    <TableRow
                      className={`cursor-pointer hover:bg-muted/50 ${p.cumulative < 0 ? 'bg-destructive/5' : ''}`}
                      onClick={() => setExpandedPeriod(expandedPeriod === i ? null : i)}
                    >
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono">{formatFullSAR(p.moneyIn)}</TableCell>
                      <TableCell className="text-right text-destructive font-mono">{formatFullSAR(p.moneyOut)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${p.net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {p.net >= 0 ? '+' : ''}{formatFullSAR(p.net)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${p.cumulative >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {p.cumulative >= 0 ? '+' : ''}{formatFullSAR(p.cumulative)}
                      </TableCell>
                    </TableRow>
                    {expandedPeriod === i && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            <div>
                              <h4 className="text-sm font-semibold text-emerald-600 mb-2">Money IN Details</h4>
                              {p.inDetails.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No expected income this period</p>
                              ) : (
                                <div className="space-y-1">
                                  {p.inDetails.map((d, j) => (
                                    <div key={j} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground truncate mr-2">{d.ref}</span>
                                      <span className="text-emerald-600 font-mono whitespace-nowrap">{formatFullSAR(d.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-destructive mb-2">Money OUT Details</h4>
                              {p.outDetails.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No expected payments this period</p>
                              ) : (
                                <div className="space-y-1">
                                  {p.outDetails.map((d, j) => (
                                    <div key={j} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground truncate mr-2">{d.ref}</span>
                                      <span className="text-destructive font-mono whitespace-nowrap">{formatFullSAR(d.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {/* Totals row */}
                <TableRow className="border-t-2 bg-muted/40 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-emerald-600 font-mono">{formatFullSAR(totalIn)}</TableCell>
                  <TableCell className="text-right text-destructive font-mono">{formatFullSAR(totalOut)}</TableCell>
                  <TableCell className={`text-right font-mono ${totalIn - totalOut >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {totalIn - totalOut >= 0 ? '+' : ''}{formatFullSAR(totalIn - totalOut)}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${proj90 >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {proj90 >= 0 ? '+' : ''}{formatFullSAR(proj90)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click any row to see details. Last updated: {format(today, 'MMM d, yyyy HH:mm')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
