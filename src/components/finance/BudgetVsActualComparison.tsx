import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BudgetVsActualComparison() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [period, setPeriod] = useState<'3' | '6' | '12'>('6');

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['bva-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('total, doc_date').limit(1000);
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['bva-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('total, doc_date').limit(1000);
      return data || [];
    },
  });

  const months = Number(period);

  const chartData = useMemo(() => {
    const now = new Date();
    // Calculate average as "budget"
    const allMonthsRevenue: Record<string, number> = {};
    const allMonthsExpenses: Record<string, number> = {};

    arInvoices.forEach(i => {
      const key = format(new Date(i.doc_date), 'yyyy-MM');
      allMonthsRevenue[key] = (allMonthsRevenue[key] || 0) + (i.total || 0);
    });
    apInvoices.forEach(i => {
      const key = format(new Date(i.doc_date), 'yyyy-MM');
      allMonthsExpenses[key] = (allMonthsExpenses[key] || 0) + (i.total || 0);
    });

    const avgRevenue = Object.values(allMonthsRevenue).length > 0
      ? Object.values(allMonthsRevenue).reduce((s, v) => s + v, 0) / Object.values(allMonthsRevenue).length
      : 0;
    const avgExpenses = Object.values(allMonthsExpenses).length > 0
      ? Object.values(allMonthsExpenses).reduce((s, v) => s + v, 0) / Object.values(allMonthsExpenses).length
      : 0;

    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM');

      const actualRev = arInvoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end).reduce((s, inv) => s + (inv.total || 0), 0);
      const actualExp = apInvoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end).reduce((s, inv) => s + (inv.total || 0), 0);

      result.push({
        month: label,
        budgetRevenue: Math.round(avgRevenue),
        actualRevenue: actualRev,
        budgetExpenses: Math.round(avgExpenses),
        actualExpenses: actualExp,
        revenueVariance: actualRev - avgRevenue,
        expenseVariance: actualExp - avgExpenses,
      });
    }
    return result;
  }, [arInvoices, apInvoices, months]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));

  const totalBudgetRev = chartData.reduce((s, d) => s + d.budgetRevenue, 0);
  const totalActualRev = chartData.reduce((s, d) => s + d.actualRevenue, 0);
  const totalBudgetExp = chartData.reduce((s, d) => s + d.budgetExpenses, 0);
  const totalActualExp = chartData.reduce((s, d) => s + d.actualExpenses, 0);

  const revVariancePct = totalBudgetRev > 0 ? ((totalActualRev - totalBudgetRev) / totalBudgetRev * 100) : 0;
  const expVariancePct = totalBudgetExp > 0 ? ((totalActualExp - totalBudgetExp) / totalBudgetExp * 100) : 0;

  const VarianceIndicator = ({ value, inverse }: { value: number; inverse?: boolean }) => {
    const isGood = inverse ? value < 0 : value > 0;
    if (Math.abs(value) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return isGood ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {isAr ? 'الميزانية مقابل الفعلي' : 'Budget vs Actual'}
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 {isAr ? 'أشهر' : 'months'}</SelectItem>
              <SelectItem value="6">6 {isAr ? 'أشهر' : 'months'}</SelectItem>
              <SelectItem value="12">12 {isAr ? 'شهر' : 'months'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">{isAr ? 'الإيرادات' : 'REVENUE'}</span>
              <VarianceIndicator value={revVariancePct} />
            </div>
            <div className="flex justify-between text-xs">
              <span>{isAr ? 'الميزانية' : 'Budget'}: <b>SAR {fmt(totalBudgetRev)}</b></span>
              <span>{isAr ? 'الفعلي' : 'Actual'}: <b className="text-green-600">SAR {fmt(totalActualRev)}</b></span>
            </div>
            <Badge variant={revVariancePct >= 0 ? 'default' : 'destructive'} className="text-[10px]">
              {revVariancePct >= 0 ? '+' : ''}{revVariancePct.toFixed(1)}%
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">{isAr ? 'المصروفات' : 'EXPENSES'}</span>
              <VarianceIndicator value={expVariancePct} inverse />
            </div>
            <div className="flex justify-between text-xs">
              <span>{isAr ? 'الميزانية' : 'Budget'}: <b>SAR {fmt(totalBudgetExp)}</b></span>
              <span>{isAr ? 'الفعلي' : 'Actual'}: <b className="text-red-600">SAR {fmt(totalActualExp)}</b></span>
            </div>
            <Badge variant={expVariancePct <= 0 ? 'default' : 'destructive'} className="text-[10px]">
              {expVariancePct >= 0 ? '+' : ''}{expVariancePct.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Side-by-side bar chart */}
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="budgetRevenue" name={isAr ? 'ميزانية الإيرادات' : 'Budget Revenue'} fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" radius={[2, 2, 0, 0]} />
            <Bar dataKey="actualRevenue" name={isAr ? 'الإيرادات الفعلية' : 'Actual Revenue'} fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="budgetExpenses" name={isAr ? 'ميزانية المصروفات' : 'Budget Expenses'} fill="hsl(var(--chart-4))" fillOpacity={0.3} stroke="hsl(var(--chart-4))" strokeDasharray="3 3" radius={[2, 2, 0, 0]} />
            <Bar dataKey="actualExpenses" name={isAr ? 'المصروفات الفعلية' : 'Actual Expenses'} fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
