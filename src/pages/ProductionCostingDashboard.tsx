import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Plus, Factory, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const COST_TYPES = ['material', 'labor', 'machine', 'overhead', 'scrap'];
const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(45 93% 47%)', 'hsl(262 83% 58%)', 'hsl(0 84% 60%)'];

export default function ProductionCostingDashboard() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ production_order_ref: '', item_name: '', cost_type: 'material', planned_amount: '', actual_amount: '', quantity_planned: '', quantity_actual: '', scrap_quantity: '0' });

  const { data: costs = [] } = useQuery({
    queryKey: ['production-costs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('production_cost_actuals' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addCost = useMutation({
    mutationFn: async () => {
      const qtyP = Number(form.quantity_planned) || 0;
      const qtyA = Number(form.quantity_actual) || 0;
      const scrap = Number(form.scrap_quantity) || 0;
      const yieldPct = qtyP > 0 ? ((qtyA - scrap) / qtyP) * 100 : 100;
      const { error } = await (supabase.from('production_cost_actuals' as any).insert({
        ...form, planned_amount: Number(form.planned_amount), actual_amount: Number(form.actual_amount),
        quantity_planned: qtyP, quantity_actual: qtyA, scrap_quantity: scrap, yield_percent: Math.round(yieldPct * 100) / 100,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['production-costs'] }); setShowAdd(false); toast.success('Cost record added'); },
  });

  const totalPlanned = costs.reduce((s: number, c: any) => s + Number(c.planned_amount || 0), 0);
  const totalActual = costs.reduce((s: number, c: any) => s + Number(c.actual_amount || 0), 0);
  const totalVariance = totalActual - totalPlanned;
  const totalScrap = costs.reduce((s: number, c: any) => s + Number(c.scrap_quantity || 0), 0);
  const avgYield = costs.length > 0 ? costs.reduce((s: number, c: any) => s + Number(c.yield_percent || 0), 0) / costs.length : 100;

  const byType = COST_TYPES.map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    planned: costs.filter((c: any) => c.cost_type === t).reduce((s: number, c: any) => s + Number(c.planned_amount || 0), 0),
    actual: costs.filter((c: any) => c.cost_type === t).reduce((s: number, c: any) => s + Number(c.actual_amount || 0), 0),
  }));

  const pieData = COST_TYPES.map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: costs.filter((c: any) => c.cost_type === t).reduce((s: number, c: any) => s + Number(c.actual_amount || 0), 0),
  })).filter(d => d.value > 0);

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Production Costing</h1><p className="text-muted-foreground">Planned vs actual costs by production order</p></div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Cost Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Production Cost</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Order Ref</Label><Input value={form.production_order_ref} onChange={e => setForm(p => ({ ...p, production_order_ref: e.target.value }))} /></div>
                <div><Label>Item</Label><Input value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} /></div>
              </div>
              <div><Label>Cost Type</Label><Select value={form.cost_type} onValueChange={v => setForm(p => ({ ...p, cost_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Planned Amount</Label><Input type="number" value={form.planned_amount} onChange={e => setForm(p => ({ ...p, planned_amount: e.target.value }))} /></div>
                <div><Label>Actual Amount</Label><Input type="number" value={form.actual_amount} onChange={e => setForm(p => ({ ...p, actual_amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Qty Planned</Label><Input type="number" value={form.quantity_planned} onChange={e => setForm(p => ({ ...p, quantity_planned: e.target.value }))} /></div>
                <div><Label>Qty Actual</Label><Input type="number" value={form.quantity_actual} onChange={e => setForm(p => ({ ...p, quantity_actual: e.target.value }))} /></div>
                <div><Label>Scrap Qty</Label><Input type="number" value={form.scrap_quantity} onChange={e => setForm(p => ({ ...p, scrap_quantity: e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={() => addCost.mutate()}>{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6 text-center"><DollarSign className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-lg font-bold">{fmt(totalPlanned)}</p><p className="text-xs text-muted-foreground">Planned</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><DollarSign className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-lg font-bold">{fmt(totalActual)}</p><p className="text-xs text-muted-foreground">Actual</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><TrendingUp className={`h-6 w-6 mx-auto mb-1 ${totalVariance > 0 ? 'text-red-500' : 'text-green-500'}`} /><p className={`text-lg font-bold ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(totalVariance)}</p><p className="text-xs text-muted-foreground">Variance</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="h-6 w-6 mx-auto text-orange-500 mb-1" /><p className="text-lg font-bold">{totalScrap}</p><p className="text-xs text-muted-foreground">Scrap Units</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Factory className="h-6 w-6 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold">{avgYield.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Avg Yield</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Planned vs Actual by Type</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}><BarChart data={byType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis /><Tooltip formatter={(v: any) => fmt(v)} /><Legend /><Bar dataKey="planned" fill="hsl(var(--primary))" name="Planned" /><Bar dataKey="actual" fill="hsl(142 76% 36%)" name="Actual" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Cost Distribution</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => fmt(v)} /></PieChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Cost Records ({costs.length})</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Item</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead><TableHead>Variance</TableHead><TableHead>Yield</TableHead></TableRow></TableHeader>
          <TableBody>{costs.slice(0, 50).map((c: any) => (
            <TableRow key={c.id}><TableCell>{c.production_order_ref}</TableCell><TableCell>{c.item_name}</TableCell><TableCell><Badge variant="outline">{c.cost_type}</Badge></TableCell><TableCell>{fmt(Number(c.planned_amount || 0))}</TableCell><TableCell>{fmt(Number(c.actual_amount || 0))}</TableCell><TableCell className={Number(c.variance || 0) > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(Number(c.variance || 0))}</TableCell><TableCell>{Number(c.yield_percent || 0).toFixed(1)}%</TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
