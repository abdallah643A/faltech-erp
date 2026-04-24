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
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AssetDisposalPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const [disposals, setDisposals] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', disposal_type: 'sale', disposal_reason: '', book_value: '', valuation_amount: '', sale_amount: '', buyer_name: '' });

  const load = async () => {
    const [eq, dp] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_disposals' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setDisposals((dp.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const handleSave = async () => {
    const bv = parseFloat(form.book_value) || 0;
    const sa = parseFloat(form.sale_amount) || 0;
    const { error } = await supabase.from('asset_disposals' as any).insert({
      ...form, company_id: activeCompanyId, book_value: bv, valuation_amount: parseFloat(form.valuation_amount) || 0,
      sale_amount: sa, gain_loss: sa - bv,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Disposal request created'); setOpen(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Disposal & Auction</h1><p className="text-sm text-muted-foreground">Manage asset retirement, sale, scrap, and write-off</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Disposal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Disposal</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Disposal Type</Label><Select value={form.disposal_type} onValueChange={v => setForm({ ...form, disposal_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Sale</SelectItem><SelectItem value="auction">Auction</SelectItem><SelectItem value="scrap">Scrap</SelectItem><SelectItem value="donation">Donation</SelectItem><SelectItem value="write_off">Write-off</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-3"><div><Label>Book Value</Label><Input type="number" value={form.book_value} onChange={e => setForm({ ...form, book_value: e.target.value })} /></div><div><Label>Valuation</Label><Input type="number" value={form.valuation_amount} onChange={e => setForm({ ...form, valuation_amount: e.target.value })} /></div><div><Label>Sale Amount</Label><Input type="number" value={form.sale_amount} onChange={e => setForm({ ...form, sale_amount: e.target.value })} /></div></div>
              <div><Label>Buyer</Label><Input value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} /></div>
              <div><Label>Reason</Label><Textarea value={form.disposal_reason} onChange={e => setForm({ ...form, disposal_reason: e.target.value })} /></div>
              <Button onClick={handleSave}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Trash2 className="h-5 w-5 text-red-600 mb-1" /><div className="text-2xl font-bold">{disposals.length}</div><div className="text-xs text-muted-foreground">Total Disposals</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{disposals.filter(d => d.status === 'draft').length}</div><div className="text-xs text-muted-foreground">Pending Approval</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{disposals.filter(d => (d.gain_loss || 0) > 0).length}</div><div className="text-xs text-muted-foreground">With Gain</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{disposals.filter(d => (d.gain_loss || 0) < 0).length}</div><div className="text-xs text-muted-foreground">With Loss</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Disposal Records</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Disposal #</TableHead><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Book Value</TableHead><TableHead>Sale</TableHead><TableHead>Gain/Loss</TableHead><TableHead>Buyer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {disposals.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.disposal_number}</TableCell>
                <TableCell>{eqName(d.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{d.disposal_type}</Badge></TableCell>
                <TableCell>{d.book_value?.toLocaleString()}</TableCell>
                <TableCell>{d.sale_amount?.toLocaleString()}</TableCell>
                <TableCell className={d.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}>{d.gain_loss?.toLocaleString()}</TableCell>
                <TableCell>{d.buyer_name || '-'}</TableCell>
                <TableCell><Badge variant={d.status === 'approved' ? 'secondary' : 'default'}>{d.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default AssetDisposalPage;
