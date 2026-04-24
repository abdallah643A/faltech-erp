import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInMonths } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LeaseAccounting() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contractNumber: '', vendorName: '', leaseType: 'operating', assetDescription: '', startDate: '', endDate: '', monthlyAmount: '', location: '' });

  const { data: contracts = [] } = useQuery({
    queryKey: ['lease-contracts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('lease_contracts' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createContract = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const monthly = parseFloat(f.monthlyAmount) || 0;
      const months = f.startDate && f.endDate ? differenceInMonths(new Date(f.endDate), new Date(f.startDate)) : 12;
      const { error } = await (supabase.from('lease_contracts' as any).insert({
        contract_number: f.contractNumber, vendor_name: f.vendorName, lease_type: f.leaseType,
        asset_description: f.assetDescription, start_date: f.startDate, end_date: f.endDate,
        monthly_amount: monthly, annual_amount: monthly * 12, total_liability: monthly * months,
        remaining_liability: monthly * months, location: f.location, created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lease-contracts'] }); toast.success('Lease contract created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalLiability = contracts.reduce((s: number, c: any) => s + Number(c.remaining_liability || 0), 0);
  const monthlyTotal = contracts.reduce((s: number, c: any) => s + Number(c.monthly_amount || 0), 0);
  const expiringContracts = contracts.filter((c: any) => {
    if (!c.end_date) return false;
    const days = (new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 90 && days > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lease Accounting</h1>
          <p className="text-muted-foreground">Track lease contracts, payments, liabilities and renewals</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Lease</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Lease Contract</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contract Number</Label><Input value={form.contractNumber} onChange={e => setForm(f => ({ ...f, contractNumber: e.target.value }))} /></div>
                <div><Label>Vendor</Label><Input value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} /></div>
              </div>
              <div><Label>Asset Description</Label><Input value={form.assetDescription} onChange={e => setForm(f => ({ ...f, assetDescription: e.target.value }))} placeholder="e.g. Office space, Vehicle" /></div>
              <div><Label>{t('common.type')}</Label>
                <Select value={form.leaseType} onValueChange={v => setForm(f => ({ ...f, leaseType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="operating">Operating</SelectItem><SelectItem value="finance">Finance</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Monthly Amount</Label><Input type="number" value={form.monthlyAmount} onChange={e => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              </div>
              <Button onClick={() => createContract.mutate(form)} disabled={createContract.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active Leases</p><p className="text-2xl font-bold">{contracts.filter((c: any) => c.status === 'active').length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Monthly Expense</p><p className="text-2xl font-bold">{monthlyTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Liability</p><p className="text-2xl font-bold">{totalLiability.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><p className="text-sm text-muted-foreground">Expiring ≤90d</p></div><p className="text-2xl font-bold">{expiringContracts.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lease Contracts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Vendor</TableHead><TableHead>Asset</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Monthly</TableHead><TableHead>{t('common.status')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {contracts.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.contract_number}</TableCell>
                  <TableCell>{c.vendor_name}</TableCell>
                  <TableCell>{c.asset_description || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{c.lease_type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.start_date} → {c.end_date}</TableCell>
                  <TableCell className="text-right">{Number(c.monthly_amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No lease contracts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
