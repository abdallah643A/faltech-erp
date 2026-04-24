import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart3, Plus, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const BVA_MODULES = ['sales','procurement','payroll','projects','production','collections'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BudgetVsActual() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [filterModule, setFilterModule] = useState('all');
  const [filterYear, setFilterYear] = useState(currentYear);

  const { data: records = [] } = useQuery({
    queryKey: ['budget-actuals', activeCompanyId, filterYear],
    queryFn: async () => {
      let q = (supabase.from('budget_actuals' as any).select('*') as any).eq('period_year', filterYear).order('period_month');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ module: 'sales', category: '', period_year: currentYear, period_month: new Date().getMonth() + 1, budget_amount: 0, actual_amount: 0 });

  const saveRecord = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('budget_actuals' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-actuals'] }); setDialog(false); toast({ title: 'Saved' }); },
  });

  const filtered = filterModule === 'all' ? records : records.filter((r: any) => r.module === filterModule);

  // Chart data - aggregate by month
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const monthRecords = filtered.filter((r: any) => r.period_month === i + 1);
    return {
      month: MONTHS[i],
      budget: monthRecords.reduce((s: number, r: any) => s + Number(r.budget_amount || 0), 0),
      actual: monthRecords.reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0),
    };
  }).filter(d => d.budget > 0 || d.actual > 0);

  const totalBudget = filtered.reduce((s: number, r: any) => s + Number(r.budget_amount || 0), 0);
  const totalActual = filtered.reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0);
  const totalVariance = totalBudget - totalActual;
  const variancePct = totalBudget > 0 ? ((totalVariance / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Budget vs Actual Control Center</h1>
          <p className="text-muted-foreground text-sm">Compare planned vs actual performance across modules</p>
        </div>
        <Button onClick={() => { setForm({ module: 'sales', category: '', period_year: currentYear, period_month: new Date().getMonth() + 1, budget_amount: 0, actual_amount: 0 }); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Budget</div><div className="text-2xl font-bold">{totalBudget.toLocaleString()} SAR</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Actual</div><div className="text-2xl font-bold">{totalActual.toLocaleString()} SAR</div></CardContent></Card>
        <Card className={totalVariance < 0 ? 'border-destructive' : ''}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Variance</div><div className={`text-2xl font-bold flex items-center gap-1 ${totalVariance >= 0 ? 'text-primary' : 'text-destructive'}`}>{totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}{Math.abs(totalVariance).toLocaleString()} SAR</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Variance %</div><div className={`text-2xl font-bold ${variancePct >= 0 ? 'text-primary' : 'text-destructive'}`}>{variancePct.toFixed(1)}%</div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={filterModule} onValueChange={setFilterModule}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{BVA_MODULES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent></Select>
        <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Budget vs Actual Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => v.toLocaleString() + ' SAR'} />
                <Bar dataKey="budget" fill="hsl(var(--primary))" opacity={0.4} name="Budget" />
                <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Category</TableHead><TableHead>Period</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead><TableHead>Variance</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="secondary">{r.module}</Badge></TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{MONTHS[(r.period_month || 1) - 1]} {r.period_year}</TableCell>
                  <TableCell className="font-mono">{Number(r.budget_amount).toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{Number(r.actual_amount).toLocaleString()}</TableCell>
                  <TableCell className={`font-mono ${Number(r.variance_amount) >= 0 ? 'text-primary' : 'text-destructive'}`}>{Number(r.variance_amount).toLocaleString()}</TableCell>
                  <TableCell className={`font-mono ${Number(r.variance_pct) >= 0 ? 'text-primary' : 'text-destructive'}`}>{Number(r.variance_pct).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Budget Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BVA_MODULES.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Revenue, Direct Cost" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Year</Label><Input type="number" value={form.period_year} onChange={e => setForm({ ...form, period_year: parseInt(e.target.value) || currentYear })} /></div>
              <div><Label>Month</Label><Select value={String(form.period_month)} onValueChange={v => setForm({ ...form, period_month: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Budget Amount</Label><Input type="number" value={form.budget_amount} onChange={e => setForm({ ...form, budget_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Actual Amount</Label><Input type="number" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => saveRecord.mutate(form)} disabled={!form.module || !form.category}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
