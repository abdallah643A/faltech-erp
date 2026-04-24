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
import { Plus, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', active: 'bg-blue-100 text-blue-800', completed: 'bg-gray-100 text-gray-800', cancelled: 'bg-gray-200 text-gray-600' };

const AssetReservationCalendar = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', start_date: '', end_date: '', purpose: '', department: '' });

  const fetch = async () => {
    const [eqR, resR] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_reservations' as any).select('*').order('start_date', { ascending: false }),
    ]);
    setEquipment((eqR.data || []) as any[]);
    setReservations((resR.data || []) as any[]);
  };

  useEffect(() => { fetch(); }, [activeCompanyId]);

  const checkConflict = (eqId: string, start: string, end: string) => {
    return reservations.some(r => r.equipment_id === eqId && r.status !== 'rejected' && r.status !== 'cancelled' && new Date(r.start_date) < new Date(end) && new Date(r.end_date) > new Date(start));
  };

  const handleAdd = async () => {
    if (!form.equipment_id || !form.start_date || !form.end_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    if (checkConflict(form.equipment_id, form.start_date, form.end_date)) { toast({ title: 'Conflict detected', description: 'Equipment already reserved for this period', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_reservations' as any).insert({ ...form, company_id: activeCompanyId, reserved_by: user?.id, status: 'pending' } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Reservation created' }); setShowAdd(false); setForm({ equipment_id: '', start_date: '', end_date: '', purpose: '', department: '' }); fetch();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('asset_reservations' as any).update({ status, approved_by: user?.id, approved_at: new Date().toISOString() } as any).eq('id', id);
    toast({ title: `Reservation ${status}` }); fetch();
  };

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Reservation Calendar</h1><p className="text-sm text-muted-foreground">Manage shared equipment bookings with conflict detection</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Reservation</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['pending', 'approved', 'active', 'completed'].map(s => (
          <Card key={s}><CardContent className="pt-4"><div className="text-2xl font-bold">{reservations.filter(r => r.status === s).length}</div><div className="text-xs text-muted-foreground capitalize">{s}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Equipment</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Purpose</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {reservations.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{eqName(r.equipment_id)}</TableCell>
                <TableCell>{format(new Date(r.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{format(new Date(r.end_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{r.purpose || '-'}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status] || ''}`}>{r.status}</span></TableCell>
                <TableCell>
                  {r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, 'approved')}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, 'rejected')}><XCircle className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs">Start Date</label><Input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="text-xs">End Date</label><Input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            <Textarea placeholder="Purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create Reservation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetReservationCalendar;
