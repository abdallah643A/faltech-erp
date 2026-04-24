import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AssetBudgetPlanning = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ plan_name: '', fiscal_year: new Date().getFullYear().toString(), department: '', total_acquisition: '', total_maintenance: '', total_replacement: '', notes: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('asset_budget_plans' as any).select('*').order('fiscal_year', { ascending: false });
    setPlans((data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.plan_name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    const acq = parseFloat(form.total_acquisition) || 0;
    const maint = parseFloat(form.total_maintenance) || 0;
    const repl = parseFloat(form.total_replacement) || 0;
    const { error } = await supabase.from('asset_budget_plans' as any).insert({
      plan_name: form.plan_name, fiscal_year: parseInt(form.fiscal_year), department: form.department,
      total_acquisition: acq, total_maintenance: maint, total_replacement: repl,
      total_budget: acq + maint + repl, company_id: activeCompanyId, created_by: user?.id, status: 'draft', notes: form.notes,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Budget plan created' }); setShowAdd(false); fetchData();
  };

  const totalBudget = plans.reduce((s, p) => s + (p.total_budget || 0), 0);
  const totalActual = plans.reduce((s, p) => s + (p.total_actual || 0), 0);
  const chartData = plans.slice(0, 10).map(p => ({ name: `${p.fiscal_year}`, Budget: p.total_budget || 0, Actual: p.total_actual || 0 }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Budget Planning</h1><p className="text-sm text-muted-foreground">Capital planning: acquisitions, renewals, replacements, maintenance</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><DollarSign className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{totalBudget.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Budget</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalActual.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Actual</div></CardContent></Card>
        <Card><CardContent className="pt-4"><TrendingDown className="h-5 w-5 text-amber-600 mb-1" /><div className="text-2xl font-bold">{(totalBudget - totalActual).toLocaleString()}</div><div className="text-xs text-muted-foreground">Variance</div></CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Budget vs Actual by Year</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar dataKey="Budget" fill="#0066cc" /><Bar dataKey="Actual" fill="#1a7a4a" /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Plan Name</TableHead><TableHead>Year</TableHead><TableHead>Acquisition</TableHead><TableHead>Maintenance</TableHead><TableHead>Replacement</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.plan_name}</TableCell>
                <TableCell>{p.fiscal_year}</TableCell>
                <TableCell>{(p.total_acquisition || 0).toLocaleString()}</TableCell>
                <TableCell>{(p.total_maintenance || 0).toLocaleString()}</TableCell>
                <TableCell>{(p.total_replacement || 0).toLocaleString()}</TableCell>
                <TableCell className="font-bold">{(p.total_budget || 0).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Budget Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Plan Name *" value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Fiscal Year" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} />
              <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
            <Input type="number" placeholder="Acquisition Budget" value={form.total_acquisition} onChange={e => setForm({ ...form, total_acquisition: e.target.value })} />
            <Input type="number" placeholder="Maintenance Budget" value={form.total_maintenance} onChange={e => setForm({ ...form, total_maintenance: e.target.value })} />
            <Input type="number" placeholder="Replacement Budget" value={form.total_replacement} onChange={e => setForm({ ...form, total_replacement: e.target.value })} />
            <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetBudgetPlanning;
