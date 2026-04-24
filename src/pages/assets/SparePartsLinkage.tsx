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
import { Wrench, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const SparePartsLinkage = () => {
  const { activeCompanyId } = useActiveCompany();
  const [parts, setParts] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', part_code: '', part_name: '', manufacturer: '', reorder_threshold: '5', current_stock: '0', unit_cost: '0', lead_time_days: '7', is_critical: false });

  const load = async () => {
    const [eq, sp] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_spare_parts' as any).select('*').order('part_name'),
    ]);
    setEquipment((eq.data || []) as any[]);
    setParts((sp.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const lowStock = parts.filter(p => p.current_stock <= p.reorder_threshold);

  const handleSave = async () => {
    const { error } = await supabase.from('asset_spare_parts' as any).insert({
      ...form, company_id: activeCompanyId, reorder_threshold: parseInt(form.reorder_threshold),
      current_stock: parseInt(form.current_stock), unit_cost: parseFloat(form.unit_cost), lead_time_days: parseInt(form.lead_time_days),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Spare part linked'); setOpen(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Spare Parts Linkage</h1><p className="text-sm text-muted-foreground">Associate spare parts with assets, track consumption and reorder levels</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Link Part</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Link Spare Part to Asset</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Part Code</Label><Input value={form.part_code} onChange={e => setForm({ ...form, part_code: e.target.value })} /></div><div><Label>Part Name</Label><Input value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Current Stock</Label><Input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} /></div><div><Label>Reorder Threshold</Label><Input type="number" value={form.reorder_threshold} onChange={e => setForm({ ...form, reorder_threshold: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Unit Cost (SAR)</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></div><div><Label>Lead Time (days)</Label><Input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })} /></div></div>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Wrench className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{parts.length}</div><div className="text-xs text-muted-foreground">Total Parts</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{parts.filter(p => p.is_critical).length}</div><div className="text-xs text-muted-foreground">Critical Parts</div></CardContent></Card>
        <Card className={lowStock.length > 0 ? 'border-amber-500' : ''}><CardContent className="pt-4"><AlertTriangle className="h-5 w-5 text-amber-600 mb-1" /><div className="text-2xl font-bold">{lowStock.length}</div><div className="text-xs text-muted-foreground">Below Reorder</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{parts.reduce((s, p) => s + p.total_consumed, 0)}</div><div className="text-xs text-muted-foreground">Total Consumed</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Spare Parts Registry</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Part Code</TableHead><TableHead>Part Name</TableHead><TableHead>Asset</TableHead><TableHead>Stock</TableHead><TableHead>Reorder</TableHead><TableHead>Unit Cost</TableHead><TableHead>Consumed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {parts.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.part_code}</TableCell>
                <TableCell>{p.part_name}</TableCell>
                <TableCell>{eqName(p.equipment_id)}</TableCell>
                <TableCell>{p.current_stock}</TableCell>
                <TableCell>{p.reorder_threshold}</TableCell>
                <TableCell>{p.unit_cost?.toLocaleString()}</TableCell>
                <TableCell>{p.total_consumed}</TableCell>
                <TableCell><Badge variant={p.current_stock <= p.reorder_threshold ? 'destructive' : 'secondary'}>{p.current_stock <= p.reorder_threshold ? 'Low Stock' : 'OK'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default SparePartsLinkage;
