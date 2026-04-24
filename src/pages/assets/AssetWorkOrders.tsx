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
import { ClipboardList, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AssetWorkOrders = () => {
  const { activeCompanyId } = useActiveCompany();
  const [orders, setOrders] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', wo_type: 'preventive', priority: 'medium', assigned_to: '', description: '', scheduled_date: '' });

  const load = async () => {
    const [eq, wo] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_work_orders' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setOrders((wo.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const handleSave = async () => {
    const { error } = await supabase.from('asset_work_orders' as any).insert({ ...form, company_id: activeCompanyId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Work order created'); setOpen(false); load();
  };

  const handleComplete = async (id: string) => {
    await supabase.from('asset_work_orders' as any).update({ status: 'completed', completed_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Work order completed'); load();
  };

  const statusColor = (s: string) => s === 'completed' ? 'secondary' : s === 'in_progress' ? 'default' : s === 'cancelled' ? 'destructive' : 'outline';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Work Orders</h1><p className="text-sm text-muted-foreground">Create, assign, and track maintenance work orders</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Work Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><Select value={form.wo_type} onValueChange={v => setForm({ ...form, wo_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="inspection">Inspection</SelectItem></SelectContent></Select></div><div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div><div><Label>Scheduled Date</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleSave}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><ClipboardList className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{orders.length}</div><div className="text-xs text-muted-foreground">Total WOs</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{orders.filter(o => o.status === 'open').length}</div><div className="text-xs text-muted-foreground">Open</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{orders.filter(o => o.status === 'in_progress').length}</div><div className="text-xs text-muted-foreground">In Progress</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{orders.filter(o => o.status === 'completed').length}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Work Orders</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Assigned</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.work_order_number}</TableCell>
                <TableCell>{eqName(o.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{o.wo_type}</Badge></TableCell>
                <TableCell><Badge variant={o.priority === 'critical' ? 'destructive' : o.priority === 'high' ? 'default' : 'secondary'}>{o.priority}</Badge></TableCell>
                <TableCell>{o.assigned_to || '-'}</TableCell>
                <TableCell>{o.scheduled_date ? format(new Date(o.scheduled_date), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell><Badge variant={statusColor(o.status)}>{o.status}</Badge></TableCell>
                <TableCell>{o.status !== 'completed' && o.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => handleComplete(o.id)}>Complete</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default AssetWorkOrders;
