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
import { Plus, HardDrive, DollarSign, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FixedAssetsRegister() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ assetCode: '', assetName: '', category: '', acquisitionDate: '', acquisitionCost: '', salvageValue: '0', usefulLife: '5', depMethod: 'straight_line', location: '' });

  const { data: assets = [] } = useQuery({
    queryKey: ['fixed-assets-register', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('fixed_assets' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createAsset = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const cost = parseFloat(f.acquisitionCost) || 0;
      const { error } = await (supabase.from('fixed_assets' as any).insert({
        asset_code: f.assetCode, asset_name: f.assetName, category: f.category,
        acquisition_date: f.acquisitionDate, acquisition_cost: cost,
        salvage_value: parseFloat(f.salvageValue) || 0, useful_life_years: parseInt(f.usefulLife) || 5,
        depreciation_method: f.depMethod, book_value: cost, location: f.location,
        created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed-assets-register'] }); toast.success('Asset registered'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalCost = assets.reduce((s: number, a: any) => s + Number(a.acquisition_cost || 0), 0);
  const totalBook = assets.reduce((s: number, a: any) => s + Number(a.book_value || 0), 0);
  const totalDep = assets.reduce((s: number, a: any) => s + Number(a.accumulated_depreciation || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fixed Assets Register</h1>
          <p className="text-muted-foreground">Asset master records, depreciation, transfers and disposals</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Register Asset</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Asset Code</Label><Input value={form.assetCode} onChange={e => setForm(f => ({ ...f, assetCode: e.target.value }))} /></div>
                <div><Label>Asset Name</Label><Input value={form.assetName} onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Machinery, Vehicles" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              </div>
              <div><Label>Acquisition Date</Label><Input type="date" value={form.acquisitionDate} onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Cost</Label><Input type="number" value={form.acquisitionCost} onChange={e => setForm(f => ({ ...f, acquisitionCost: e.target.value }))} /></div>
                <div><Label>Salvage</Label><Input type="number" value={form.salvageValue} onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} /></div>
                <div><Label>Life (yrs)</Label><Input type="number" value={form.usefulLife} onChange={e => setForm(f => ({ ...f, usefulLife: e.target.value }))} /></div>
              </div>
              <div><Label>Depreciation Method</Label>
                <Select value={form.depMethod} onValueChange={v => setForm(f => ({ ...f, depMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="declining_balance">Declining Balance</SelectItem>
                    <SelectItem value="sum_of_years">Sum of Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createAsset.mutate(form)} disabled={createAsset.isPending} className="w-full">Register</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Assets</p><p className="text-2xl font-bold">{assets.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Cost</p><p className="text-2xl font-bold">{totalCost.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Book Value</p><p className="text-2xl font-bold">{totalBook.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Accumulated Dep.</p><p className="text-2xl font-bold">{totalDep.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Category</TableHead><TableHead>Acquisition</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Book Value</TableHead><TableHead>{t('common.status')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {assets.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.asset_code}</TableCell>
                  <TableCell className="font-medium">{a.asset_name}</TableCell>
                  <TableCell>{a.category || '—'}</TableCell>
                  <TableCell>{a.acquisition_date || '—'}</TableCell>
                  <TableCell className="text-right">{Number(a.acquisition_cost).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(a.book_value).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No fixed assets registered</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
