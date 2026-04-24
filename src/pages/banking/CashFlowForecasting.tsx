import { useState, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Bell, DollarSign, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LineChart, Line } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'date', header: 'Date' },
  { key: 'inflow', header: 'Inflow' },
  { key: 'outflow', header: 'Outflow' },
  { key: 'net', header: 'Net' },
  { key: 'balance', header: 'Balance' },
  { key: 'status', header: 'Status' },
];


export default function CashFlowForecasting() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');
  const [minThreshold, setMinThreshold] = useState(50000);

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['cf-forecast-ar-full', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('total, balance_due, doc_date, doc_due_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['cf-forecast-ap-full', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('total, status, doc_date, doc_due_date').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: inPayments = [] } = useQuery({
    queryKey: ['cf-forecast-in-payments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('total_amount, doc_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['cf-forecast-out-payments', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('total_amount, doc_date, status').limit(1000) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const days = parseInt(period);
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  // Calculate current cash position from historical payments
  const currentBalance = useMemo(() => {
    const totalIn = inPayments.filter(p => p.status === 'posted').reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalOut = outPayments.filter((p: any) => p.status === 'posted').reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
    return totalIn - totalOut;
  }, [inPayments, outPayments]);

  // Daily forecast data
  const forecastData = useMemo(() => {
    const today = new Date();
    let runningBalance = currentBalance;
    const result: { date: string; day: string; inflow: number; outflow: number; balance: number; isAlert: boolean }[] = [];

    for (let i = 0; i <= days; i++) {
      const d = addDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLabel = format(d, 'MMM dd');

      const expectedIn = arInvoices
        .filter(inv => inv.doc_due_date === dateStr && (inv.balance_due || 0) > 0)
        .reduce((s, inv) => s + (inv.balance_due || 0), 0);

      const expectedOut = apInvoices
        .filter(inv => inv.doc_due_date === dateStr && inv.status !== 'paid')
        .reduce((s, inv) => s + (inv.total || 0), 0);

      runningBalance += expectedIn - expectedOut;

      result.push({
        date: dateStr,
        day: dayLabel,
        inflow: expectedIn,
        outflow: expectedOut,
        balance: runningBalance,
        isAlert: runningBalance < minThreshold,
      });
    }
    return result;
  }, [arInvoices, apInvoices, currentBalance, days, minThreshold]);

  const minProjectedBalance = Math.min(...forecastData.map(d => d.balance));
  const avgDailyCash = forecastData.reduce((s, d) => s + d.balance, 0) / forecastData.length;
  const totalInflow = forecastData.reduce((s, d) => s + d.inflow, 0);
  const totalOutflow = forecastData.reduce((s, d) => s + d.outflow, 0);
  const alertDays = forecastData.filter(d => d.isAlert);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecasting</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="cash-flow-forecasting" title="Cash Flow Forecasting" />
          <p className="text-sm text-muted-foreground">Projected cash position with threshold alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Min Threshold:</span>
            <Input
              type="number"
              value={minThreshold}
              onChange={e => setMinThreshold(Number(e.target.value))}
              className="w-32 h-8 text-xs"
            />
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-3">7 Days</TabsTrigger>
              <TabsTrigger value="14" className="text-xs px-3">14 Days</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-3">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPI Cards */}
      <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <UITooltip><TooltipTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Current Balance</span>
            </div>
            <p className="text-lg font-bold">SAR {fmt(currentBalance)}</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Posted receipts minus posted payments</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Expected Inflow</span>
            </div>
            <p className="text-lg font-bold text-green-600">SAR {fmt(totalInflow)}</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">AR invoices due within forecast period</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Expected Outflow</span>
            </div>
            <p className="text-lg font-bold text-destructive">SAR {fmt(totalOutflow)}</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">AP invoices due within forecast period</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Min Projected</span>
            </div>
            <p className={`text-lg font-bold ${minProjectedBalance < minThreshold ? 'text-destructive' : ''}`}>
              SAR {fmt(minProjectedBalance)}
            </p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Lowest projected cash balance in the period</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Avg Daily Cash</span>
            </div>
            <p className="text-lg font-bold">SAR {fmt(avgDailyCash)}</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Average projected daily cash balance</p></TooltipContent></UITooltip>
      </div>
      </TooltipProvider>

      {/* Alert Banner */}
      {alertDays.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Cash Balance Alert: {alertDays.length} day(s) below SAR {fmt(minThreshold)} threshold
              </p>
              <p className="text-xs text-muted-foreground">
                First occurrence: {alertDays[0]?.day} — Projected: SAR {fmt(alertDays[0]?.balance || 0)}
              </p>
            </div>
            <Button size="sm" variant="destructive" className="ml-auto" onClick={() => toast({ title: 'Alert configured', description: 'Notifications will be sent when threshold is breached' })}>
              <Bell className="h-3 w-3 mr-1" /> Set Alert
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Chart */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Cash Balance Projection — Next {days} Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
              <Legend />
              <ReferenceLine y={minThreshold} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'Min Threshold', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
              <Area type="monotone" dataKey="balance" name="Projected Balance" fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" strokeWidth={2} />
              <Area type="monotone" dataKey="inflow" name="Daily Inflow" fill="hsl(var(--chart-2))" fillOpacity={0.1} stroke="hsl(var(--chart-2))" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="outflow" name="Daily Outflow" fill="hsl(var(--chart-4))" fillOpacity={0.1} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Cash Flow Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Inflow</th>
                  <th className="text-right p-2">Outflow</th>
                  <th className="text-right p-2">Net</th>
                  <th className="text-right p-2">Balance</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.slice(0, 15).map((d, i) => (
                  <tr key={i} className={`border-b ${d.isAlert ? 'bg-destructive/5' : ''}`}>
                    <td className="p-2 font-medium">{d.day}</td>
                    <td className="p-2 text-right text-green-600">{d.inflow > 0 ? `+${fmt(d.inflow)}` : '-'}</td>
                    <td className="p-2 text-right text-destructive">{d.outflow > 0 ? `-${fmt(d.outflow)}` : '-'}</td>
                    <td className={`p-2 text-right font-medium ${d.inflow - d.outflow >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(d.inflow - d.outflow)}
                    </td>
                    <td className="p-2 text-right font-bold">{fmt(d.balance)}</td>
                    <td className="p-2 text-center">
                      {d.isAlert ? (
                        <Badge variant="destructive" className="text-[10px]">Below Threshold</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
