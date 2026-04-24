import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CashFlowForecastCockpit() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', expected_date: '', category: 'collections', direction: 'inflow', confidence: 'medium' });

  const { data: items = [] } = useQuery({
    queryKey: ['cash-flow-forecast', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cash_flow_forecast_items' as any).select('*').order('expected_date') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Aggregate AR invoices as projected inflows
  const { data: arInvoices = [] } = useQuery({
    queryKey: ['cf-ar-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('doc_num, customer_name, balance_due, doc_due_date, status').eq('status', 'open') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []).map((i: any) => ({ ...i, direction: 'inflow', category: 'collections', amount: i.balance_due || 0, expected_date: i.doc_due_date }));
    },
  });

  // Aggregate AP invoices as projected outflows
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['cf-ap-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('invoice_number, vendor_name, total, doc_due_date, status').eq('status', 'open') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []).map((i: any) => ({ ...i, direction: 'outflow', category: 'payables', amount: i.total || 0, expected_date: i.doc_due_date }));
    },
  });

  const allItems = useMemo(() => {
    const manual = items.map((i: any) => ({ ...i, source: 'manual' }));
    const ar = arInvoices.filter((i: any) => i.expected_date).map((i: any) => ({ ...i, source: 'ar_invoice', description: `AR #${i.doc_num} - ${i.customer_name}` }));
    const ap = apInvoices.filter((i: any) => i.expected_date).map((i: any) => ({ ...i, source: 'ap_invoice', description: `AP ${i.invoice_number} - ${i.vendor_name}` }));
    return [...manual, ...ar, ...ap];
  }, [items, arInvoices, apInvoices]);

  const chartData = useMemo(() => {
    const periods: any[] = [];
    const now = new Date();
    const count = view === 'weekly' ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const start = view === 'weekly' ? startOfWeek(addWeeks(now, i)) : startOfMonth(addMonths(now, i));
      const end = view === 'weekly' ? endOfWeek(addWeeks(now, i)) : endOfMonth(addMonths(now, i));
      const label = view === 'weekly' ? `W${i + 1} ${format(start, 'MMM d')}` : format(start, 'MMM yyyy');
      const periodItems = allItems.filter((it: any) => {
        try { return isWithinInterval(parseISO(it.expected_date), { start, end }); } catch { return false; }
      });
      const inflow = periodItems.filter((it: any) => it.direction === 'inflow').reduce((s: number, it: any) => s + Number(it.amount || 0), 0);
      const outflow = periodItems.filter((it: any) => it.direction === 'outflow').reduce((s: number, it: any) => s + Number(it.amount || 0), 0);
      periods.push({ label, inflow, outflow, net: inflow - outflow });
    }
    // cumulative
    let cum = 0;
    return periods.map(p => { cum += p.net; return { ...p, cumulative: cum }; });
  }, [allItems, view]);

  const totals = useMemo(() => {
    const totalIn = allItems.filter((i: any) => i.direction === 'inflow').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const totalOut = allItems.filter((i: any) => i.direction === 'outflow').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [allItems]);

  const riskWeeks = chartData.filter(p => p.cumulative < 0);

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('cash_flow_forecast_items' as any).insert({
        ...form, amount: Number(form.amount), ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-flow-forecast'] }); setShowAdd(false); setForm({ description: '', amount: '', expected_date: '', category: 'collections', direction: 'inflow', confidence: 'medium' }); toast.success('Item added'); },
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow Forecast</h1>
          <p className="text-muted-foreground">Projected inflows, outflows, and net position</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Forecast Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Forecast Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t('common.description')}</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('common.amount')}</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><Label>Expected Date</Label><Input type="date" value={form.expected_date} onChange={e => setForm(p => ({ ...p, expected_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Direction</Label><Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inflow">Inflow</SelectItem><SelectItem value="outflow">Outflow</SelectItem></SelectContent></Select></div>
                <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="collections">Collections</SelectItem><SelectItem value="payables">Payables</SelectItem><SelectItem value="payroll">Payroll</SelectItem><SelectItem value="retention">Retention</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div><Label>Confidence</Label><Select value={form.confidence} onValueChange={v => setForm(p => ({ ...p, confidence: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
              </div>
              <Button className="w-full" onClick={() => addItem.mutate()} disabled={!form.description || !form.amount || !form.expected_date}>{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Total Inflows</p><p className="text-2xl font-bold text-green-600">{fmt(totals.totalIn)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-red-500" /><div><p className="text-sm text-muted-foreground">Total Outflows</p><p className="text-2xl font-bold text-red-600">{fmt(totals.totalOut)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Net Position</p><p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.net)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className={`h-8 w-8 ${riskWeeks.length > 0 ? 'text-red-500' : 'text-green-500'}`} /><div><p className="text-sm text-muted-foreground">Cash Risk Periods</p><p className="text-2xl font-bold">{riskWeeks.length}</p></div></div></CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Forecast Timeline</CardTitle>
          <div className="flex gap-2">
            <Button variant={view === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setView('weekly')}>Weekly</Button>
            <Button variant={view === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setView('monthly')}>Monthly</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Legend />
              <Area type="monotone" dataKey="inflow" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Inflows" />
              <Area type="monotone" dataKey="outflow" fill="hsl(0 84% 60% / 0.2)" stroke="hsl(0 84% 60%)" name="Outflows" />
              <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--accent-foreground))" strokeWidth={2} name="Cumulative" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader><CardTitle>Forecast Items ({allItems.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('common.description')}</TableHead><TableHead>Direction</TableHead><TableHead>Category</TableHead><TableHead>{t('common.amount')}</TableHead><TableHead>Expected Date</TableHead><TableHead>Confidence</TableHead><TableHead>Source</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {allItems.slice(0, 50).map((item: any, i: number) => (
                <TableRow key={item.id || i}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell><Badge variant={item.direction === 'inflow' ? 'default' : 'destructive'}>{item.direction}</Badge></TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className={item.direction === 'inflow' ? 'text-green-600' : 'text-red-600'}>{fmt(Number(item.amount || 0))}</TableCell>
                  <TableCell>{item.expected_date ? format(parseISO(item.expected_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell><Badge variant="outline">{item.confidence || 'medium'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{item.source || 'manual'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
