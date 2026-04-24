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
import { Gauge, Plus, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const CalibrationTracker = () => {
  const { activeCompanyId } = useActiveCompany();
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', calibration_provider: '', calibration_date: '', next_calibration_date: '', certificate_number: '', tolerance_status: 'within_tolerance', standard_used: '' });

  const load = async () => {
    const [eq, cal] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_calibrations' as any).select('*').order('next_calibration_date'),
    ]);
    setEquipment((eq.data || []) as any[]);
    setCalibrations((cal.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const overdue = calibrations.filter(c => c.next_calibration_date && differenceInDays(new Date(c.next_calibration_date), new Date()) < 0);
  const dueSoon = calibrations.filter(c => { const d = differenceInDays(new Date(c.next_calibration_date), new Date()); return d >= 0 && d <= 30; });

  const handleSave = async () => {
    const { error } = await supabase.from('asset_calibrations' as any).insert({ ...form, company_id: activeCompanyId } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Calibration recorded'); setOpen(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Calibration Tracker</h1><p className="text-sm text-muted-foreground">Schedule, certificates, tolerance status, and lockout management</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record Calibration</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Calibration</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Provider</Label><Input value={form.calibration_provider} onChange={e => setForm({ ...form, calibration_provider: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Calibration Date</Label><Input type="date" value={form.calibration_date} onChange={e => setForm({ ...form, calibration_date: e.target.value })} /></div><div><Label>Next Due</Label><Input type="date" value={form.next_calibration_date} onChange={e => setForm({ ...form, next_calibration_date: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Certificate #</Label><Input value={form.certificate_number} onChange={e => setForm({ ...form, certificate_number: e.target.value })} /></div><div><Label>Tolerance</Label><Select value={form.tolerance_status} onValueChange={v => setForm({ ...form, tolerance_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="within_tolerance">Within Tolerance</SelectItem><SelectItem value="out_of_tolerance">Out of Tolerance</SelectItem><SelectItem value="adjusted">Adjusted</SelectItem></SelectContent></Select></div></div>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Gauge className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{calibrations.length}</div><div className="text-xs text-muted-foreground">Total Records</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{calibrations.filter(c => c.tolerance_status === 'within_tolerance').length}</div><div className="text-xs text-muted-foreground">Within Tolerance</div></CardContent></Card>
        <Card className={overdue.length > 0 ? 'border-red-500' : ''}><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-red-600 mb-1" /><div className="text-2xl font-bold">{overdue.length}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
        <Card className={dueSoon.length > 0 ? 'border-amber-500' : ''}><CardContent className="pt-4"><div className="text-2xl font-bold">{dueSoon.length}</div><div className="text-xs text-muted-foreground">Due ≤30 Days</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Calibration Records</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Cal #</TableHead><TableHead>Asset</TableHead><TableHead>Provider</TableHead><TableHead>Date</TableHead><TableHead>Next Due</TableHead><TableHead>Certificate</TableHead><TableHead>Tolerance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {calibrations.map(c => { const daysLeft = c.next_calibration_date ? differenceInDays(new Date(c.next_calibration_date), new Date()) : 999; return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.calibration_number}</TableCell>
                <TableCell>{eqName(c.equipment_id)}</TableCell>
                <TableCell>{c.calibration_provider}</TableCell>
                <TableCell>{format(new Date(c.calibration_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{c.next_calibration_date ? format(new Date(c.next_calibration_date), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell>{c.certificate_number || '-'}</TableCell>
                <TableCell><Badge variant={c.tolerance_status === 'within_tolerance' ? 'secondary' : 'destructive'}>{c.tolerance_status}</Badge></TableCell>
                <TableCell><Badge variant={daysLeft < 0 ? 'destructive' : daysLeft <= 30 ? 'default' : 'secondary'}>{daysLeft < 0 ? 'Overdue' : daysLeft <= 30 ? `${daysLeft}d` : 'Valid'}</Badge></TableCell>
              </TableRow>
            ); })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default CalibrationTracker;
