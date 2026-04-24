import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function CashFlowForecast() {
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['cf-forecast-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('total, balance_due, doc_date, doc_due_date, status').limit(1000);
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['cf-forecast-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('total, status, doc_date, doc_due_date').limit(1000);
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['cf-forecast-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('incoming_payments').select('total_amount, doc_date, status').limit(1000);
      return (data || []) as any[];
    },
  });

  const forecastData = useMemo(() => {
    const now = new Date();
    const months: { month: string; actual_in: number; actual_out: number; forecast_in: number; forecast_out: number; balance: number }[] = [];

    // Past 3 months (actual) + Next 3 months (forecast)
    for (let i = -3; i <= 3; i++) {
      const d = addMonths(now, i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM yy');
      const isFuture = i > 0;

      if (isFuture) {
        // Forecast based on due dates
        const expectedIn = arInvoices.filter(inv => inv.doc_due_date && inv.doc_due_date >= start && inv.doc_due_date <= end && (inv.balance_due || 0) > 0)
          .reduce((s, inv) => s + (inv.balance_due || 0), 0);
        const expectedOut = apInvoices.filter(inv => inv.doc_due_date && inv.doc_due_date >= start && inv.doc_due_date <= end && inv.status !== 'paid')
          .reduce((s, inv) => s + (inv.total || 0), 0);
        months.push({ month: label, actual_in: 0, actual_out: 0, forecast_in: expectedIn, forecast_out: expectedOut, balance: expectedIn - expectedOut });
      } else {
        const actualIn = payments.filter(p => p.doc_date >= start && p.doc_date <= end && p.status !== 'cancelled')
          .reduce((s, p) => s + (p.total_amount || 0), 0);
        const actualOut = apInvoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end)
          .reduce((s, inv) => s + (inv.total || 0), 0);
        months.push({ month: label, actual_in: actualIn, actual_out: actualOut, forecast_in: 0, forecast_out: 0, balance: actualIn - actualOut });
      }
    }

    return months;
  }, [arInvoices, apInvoices, payments]);

  const upcomingReceivables = arInvoices.filter(i => (i.balance_due || 0) > 0).reduce((s, i) => s + (i.balance_due || 0), 0);
  const upcomingPayables = apInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
  const netForecast = upcomingReceivables - upcomingPayables;
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Cash Flow Forecast
          <Badge variant={netForecast >= 0 ? 'default' : 'destructive'} className="text-[10px] ml-auto">
            Net: SAR {fmt(netForecast)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Expected Inflow</p>
            <p className="text-sm font-bold text-green-600">SAR {fmt(upcomingReceivables)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Expected Outflow</p>
            <p className="text-sm font-bold text-red-600">SAR {fmt(upcomingPayables)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Net Position</p>
            <p className={`text-sm font-bold ${netForecast >= 0 ? 'text-green-600' : 'text-red-600'}`}>SAR {fmt(netForecast)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
            <Legend />
            <ReferenceLine x={forecastData.find(d => d.forecast_in > 0)?.month} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Forecast →" />
            <Area type="monotone" dataKey="actual_in" name="Actual Inflow" fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <Area type="monotone" dataKey="actual_out" name="Actual Outflow" fill="hsl(var(--chart-4))" fillOpacity={0.3} stroke="hsl(var(--chart-4))" strokeWidth={2} />
            <Area type="monotone" dataKey="forecast_in" name="Forecast In" fill="hsl(var(--chart-2))" fillOpacity={0.1} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="forecast_out" name="Forecast Out" fill="hsl(var(--chart-4))" fillOpacity={0.1} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
