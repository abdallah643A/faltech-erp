import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Landmark, TrendingUp, TrendingDown, DollarSign, ArrowDownLeft, ArrowUpRight, BarChart2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { format, addDays } from 'date-fns';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function CashPositionDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();

  const { data: inPayments = [] } = useQuery({
    queryKey: ['cash-pos-in', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('total_amount, doc_date, status, payment_type, currency').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['cash-pos-out', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('total_amount, doc_date, status, payment_type, currency').limit(1000) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['cash-pos-ar', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('balance_due, doc_due_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['cash-pos-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('total, doc_due_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  const totalIn = inPayments.filter(p => p.status === 'posted').reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalOut = outPayments.filter((p: any) => p.status === 'posted').reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
  const currentBalance = totalIn - totalOut;

  // 30-day forecast
  const forecastChart = useMemo(() => {
    const today = new Date();
    let bal = currentBalance;
    return Array.from({ length: 31 }, (_, i) => {
      const d = addDays(today, i);
      const ds = format(d, 'yyyy-MM-dd');
      const inflow = arInvoices.filter(inv => inv.doc_due_date === ds && (inv.balance_due || 0) > 0).reduce((s, inv) => s + (inv.balance_due || 0), 0);
      const outflow = apInvoices.filter(inv => inv.doc_due_date === ds && inv.status !== 'paid').reduce((s, inv) => s + (inv.total || 0), 0);
      bal += inflow - outflow;
      return { day: format(d, 'MMM dd'), balance: bal, inflow, outflow };
    });
  }, [currentBalance, arInvoices, apInvoices]);

  const minProjected = Math.min(...forecastChart.map(d => d.balance));
  const avgDaily = forecastChart.reduce((s, d) => s + d.balance, 0) / forecastChart.length;
  const cashVariance = currentBalance > 0 ? ((forecastChart[forecastChart.length - 1].balance - currentBalance) / currentBalance * 100) : 0;

  // Payment method breakdown
  const methodBreakdown = useMemo(() => {
    const methods: Record<string, number> = {};
    [...inPayments, ...outPayments].filter((p: any) => p.status === 'posted').forEach((p: any) => {
      const method = p.payment_type || 'Other';
      methods[method] = (methods[method] || 0) + (p.total_amount || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [inPayments, outPayments]);

  // Currency breakdown
  const currencyBreakdown = useMemo(() => {
    const currencies: Record<string, { inflow: number; outflow: number }> = {};
    inPayments.filter(p => p.status === 'posted').forEach((p: any) => {
      const c = p.currency || 'SAR';
      if (!currencies[c]) currencies[c] = { inflow: 0, outflow: 0 };
      currencies[c].inflow += p.total_amount || 0;
    });
    outPayments.filter((p: any) => p.status === 'posted').forEach((p: any) => {
      const c = p.currency || 'SAR';
      if (!currencies[c]) currencies[c] = { inflow: 0, outflow: 0 };
      currencies[c].outflow += p.total_amount || 0;
    });
    return Object.entries(currencies).map(([currency, v]) => ({ currency, ...v, net: v.inflow - v.outflow }));
  }, [inPayments, outPayments]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash Position Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time cash balance across all accounts with 30-day forecast</p>
      </div>

      {/* KPIs */}
      <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: DollarSign, label: 'Current Cash Balance', value: currentBalance, color: 'text-primary', tip: 'Total posted receipts minus total posted payments' },
          { icon: ArrowDownLeft, label: 'Total Received', value: totalIn, color: 'text-green-600', tip: 'Sum of all posted incoming payments' },
          { icon: ArrowUpRight, label: 'Total Paid', value: totalOut, color: 'text-destructive', tip: 'Sum of all posted outgoing payments' },
          { icon: TrendingDown, label: 'Min Projected (30d)', value: minProjected, color: minProjected < 0 ? 'text-destructive' : 'text-amber-600', tip: 'Lowest projected balance in the next 30 days' },
          { icon: BarChart2, label: 'Cash Variance', value: cashVariance, color: cashVariance >= 0 ? 'text-green-600' : 'text-destructive', suffix: '%', tip: 'Percentage change from current to projected end balance' },

        ].map((kpi, i) => (
          <UITooltip key={i}><TooltipTrigger asChild>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-lg font-bold ${kpi.color}`}>
                {kpi.suffix === '%' ? `${kpi.value.toFixed(1)}%` : `SAR ${fmt(kpi.value)}`}
              </p>
            </CardContent>
          </Card>
          </TooltipTrigger><TooltipContent><p className="text-xs">{kpi.tip}</p></TooltipContent></UITooltip>
        ))}
      </div>
      </TooltipProvider>

      {/* 30-Day Forecast Chart */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">30-Day Cash Position Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={forecastChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
              <Legend />
              <Area type="monotone" dataKey="balance" name="Balance" fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {methodBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Currency Breakdown */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cash by Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currencyBreakdown.map(c => (
                <div key={c.currency} className="flex items-center justify-between border-b pb-2">
                  <Badge variant="outline" className="text-xs">{c.currency}</Badge>
                  <div className="flex gap-6 text-xs">
                    <span className="text-green-600">In: {fmt(c.inflow)}</span>
                    <span className="text-destructive">Out: {fmt(c.outflow)}</span>
                    <span className={`font-bold ${c.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      Net: {fmt(c.net)}
                    </span>
                  </div>
                </div>
              ))}
              {currencyBreakdown.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No payment data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
