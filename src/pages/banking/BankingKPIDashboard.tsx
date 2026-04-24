import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, TrendingUp, TrendingDown, Clock, DollarSign, Calendar, ArrowUpDown, RefreshCw, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { format, subDays, subMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const PERIODS = [
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last Year' },
];

export default function BankingKPIDashboard() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [period, setPeriod] = useState('90');
  const [compareMode, setCompareMode] = useState(false);

  const days = parseInt(period);
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const prevStartDate = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
  const prevEndDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['bkpi-ar', activeCompanyId, period],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('total, balance_due, doc_date, doc_due_date, status, customer_name').gte('doc_date', prevStartDate).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['bkpi-ap', activeCompanyId, period],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('total, doc_date, doc_due_date, status, vendor_name').gte('doc_date', prevStartDate).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: inPayments = [] } = useQuery({
    queryKey: ['bkpi-in', activeCompanyId, period],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('total_amount, doc_date, status').gte('doc_date', prevStartDate).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['bkpi-out', activeCompanyId, period],
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('total_amount, doc_date, status').gte('doc_date', prevStartDate).limit(1000) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  // Compute KPIs for a date range
  const computeKPIs = (from: string, to: string) => {
    const arInPeriod = arInvoices.filter(i => i.doc_date >= from && i.doc_date <= to);
    const apInPeriod = apInvoices.filter(i => i.doc_date >= from && i.doc_date <= to);
    const inPeriod = inPayments.filter(p => p.doc_date >= from && p.doc_date <= to && p.status === 'posted');
    const outPeriod = outPayments.filter((p: any) => p.doc_date >= from && p.doc_date <= to && p.status === 'posted');

    const totalRevenue = arInPeriod.reduce((s, i) => s + (i.total || 0), 0);
    const totalAR = arInPeriod.reduce((s, i) => s + (i.balance_due || 0), 0);
    const totalAP = apInPeriod.reduce((s, i) => s + (i.total || 0), 0);
    const totalCOGS = totalAP * 0.7; // approximation
    const totalInventory = totalCOGS * 0.3; // approximation
    const daysInPeriod = Math.max(1, differenceInDays(new Date(to), new Date(from)));

    const dso = totalRevenue > 0 ? Math.round((totalAR / totalRevenue) * daysInPeriod) : 0;
    const dpo = totalCOGS > 0 ? Math.round((totalAP / totalCOGS) * daysInPeriod) : 0;
    const dio = totalCOGS > 0 ? Math.round((totalInventory / totalCOGS) * daysInPeriod) : 0;
    const ccc = dso + dio - dpo;

    const totalIncome = inPeriod.reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalPaid = outPeriod.reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
    const paymentEfficiency = totalAP > 0 ? Math.round((totalPaid / totalAP) * 100) : 0;

    return { dso, dpo, dio, ccc, paymentEfficiency, totalIncome, totalPaid, totalAR, totalAP, totalRevenue };
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const current = computeKPIs(startDate, today);
  const previous = computeKPIs(prevStartDate, prevEndDate);

  const kpiCards = [
    { label: 'Days Sales Outstanding', value: current.dso, prev: previous.dso, unit: 'days', icon: Clock, good: 'lower' },
    { label: 'Days Payable Outstanding', value: current.dpo, prev: previous.dpo, unit: 'days', icon: Calendar, good: 'higher' },
    { label: 'Cash Conversion Cycle', value: current.ccc, prev: previous.ccc, unit: 'days', icon: RefreshCw, good: 'lower' },
    { label: 'Payment Efficiency', value: current.paymentEfficiency, prev: previous.paymentEfficiency, unit: '%', icon: CheckCircle, good: 'higher' },
    { label: 'Total Receivables', value: current.totalAR, prev: previous.totalAR, unit: 'SAR', icon: TrendingUp, good: 'lower' },
    { label: 'Total Payables', value: current.totalAP, prev: previous.totalAP, unit: 'SAR', icon: TrendingDown, good: 'lower' },
  ];

  // Monthly trend data
  const trendData = useMemo(() => {
    const months: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = format(startOfMonth(d), 'yyyy-MM-dd');
      const me = format(endOfMonth(d), 'yyyy-MM-dd');
      const kpi = computeKPIs(ms, me);
      months.push({ month: format(d, 'MMM yy'), dso: kpi.dso, dpo: kpi.dpo, ccc: kpi.ccc, efficiency: kpi.paymentEfficiency });
    }
    return months;
  }, [arInvoices, apInvoices, inPayments, outPayments]);

  // Balance trend
  const balanceTrend = useMemo(() => {
    const points: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const me = format(endOfMonth(d), 'yyyy-MM-dd');
      const inBal = inPayments.filter(p => p.doc_date <= me && p.status === 'posted').reduce((s, p) => s + (p.total_amount || 0), 0);
      const outBal = outPayments.filter((p: any) => p.doc_date <= me && p.status === 'posted').reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
      points.push({ month: format(d, 'MMM yy'), balance: inBal - outBal, inflow: inBal, outflow: outBal });
    }
    return points;
  }, [inPayments, outPayments]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banking KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground">Key performance indicators with period comparison</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant={compareMode ? 'default' : 'outline'} size="sm" onClick={() => setCompareMode(!compareMode)}>
            <ArrowUpDown className="h-3 w-3 mr-1" /> {compareMode ? 'Comparing' : 'Compare'}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => {
          const change = kpi.prev > 0 ? ((kpi.value - kpi.prev) / kpi.prev * 100) : 0;
          const isGood = kpi.good === 'lower' ? change < 0 : change > 0;
          const tipMap: Record<string, string> = {
            'Days Sales Outstanding': 'Average days to collect receivables — lower is better',
            'Days Payable Outstanding': 'Average days to pay suppliers — higher preserves cash',
            'Cash Conversion Cycle': 'DSO + DIO - DPO — measures cash efficiency',
            'Payment Efficiency': 'Percentage of payables settled on time',
            'Total Receivables': 'Outstanding customer balances due',
            'Total Payables': 'Outstanding vendor invoices to pay',
          };
          return (
            <UITooltip key={i}><TooltipTrigger asChild>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">
                  {kpi.unit === 'SAR' ? `SAR ${fmt(kpi.value)}` : kpi.unit === '%' ? `${kpi.value}%` : kpi.value}
                </p>
                {compareMode && (
                  <div className="flex items-center gap-1 mt-1">
                    {change !== 0 && (
                      <Badge variant={isGood ? 'default' : 'destructive'} className="text-[9px]">
                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                      </Badge>
                    )}
                    <span className="text-[9px] text-muted-foreground">vs prior</span>
                  </div>
                )}
              </CardContent>
            </Card>
            </TooltipTrigger><TooltipContent><p className="text-xs">{tipMap[kpi.label] || kpi.label}</p></TooltipContent></UITooltip>
          );
        })}
      </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DSO/DPO/CCC Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">DSO / DPO / CCC Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.every(d => d.dso === 0 && d.dpo === 0 && d.ccc === 0) ? (
              <EmptyChartState message="No KPI trend data available" height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dso" name="DSO" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  <Line type="monotone" dataKey="dpo" name="DPO" stroke="hsl(var(--chart-4))" strokeWidth={2} />
                  <Line type="monotone" dataKey="ccc" name="CCC" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bank Balance Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bank Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={balanceTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Legend />
                <Area type="monotone" dataKey="balance" name="Net Balance" fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Efficiency Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment Efficiency Ratio (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="efficiency" name="Efficiency" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
