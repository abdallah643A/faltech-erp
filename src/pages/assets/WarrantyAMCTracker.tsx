import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Shield, Plus, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const WarrantyAMCTracker = () => {
  const { activeCompanyId } = useActiveCompany();
  const [contracts, setContracts] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', contract_type: 'warranty', provider_name: '', policy_number: '', coverage_scope: '', start_date: '', end_date: '', response_sla_hours: '', premium_amount: '' });

  const fetch = async () => {
    const [eq, wc] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_warranty_contracts' as any).select('*').order('end_date', { ascending: true }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setContracts((wc.data || []) as any[]);
  };
  useEffect(() => { fetch(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const getStatus = (c: any) => {
    const days = differenceInDays(new Date(c.end_date), new Date());
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (days <= 30) return { label: `${days}d left`, variant: 'default' as const };
    return { label: 'Active', variant: 'secondary' as const };
  };

  const handleSave = async () => {
    const { error } = await supabase.from('asset_warranty_contracts' as any).insert({
      ...form, company_id: activeCompanyId, response_sla_hours: form.response_sla_hours ? parseInt(form.response_sla_hours) : null,
      premium_amount: form.premium_amount ? parseFloat(form.premium_amount) : 0,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Contract added'); setOpen(false); fetch();
  };

  const expiring = contracts.filter(c => { const d = differenceInDays(new Date(c.end_date), new Date()); return d >= 0 && d <= 30; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Warranty & AMC Tracker</h1><p className="text-sm text-muted-foreground">Track warranties, AMCs, coverage, and claims</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contract</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Warranty/AMC Contract</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={form.contract_type} onValueChange={v => setForm({ ...form, contract_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warranty">Warranty</SelectItem><SelectItem value="amc">AMC</SelectItem><SelectItem value="extended_warranty">Extended Warranty</SelectItem></SelectContent></Select></div>
              <div><Label>Provider</Label><Input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div><div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Policy Number</Label><Input value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} /></div><div><Label>Premium (SAR)</Label><Input type="number" value={form.premium_amount} onChange={e => setForm({ ...form, premium_amount: e.target.value })} /></div></div>
              <div><Label>Coverage Scope</Label><Textarea value={form.coverage_scope} onChange={e => setForm({ ...form, coverage_scope: e.target.value })} /></div>
              <Button onClick={handleSave}>Save Contract</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Shield className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{contracts.length}</div><div className="text-xs text-muted-foreground">Total Contracts</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{contracts.filter(c => c.contract_type === 'warranty').length}</div><div className="text-xs text-muted-foreground">Warranties</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{contracts.filter(c => c.contract_type === 'amc').length}</div><div className="text-xs text-muted-foreground">AMCs</div></CardContent></Card>
        <Card className={expiring.length > 0 ? 'border-amber-500' : ''}><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-amber-600 mb-1" /><div className="text-2xl font-bold">{expiring.length}</div><div className="text-xs text-muted-foreground">Expiring ≤30 Days</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">All Contracts</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Policy #</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Premium</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {contracts.map(c => { const s = getStatus(c); return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{eqName(c.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{c.contract_type}</Badge></TableCell>
                <TableCell>{c.provider_name}</TableCell>
                <TableCell>{c.policy_number || '-'}</TableCell>
                <TableCell>{format(new Date(c.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{format(new Date(c.end_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{c.premium_amount?.toLocaleString()} SAR</TableCell>
                <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default WarrantyAMCTracker;
