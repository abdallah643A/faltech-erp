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
import { ArrowRightLeft, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AssetCheckoutPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', checked_out_to: '', checked_out_to_type: 'employee', department: '', project_name: '', expected_return_date: '', condition_at_checkout: 'good' });

  const load = async () => {
    const [eq, co] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_checkouts' as any).select('*').order('checkout_date', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setCheckouts((co.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const handleCheckout = async () => {
    const { error } = await supabase.from('asset_checkouts' as any).insert({ ...form, company_id: activeCompanyId, status: 'checked_out' } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Asset checked out'); setOpen(false); load();
  };

  const handleReturn = async (id: string) => {
    const { error } = await supabase.from('asset_checkouts' as any).update({ status: 'returned', actual_return_date: new Date().toISOString().split('T')[0] } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Asset returned'); load();
  };

  const active = checkouts.filter(c => c.status === 'checked_out');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Check-in / Check-out</h1><p className="text-sm text-muted-foreground">Track equipment assignments, returns, and condition</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Check Out Asset</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Check Out Asset</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Assigned To</Label><Input value={form.checked_out_to} onChange={e => setForm({ ...form, checked_out_to: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label><Select value={form.checked_out_to_type} onValueChange={v => setForm({ ...form, checked_out_to_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="department">Department</SelectItem><SelectItem value="project">Project</SelectItem><SelectItem value="site">Site</SelectItem></SelectContent></Select></div>
                <div><Label>Condition</Label><Select value={form.condition_at_checkout} onValueChange={v => setForm({ ...form, condition_at_checkout: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Expected Return</Label><Input type="date" value={form.expected_return_date} onChange={e => setForm({ ...form, expected_return_date: e.target.value })} /></div>
              <Button onClick={handleCheckout}>Confirm Check-out</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><ArrowRightLeft className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{active.length}</div><div className="text-xs text-muted-foreground">Currently Out</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{checkouts.filter(c => c.status === 'returned').length}</div><div className="text-xs text-muted-foreground">Returned</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{checkouts.filter(c => c.status === 'checked_out' && c.expected_return_date && new Date(c.expected_return_date) < new Date()).length}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Checkout Log</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Assigned To</TableHead><TableHead>Type</TableHead><TableHead>Checked Out</TableHead><TableHead>Expected Return</TableHead><TableHead>Condition</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {checkouts.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{eqName(c.equipment_id)}</TableCell>
                <TableCell>{c.checked_out_to}</TableCell>
                <TableCell><Badge variant="outline">{c.checked_out_to_type}</Badge></TableCell>
                <TableCell>{format(new Date(c.checkout_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{c.expected_return_date || '-'}</TableCell>
                <TableCell>{c.condition_at_checkout}</TableCell>
                <TableCell><Badge variant={c.status === 'checked_out' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                <TableCell>{c.status === 'checked_out' && <Button size="sm" variant="outline" onClick={() => handleReturn(c.id)}>Return</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default AssetCheckoutPage;
