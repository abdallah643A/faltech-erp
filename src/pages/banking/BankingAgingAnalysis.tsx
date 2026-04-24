import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, AlertTriangle, TrendingUp, DollarSign, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { differenceInDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc', header: 'Doc #' },
  { key: 'due_date', header: 'Due Date' },
  { key: 'days', header: 'Days' },
];


const AGING_BUCKETS = [
  { label: 'Current', min: 0, max: 0, color: 'hsl(var(--chart-2))' },
  { label: '1-30 Days', min: 1, max: 30, color: 'hsl(210, 60%, 55%)' },
  { label: '31-60 Days', min: 31, max: 60, color: 'hsl(45, 90%, 50%)' },
  { label: '61-90 Days', min: 61, max: 90, color: 'hsl(30, 90%, 55%)' },
  { label: '90+ Days', min: 91, max: 99999, color: 'hsl(var(--destructive))' },
];

export default function BankingAgingAnalysis() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const [tab, setTab] = useState('receivables');

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['aging-ar', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, doc_num, customer_name, total, balance_due, doc_date, doc_due_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['aging-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('id, invoice_number, vendor_name, total, doc_date, doc_due_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);
  const today = new Date();

  const getAgingDays = (dueDate: string | null) => {
    if (!dueDate) return 0;
    const days = differenceInDays(today, new Date(dueDate));
    return Math.max(0, days);
  };

  const getBucket = (days: number) => AGING_BUCKETS.find(b => days >= b.min && days <= b.max) || AGING_BUCKETS[4];

  // Receivables aging
  const arAging = useMemo(() => {
    const openInvoices = arInvoices.filter(i => (i.balance_due || 0) > 0 && i.status !== 'paid' && i.status !== 'cancelled');
    const buckets = AGING_BUCKETS.map(b => ({
      ...b,
      amount: 0,
      count: 0,
      invoices: [] as typeof openInvoices,
    }));

    openInvoices.forEach(inv => {
      const days = getAgingDays(inv.doc_due_date);
      const bucket = buckets.find(b => days >= b.min && days <= b.max) || buckets[4];
      bucket.amount += inv.balance_due || 0;
      bucket.count++;
      bucket.invoices.push(inv);
    });

    return buckets;
  }, [arInvoices]);

  // Payables aging
  const apAging = useMemo(() => {
    const openInvoices = apInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    const buckets = AGING_BUCKETS.map(b => ({
      ...b,
      amount: 0,
      count: 0,
      invoices: [] as typeof openInvoices,
    }));

    openInvoices.forEach(inv => {
      const days = getAgingDays(inv.doc_due_date);
      const bucket = buckets.find(b => days >= b.min && days <= b.max) || buckets[4];
      bucket.amount += inv.total || 0;
      bucket.count++;
      bucket.invoices.push(inv);
    });

    return buckets;
  }, [apInvoices]);

  const activeAging = tab === 'receivables' ? arAging : apAging;
  const totalOutstanding = activeAging.reduce((s, b) => s + b.amount, 0);
  const overdueAmount = activeAging.filter(b => b.min > 0).reduce((s, b) => s + b.amount, 0);
  const criticalAmount = activeAging.filter(b => b.min >= 61).reduce((s, b) => s + b.amount, 0);

  // Pie chart data
  const pieData = activeAging.filter(b => b.amount > 0).map(b => ({ name: b.label, value: b.amount, fill: b.color }));

  // Recommendations
  const recommendations = useMemo(() => {
    const recs: { text: string; severity: 'high' | 'medium' | 'low'; action: string }[] = [];
    const aging = tab === 'receivables' ? arAging : apAging;

    if (aging[4].count > 0) {
      recs.push({
        text: `${aging[4].count} ${tab === 'receivables' ? 'invoices' : 'bills'} over 90 days (SAR ${fmt(aging[4].amount)})`,
        severity: 'high',
        action: tab === 'receivables' ? 'Initiate collection calls or escalate to dunning' : 'Negotiate extended payment terms or prioritize payment',
      });
    }
    if (aging[3].count > 0) {
      recs.push({
        text: `${aging[3].count} items in 61-90 day bucket`,
        severity: 'medium',
        action: tab === 'receivables' ? 'Send reminder notices and follow up' : 'Schedule for next payment batch',
      });
    }
    if (overdueAmount > totalOutstanding * 0.5) {
      recs.push({
        text: `Over 50% of outstanding amount is overdue`,
        severity: 'high',
        action: 'Review credit policies and collection procedures',
      });
    }
    if (recs.length === 0) {
      recs.push({ text: 'Aging profile looks healthy', severity: 'low', action: 'Continue monitoring' });
    }
    return recs;
  }, [tab, arAging, apAging, overdueAmount, totalOutstanding]);

  const exportCSV = () => {
  const { t } = useLanguage();

    const aging = tab === 'receivables' ? arAging : apAging;
    const rows = aging.flatMap(b => b.invoices.map((inv: any) => ({
      bucket: b.label,
      doc: tab === 'receivables' ? `AR-${inv.doc_num}` : inv.invoice_number,
      partner: tab === 'receivables' ? inv.customer_name : inv.vendor_name,
      amount: tab === 'receivables' ? inv.balance_due : inv.total,
      dueDate: inv.doc_due_date || '',
      days: getAgingDays(inv.doc_due_date),
    })));
    const csv = 'Bucket,Document,Partner,Amount,Due Date,Days Overdue\n' +
      rows.map(r => `${r.bucket},${r.doc},${r.partner},${r.amount},${r.dueDate},${r.days}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aging-${tab}-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    toast({ title: 'Exported', description: `Aging report exported` });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aging Analysis</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="banking-aging-analysis" title="Banking Aging Analysis" />
          <p className="text-sm text-muted-foreground">Receivables & payables aging with automated recommendations</p>
        </div>
        <Button size="sm" onClick={exportCSV}>
          <FileSpreadsheet className="h-3 w-3 mr-1" /> Export
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="receivables"><ArrowDownLeft className="h-3 w-3 mr-1" /> Receivables</TabsTrigger>
          <TabsTrigger value="payables"><ArrowUpRight className="h-3 w-3 mr-1" /> Payables</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-6 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-xl font-bold">SAR {fmt(totalOutstanding)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-amber-600">SAR {fmt(overdueAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Critical (60+ days)</p>
                <p className="text-xl font-bold text-destructive">SAR {fmt(criticalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Current Ratio</p>
                <p className="text-xl font-bold">
                  {totalOutstanding > 0 ? `${Math.round(((activeAging[0]?.amount || 0) / totalOutstanding) * 100)}%` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{tab === 'receivables' ? 'Receivables' : 'Payables'} Aging Buckets</CardTitle>
              </CardHeader>
              <CardContent>
                {activeAging.every(b => b.amount === 0) ? (
                  <EmptyChartState message="No aging data available" height={300} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activeAging as any}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                      <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                        {activeAging.map((b, i) => <Cell key={i} fill={b.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Automated Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 border rounded-lg p-3">
                  <Badge variant={r.severity === 'high' ? 'destructive' : r.severity === 'medium' ? 'secondary' : 'outline'} className="text-[10px] mt-0.5">
                    {r.severity.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="text-xs font-medium">{r.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">→ {r.action}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Aging Detail Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aging Detail by Bucket</CardTitle>
            </CardHeader>
            <CardContent>
              {activeAging.map((bucket, bi) => (
                bucket.invoices.length > 0 && (
                  <div key={bi} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bucket.color }} />
                      <span className="text-xs font-semibold">{bucket.label}</span>
                      <Badge variant="outline" className="text-[10px]">{bucket.count} items • SAR {fmt(bucket.amount)}</Badge>
                    </div>
                    <table className="w-full text-xs mb-2">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left p-1">Doc #</th>
                          <th className="text-left p-1">{tab === 'receivables' ? 'Customer' : 'Vendor'}</th>
                          <th className="text-right p-1">{t('common.amount')}</th>
                          <th className="text-left p-1">Due Date</th>
                          <th className="text-right p-1">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.invoices.slice(0, 5).map((inv: any, ii: number) => (
                          <tr key={ii} className="border-b">
                            <td className="p-1">{tab === 'receivables' ? `AR-${inv.doc_num}` : inv.invoice_number}</td>
                            <td className="p-1 max-w-[180px] truncate">{tab === 'receivables' ? inv.customer_name : inv.vendor_name}</td>
                            <td className="p-1 text-right">{fmt(tab === 'receivables' ? (inv.balance_due || 0) : (inv.total || 0))}</td>
                            <td className="p-1">{inv.doc_due_date || '—'}</td>
                            <td className="p-1 text-right">{getAgingDays(inv.doc_due_date)}</td>
                          </tr>
                        ))}
                        {bucket.invoices.length > 5 && (
                          <tr><td colSpan={5} className="p-1 text-muted-foreground text-center">+{bucket.invoices.length - 5} more</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
