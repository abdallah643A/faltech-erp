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
import { ClipboardCheck, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const FieldInspectionPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const [inspections, setInspections] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', inspector_name: '', inspection_type: 'routine', overall_condition: 'good', meter_reading: '', notes: '' });

  const load = async () => {
    const [eq, ins] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_inspections' as any).select('*').order('inspection_date', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setInspections((ins.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const handleSave = async () => {
    const { error } = await supabase.from('asset_inspections' as any).insert({
      ...form, company_id: activeCompanyId, meter_reading: form.meter_reading ? parseFloat(form.meter_reading) : null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Inspection recorded'); setOpen(false); load();
  };

  const condColor = (c: string) => c === 'good' || c === 'excellent' ? 'secondary' : c === 'fair' ? 'default' : 'destructive';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Field Inspections</h1><p className="text-sm text-muted-foreground">Mobile inspection records with condition checklists and fault reporting</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Inspection</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Inspection</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Inspector</Label><Input value={form.inspector_name} onChange={e => setForm({ ...form, inspector_name: e.target.value })} /></div><div><Label>Type</Label><Select value={form.inspection_type} onValueChange={v => setForm({ ...form, inspection_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="pre_operation">Pre-Operation</SelectItem><SelectItem value="post_incident">Post-Incident</SelectItem></SelectContent></Select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Condition</Label><Select value={form.overall_condition} onValueChange={v => setForm({ ...form, overall_condition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div><div><Label>Meter Reading</Label><Input type="number" value={form.meter_reading} onChange={e => setForm({ ...form, meter_reading: e.target.value })} /></div></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave}>Save Inspection</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><ClipboardCheck className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{inspections.length}</div><div className="text-xs text-muted-foreground">Total Inspections</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{inspections.filter(i => i.overall_condition === 'poor' || i.overall_condition === 'critical').length}</div><div className="text-xs text-muted-foreground">Issues Found</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{new Set(inspections.map(i => i.equipment_id)).size}</div><div className="text-xs text-muted-foreground">Assets Inspected</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{inspections.filter(i => i.qr_scanned).length}</div><div className="text-xs text-muted-foreground">QR Verified</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Inspection Records</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Inspection #</TableHead><TableHead>Asset</TableHead><TableHead>Inspector</TableHead><TableHead>Type</TableHead><TableHead>Condition</TableHead><TableHead>Meter</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {inspections.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.inspection_number}</TableCell>
                <TableCell>{eqName(i.equipment_id)}</TableCell>
                <TableCell>{i.inspector_name}</TableCell>
                <TableCell><Badge variant="outline">{i.inspection_type}</Badge></TableCell>
                <TableCell><Badge variant={condColor(i.overall_condition)}>{i.overall_condition}</Badge></TableCell>
                <TableCell>{i.meter_reading || '-'}</TableCell>
                <TableCell>{format(new Date(i.inspection_date), 'yyyy-MM-dd')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default FieldInspectionPage;
