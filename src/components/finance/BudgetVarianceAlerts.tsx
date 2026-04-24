import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function BudgetVarianceAlerts() {
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['budget-var-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('total, doc_date, customer_name').limit(1000);
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['budget-var-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('total, doc_date, vendor_name').limit(1000);
      return data || [];
    },
  });

  // Simple budget simulation based on averages
  const analysis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Calculate monthly averages
    const monthlyRevenue: Record<number, number> = {};
    const monthlyExpenses: Record<number, number> = {};

    arInvoices.forEach(i => {
      const m = new Date(i.doc_date).getMonth();
      monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (i.total || 0);
    });

    apInvoices.forEach(i => {
      const m = new Date(i.doc_date).getMonth();
      monthlyExpenses[m] = (monthlyExpenses[m] || 0) + (i.total || 0);
    });

    const avgRevenue = Object.values(monthlyRevenue).reduce((s, v) => s + v, 0) / Math.max(Object.keys(monthlyRevenue).length, 1);
    const avgExpenses = Object.values(monthlyExpenses).reduce((s, v) => s + v, 0) / Math.max(Object.keys(monthlyExpenses).length, 1);

    const currentRevenue = monthlyRevenue[currentMonth] || 0;
    const currentExpenses = monthlyExpenses[currentMonth] || 0;

    return [
      {
        category: 'Revenue',
        budget: avgRevenue,
        actual: currentRevenue,
        variance: currentRevenue - avgRevenue,
        variancePct: avgRevenue > 0 ? ((currentRevenue - avgRevenue) / avgRevenue * 100) : 0,
        isOver: currentRevenue >= avgRevenue,
      },
      {
        category: 'Expenses',
        budget: avgExpenses,
        actual: currentExpenses,
        variance: currentExpenses - avgExpenses,
        variancePct: avgExpenses > 0 ? ((currentExpenses - avgExpenses) / avgExpenses * 100) : 0,
        isOver: currentExpenses > avgExpenses,
      },
      {
        category: 'Net Margin',
        budget: avgRevenue - avgExpenses,
        actual: currentRevenue - currentExpenses,
        variance: (currentRevenue - currentExpenses) - (avgRevenue - avgExpenses),
        variancePct: (avgRevenue - avgExpenses) > 0 ? (((currentRevenue - currentExpenses) - (avgRevenue - avgExpenses)) / (avgRevenue - avgExpenses) * 100) : 0,
        isOver: (currentRevenue - currentExpenses) >= (avgRevenue - avgExpenses),
      },
    ];
  }, [arInvoices, apInvoices]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Budget vs Actual (Current Month)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.map(item => {
          const progress = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 150) : 0;
          const isGood = item.category === 'Expenses' ? !item.isOver : item.isOver;
          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGood ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                  <span className="text-xs font-medium">{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Target: SAR {fmt(item.budget)}</span>
                  <Badge variant={isGood ? 'default' : 'destructive'} className="text-[10px]">
                    {item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Actual: SAR {fmt(item.actual)}</span>
                <span>Variance: {item.variance >= 0 ? '+' : '-'}SAR {fmt(item.variance)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
