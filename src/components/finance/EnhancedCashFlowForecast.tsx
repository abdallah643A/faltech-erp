import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Scenario = 'base' | 'optimistic' | 'pessimistic';

export function EnhancedCashFlowForecast() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 3),
    to: addMonths(new Date(), 6),
  });
  const [scenario, setScenario] = useState<Scenario>('base');
  const [forecastMonths, setForecastMonths] = useState<'3' | '6' | '12'>('6');

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['ecf-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('total, balance_due, doc_date, doc_due_date, status').limit(1000);
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['ecf-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('total, status, doc_date, doc_due_date').limit(1000);
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['ecf-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('incoming_payments').select('total_amount, doc_date, status').limit(1000);
      return (data || []) as any[];
    },
  });

  const scenarioMultiplier = useMemo(() => {
    switch (scenario) {
      case 'optimistic': return { inflow: 1.15, outflow: 0.9 };
      case 'pessimistic': return { inflow: 0.75, outflow: 1.1 };
      default: return { inflow: 1, outflow: 1 };
    }
  }, [scenario]);

  const forecastData = useMemo(() => {
    const now = new Date();
    const months: any[] = [];
    const fMonths = Number(forecastMonths);

    for (let i = -3; i <= fMonths; i++) {
      const d = addMonths(now, i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM yy');
      const isFuture = i > 0;

      if (isFuture) {
        const baseIn = arInvoices
          .filter(inv => inv.doc_due_date && inv.doc_due_date >= start && inv.doc_due_date <= end && (inv.balance_due || 0) > 0)
          .reduce((s, inv) => s + (inv.balance_due || 0), 0);
        const baseOut = apInvoices
          .filter(inv => inv.doc_due_date && inv.doc_due_date >= start && inv.doc_due_date <= end && inv.status !== 'paid')
          .reduce((s, inv) => s + (inv.total || 0), 0);

        months.push({
          month: label,
          actual_in: 0, actual_out: 0,
          forecast_base_in: baseIn,
          forecast_base_out: baseOut,
          forecast_in: Math.round(baseIn * scenarioMultiplier.inflow),
          forecast_out: Math.round(baseOut * scenarioMultiplier.outflow),
          net: Math.round(baseIn * scenarioMultiplier.inflow - baseOut * scenarioMultiplier.outflow),
          isForecast: true,
        });
      } else {
        const actualIn = payments.filter(p => p.doc_date >= start && p.doc_date <= end && p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
        const actualOut = apInvoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end).reduce((s, inv) => s + (inv.total || 0), 0);
        months.push({
          month: label,
          actual_in: actualIn, actual_out: actualOut,
          forecast_base_in: 0, forecast_base_out: 0,
          forecast_in: 0, forecast_out: 0,
          net: actualIn - actualOut,
          isForecast: false,
        });
      }
    }
    return months;
  }, [arInvoices, apInvoices, payments, scenarioMultiplier, forecastMonths]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const totalForecastIn = forecastData.filter(d => d.isForecast).reduce((s, d) => s + d.forecast_in, 0);
  const totalForecastOut = forecastData.filter(d => d.isForecast).reduce((s, d) => s + d.forecast_out, 0);
  const netForecast = totalForecastIn - totalForecastOut;
  const minBalance = Math.min(...forecastData.map(d => d.net));

  const scenarioLabels: Record<Scenario, { en: string; ar: string; color: string }> = {
    base: { en: 'Base Case', ar: 'الحالة الأساسية', color: 'bg-blue-500' },
    optimistic: { en: 'Optimistic (+15% in, -10% out)', ar: 'متفائل', color: 'bg-green-500' },
    pessimistic: { en: 'Pessimistic (-25% in, +10% out)', ar: 'متشائم', color: 'bg-red-500' },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isAr ? 'التدفق النقدي المتقدم' : 'Enhanced Cash Flow Forecast'}
            <Badge variant={netForecast >= 0 ? 'default' : 'destructive'} className="text-[10px]">
              {isAr ? 'صافي' : 'Net'}: SAR {fmt(netForecast)}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={forecastMonths} onValueChange={(v) => setForecastMonths(v as any)}>
              <SelectTrigger className="w-[90px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 {isAr ? 'أشهر' : 'mo'}</SelectItem>
                <SelectItem value="6">6 {isAr ? 'أشهر' : 'mo'}</SelectItem>
                <SelectItem value="12">12 {isAr ? 'شهر' : 'mo'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scenario tabs */}
        <Tabs value={scenario} onValueChange={(v) => setScenario(v as Scenario)} className="mb-4">
          <TabsList className="h-8">
            {Object.entries(scenarioLabels).map(([key, info]) => (
              <TabsTrigger key={key} value={key} className="text-xs h-7">
                <span className={`w-2 h-2 rounded-full ${info.color} mr-1.5`} />
                {isAr ? info.ar : info.en}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">{isAr ? 'التدفق الداخل المتوقع' : 'Projected Inflow'}</p>
            <p className="text-sm font-bold text-green-600">SAR {fmt(totalForecastIn)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">{isAr ? 'التدفق الخارج المتوقع' : 'Projected Outflow'}</p>
            <p className="text-sm font-bold text-red-600">SAR {fmt(totalForecastOut)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">{isAr ? 'صافي الموقف' : 'Net Position'}</p>
            <p className={`text-sm font-bold ${netForecast >= 0 ? 'text-green-600' : 'text-red-600'}`}>SAR {fmt(netForecast)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">{isAr ? 'أدنى رصيد' : 'Min Balance'}</p>
            <p className={`text-sm font-bold ${minBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>SAR {fmt(minBalance)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <ReferenceLine x={forecastData.find(d => d.isForecast)?.month} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Forecast →" />
            <Area type="monotone" dataKey="actual_in" name={isAr ? 'الوارد الفعلي' : 'Actual In'} fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <Area type="monotone" dataKey="actual_out" name={isAr ? 'الصادر الفعلي' : 'Actual Out'} fill="hsl(var(--chart-4))" fillOpacity={0.3} stroke="hsl(var(--chart-4))" strokeWidth={2} />
            <Area type="monotone" dataKey="forecast_in" name={isAr ? 'الوارد المتوقع' : 'Forecast In'} fill="hsl(var(--chart-2))" fillOpacity={0.1} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="forecast_out" name={isAr ? 'الصادر المتوقع' : 'Forecast Out'} fill="hsl(var(--chart-4))" fillOpacity={0.1} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
