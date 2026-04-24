import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Shield, Plus, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const InsuranceTracker = () => {
  const { activeCompanyId } = useActiveCompany();
  const [policies, setPolicies] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', insurer_name: '', policy_number: '', coverage_type: 'comprehensive', insured_value: '', premium_amount: '', deductible: '', start_date: '', end_date: '' });

  const load = async () => {
    const [eq, ins] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_insurance_policies' as any).select('*').order('end_date'),
    ]);
    setEquipment((eq.data || []) as any[]);
    setPolicies((ins.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const expiring = policies.filter(p => { const d = differenceInDays(new Date(p.end_date), new Date()); return d >= 0 && d <= 30; });
  const totalInsured = policies.reduce((s, p) => s + (p.insured_value || 0), 0);
  const totalPremium = policies.reduce((s, p) => s + (p.premium_amount || 0), 0);

  const handleSave = async () => {
    const { error } = await supabase.from('asset_insurance_policies' as any).insert({
      ...form, company_id: activeCompanyId, insured_value: parseFloat(form.insured_value) || 0,
      premium_amount: parseFloat(form.premium_amount) || 0, deductible: parseFloat(form.deductible) || 0,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Policy added'); setOpen(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Insurance Tracker</h1><p className="text-sm text-muted-foreground">Track policies, coverage, premiums, claims, and renewals</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Policy</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Insurer</Label><Input value={form.insurer_name} onChange={e => setForm({ ...form, insurer_name: e.target.value })} /></div><div><Label>Policy #</Label><Input value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div><div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div></div>
              <div className="grid grid-cols-3 gap-3"><div><Label>Insured Value</Label><Input type="number" value={form.insured_value} onChange={e => setForm({ ...form, insured_value: e.target.value })} /></div><div><Label>Premium</Label><Input type="number" value={form.premium_amount} onChange={e => setForm({ ...form, premium_amount: e.target.value })} /></div><div><Label>Deductible</Label><Input type="number" value={form.deductible} onChange={e => setForm({ ...form, deductible: e.target.value })} /></div></div>
              <Button onClick={handleSave}>Save Policy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Shield className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{policies.length}</div><div className="text-xs text-muted-foreground">Active Policies</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalInsured.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Insured (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalPremium.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Premium (SAR)</div></CardContent></Card>
        <Card className={expiring.length > 0 ? 'border-amber-500' : ''}><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-amber-600 mb-1" /><div className="text-2xl font-bold">{expiring.length}</div><div className="text-xs text-muted-foreground">Expiring ≤30 Days</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Insurance Policies</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Insurer</TableHead><TableHead>Policy #</TableHead><TableHead>Coverage</TableHead><TableHead>Insured</TableHead><TableHead>Premium</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {policies.map(p => { const d = differenceInDays(new Date(p.end_date), new Date()); return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{eqName(p.equipment_id)}</TableCell>
                <TableCell>{p.insurer_name}</TableCell>
                <TableCell>{p.policy_number}</TableCell>
                <TableCell><Badge variant="outline">{p.coverage_type}</Badge></TableCell>
                <TableCell>{p.insured_value?.toLocaleString()}</TableCell>
                <TableCell>{p.premium_amount?.toLocaleString()}</TableCell>
                <TableCell>{format(new Date(p.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{format(new Date(p.end_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell><Badge variant={d < 0 ? 'destructive' : d <= 30 ? 'default' : 'secondary'}>{d < 0 ? 'Expired' : d <= 30 ? `${d}d` : 'Active'}</Badge></TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default InsuranceTracker;
