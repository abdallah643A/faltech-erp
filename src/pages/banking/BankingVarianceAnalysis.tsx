import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart2, ArrowUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'actual', header: 'Actual' },
  { key: 'budget', header: 'Budget' },
  { key: 'variance', header: 'Variance' },
  { key: 'var', header: 'Var %' },
  { key: 'trend', header: 'Trend' },
  { key: 'root_cause', header: 'Root Cause' },
];


export default function BankingVarianceAnalysis() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [groupBy, setGroupBy] = useState<'month' | 'vendor' | 'type'>('month');

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['var-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('total, vendor_name, doc_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['var-ar', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('total, customer_name, doc_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: inPayments = [] } = useQuery({
    queryKey: ['var-in', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('total_amount, doc_date, status, payment_type').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['var-out', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('total_amount, doc_date, status, payment_type, vendor_name').limit(1000) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  // Compute variance by grouping
  const varianceData = useMemo(() => {
    if (groupBy === 'month') {
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const ms = format(startOfMonth(d), 'yyyy-MM-dd');
        const me = format(endOfMonth(d), 'yyyy-MM-dd');
        const label = format(d, 'MMM yy');

        const actualIn = inPayments.filter(p => p.doc_date >= ms && p.doc_date <= me && p.status === 'posted').reduce((s, p) => s + (p.total_amount || 0), 0);
        const actualOut = outPayments.filter((p: any) => p.doc_date >= ms && p.doc_date <= me && p.status === 'posted').reduce((s: number, p: any) => s + (p.total_amount || 0), 0);

        // Budget = average of all months as forecast (simple approximation)
        const totalInAll = inPayments.filter(p => p.status === 'posted').reduce((s, p) => s + (p.total_amount || 0), 0);
        const totalOutAll = outPayments.filter((p: any) => p.status === 'posted').reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
        const budgetIn = totalInAll / 6;
        const budgetOut = totalOutAll / 6;

        const varIn = actualIn - budgetIn;
        const varOut = actualOut - budgetOut;
        const varInPct = budgetIn > 0 ? (varIn / budgetIn * 100) : 0;
        const varOutPct = budgetOut > 0 ? (varOut / budgetOut * 100) : 0;

        months.push({
          name: label,
          actual_in: actualIn,
          budget_in: Math.round(budgetIn),
          variance_in: Math.round(varIn),
          variance_in_pct: Math.round(varInPct),
          actual_out: actualOut,
          budget_out: Math.round(budgetOut),
          variance_out: Math.round(varOut),
          variance_out_pct: Math.round(varOutPct),
          rootCause: Math.abs(varInPct) > 20 ? 'Seasonal' : Math.abs(varOutPct) > 20 ? 'Procurement spike' : 'Normal',
        });
      }
      return months;
    }

    if (groupBy === 'vendor') {
      const vendors: Record<string, { actual: number; count: number }> = {};
      outPayments.filter((p: any) => p.status === 'posted').forEach((p: any) => {
        const v = p.vendor_name || 'Unknown';
        if (!vendors[v]) vendors[v] = { actual: 0, count: 0 };
        vendors[v].actual += p.total_amount || 0;
        vendors[v].count++;
      });
      const avgPerVendor = Object.values(vendors).reduce((s, v) => s + v.actual, 0) / Math.max(Object.keys(vendors).length, 1);
      return Object.entries(vendors).slice(0, 10).map(([name, v]) => ({
        name: name.substring(0, 20),
        actual_out: v.actual,
        budget_out: Math.round(avgPerVendor),
        variance_out: Math.round(v.actual - avgPerVendor),
        variance_out_pct: Math.round(((v.actual - avgPerVendor) / avgPerVendor) * 100),
        rootCause: v.actual > avgPerVendor * 1.5 ? 'Above average' : 'Normal',
      }));
    }

    // By payment type
    const types: Record<string, { actual: number; count: number }> = {};
    [...inPayments, ...outPayments].filter((p: any) => p.status === 'posted').forEach((p: any) => {
      const t = p.payment_type || 'Other';
      if (!types[t]) types[t] = { actual: 0, count: 0 };
      types[t].actual += p.total_amount || 0;
      types[t].count++;
    });
    const avgPerType = Object.values(types).reduce((s, t) => s + t.actual, 0) / Math.max(Object.keys(types).length, 1);
    return Object.entries(types).map(([name, v]) => ({
      name,
      actual_out: v.actual,
      budget_out: Math.round(avgPerType),
      variance_out: Math.round(v.actual - avgPerType),
      variance_out_pct: Math.round(((v.actual - avgPerType) / avgPerType) * 100),
      rootCause: 'Distribution',
    }));
  }, [groupBy, inPayments, outPayments]);

  const totalVariance = varianceData.reduce((s, d) => s + (d.variance_out || 0), 0);
  const significantVariances = varianceData.filter(d => Math.abs(d.variance_out_pct || 0) > 15);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Variance Analysis</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="banking-variance-analysis" title="Banking Variance Analysis" />
          <p className="text-sm text-muted-foreground">Actual vs budget/forecast comparison with root cause analysis</p>
        </div>
        <Select value={groupBy} onValueChange={v => setGroupBy(v as any)}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">By Month</SelectItem>
            <SelectItem value="vendor">By Vendor</SelectItem>
            <SelectItem value="type">By Payment Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Variance</p>
            <p className={`text-xl font-bold ${totalVariance >= 0 ? 'text-destructive' : 'text-green-600'}`}>
              {totalVariance >= 0 ? '+' : ''}SAR {fmt(totalVariance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Significant Variances (&gt;15%)</p>
            <p className="text-xl font-bold text-amber-600">{significantVariances.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Periods Analyzed</p>
            <p className="text-xl font-bold">{varianceData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Variance Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Actual vs Budget — By {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</CardTitle>
        </CardHeader>
          <CardContent>
            {varianceData.length === 0 ? (
              <EmptyChartState message="No variance data available" height={320} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={varianceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <Bar dataKey="actual_out" name="Actual" fill="hsl(var(--primary))" />
                  <Bar dataKey="budget_out" name="Budget/Forecast" fill="hsl(var(--muted-foreground))" opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
      </Card>

      {/* Variance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Variance Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">{groupBy === 'month' ? 'Period' : groupBy === 'vendor' ? 'Vendor' : 'Type'}</th>
                <th className="text-right p-2">Actual</th>
                <th className="text-right p-2">Budget</th>
                <th className="text-right p-2">Variance</th>
                <th className="text-right p-2">Var %</th>
                <th className="text-center p-2">Trend</th>
                <th className="text-left p-2">Root Cause</th>
              </tr>
            </thead>
            <tbody>
              {varianceData.map((d, i) => {
                const isOver = (d.variance_out || 0) > 0;
                const pct = d.variance_out_pct || 0;
                return (
                  <tr key={i} className={`border-b ${Math.abs(pct) > 15 ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                    <td className="p-2 font-medium">{d.name}</td>
                    <td className="p-2 text-right">{fmt(d.actual_out || 0)}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(d.budget_out || 0)}</td>
                    <td className={`p-2 text-right font-medium ${isOver ? 'text-destructive' : 'text-green-600'}`}>
                      {isOver ? '+' : ''}{fmt(d.variance_out || 0)}
                    </td>
                    <td className="p-2 text-right">
                      <Badge variant={Math.abs(pct) > 15 ? 'destructive' : 'outline'} className="text-[10px]">
                        {pct > 0 ? '+' : ''}{pct}%
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      {isOver ? <TrendingUp className="h-3 w-3 text-destructive inline" /> : <TrendingDown className="h-3 w-3 text-green-600 inline" />}
                    </td>
                    <td className="p-2">{d.rootCause}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
