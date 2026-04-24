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
import { Truck, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AssetTransferPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', from_branch: '', to_branch: '', from_department: '', to_department: '', reason: '', transfer_cost: '' });

  const load = async () => {
    const [eq, tr] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_transfers' as any).select('*').order('request_date', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setTransfers((tr.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const handleSave = async () => {
    const { error } = await supabase.from('asset_transfers' as any).insert({ ...form, company_id: activeCompanyId, transfer_cost: form.transfer_cost ? parseFloat(form.transfer_cost) : 0 } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Transfer request created'); setOpen(false); load();
  };

  const handleApprove = async (id: string) => {
    await supabase.from('asset_transfers' as any).update({ approval_status: 'approved', status: 'approved', approved_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Transfer approved'); load();
  };

  const statusColor = (s: string) => s === 'approved' ? 'secondary' : s === 'completed' ? 'outline' : s === 'rejected' ? 'destructive' : 'default';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Transfer Approval</h1><p className="text-sm text-muted-foreground">Track asset movements between branches, departments, and projects</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Asset Transfer</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>From Branch</Label><Input value={form.from_branch} onChange={e => setForm({ ...form, from_branch: e.target.value })} /></div><div><Label>To Branch</Label><Input value={form.to_branch} onChange={e => setForm({ ...form, to_branch: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>From Department</Label><Input value={form.from_department} onChange={e => setForm({ ...form, from_department: e.target.value })} /></div><div><Label>To Department</Label><Input value={form.to_department} onChange={e => setForm({ ...form, to_department: e.target.value })} /></div></div>
              <div><Label>Transfer Cost (SAR)</Label><Input type="number" value={form.transfer_cost} onChange={e => setForm({ ...form, transfer_cost: e.target.value })} /></div>
              <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <Button onClick={handleSave}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Truck className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{transfers.length}</div><div className="text-xs text-muted-foreground">Total Transfers</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{transfers.filter(t => t.status === 'requested').length}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{transfers.filter(t => t.status === 'approved').length}</div><div className="text-xs text-muted-foreground">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{transfers.filter(t => t.status === 'completed').length}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Transfer Requests</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Asset</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Date</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {transfers.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.transfer_number}</TableCell>
                <TableCell>{eqName(t.equipment_id)}</TableCell>
                <TableCell>{t.from_branch || t.from_department || '-'}</TableCell>
                <TableCell>{t.to_branch || t.to_department || '-'}</TableCell>
                <TableCell>{format(new Date(t.request_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{t.transfer_cost?.toLocaleString()} SAR</TableCell>
                <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                <TableCell>{t.status === 'requested' && <Button size="sm" variant="outline" onClick={() => handleApprove(t.id)}>Approve</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default AssetTransferPage;
