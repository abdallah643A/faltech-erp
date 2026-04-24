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
import { Calculator, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CapitalizationAccounting = () => {
  const { activeCompanyId } = useActiveCompany();
  const [components, setComponents] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', component_name: '', component_code: '', original_cost: '', useful_life_months: '', depreciation_method: 'straight_line', depreciation_rate: '', capitalization_date: '', is_major_repair: false });

  const load = async () => {
    const [eq, comp] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_capitalization_components' as any).select('*').order('component_name'),
    ]);
    setEquipment((eq.data || []) as any[]);
    setComponents((comp.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const totalOriginal = components.reduce((s, c) => s + (c.original_cost || 0), 0);
  const totalBook = components.reduce((s, c) => s + (c.current_book_value || 0), 0);
  const totalDepr = components.reduce((s, c) => s + (c.accumulated_depreciation || 0), 0);

  const handleSave = async () => {
    const oc = parseFloat(form.original_cost) || 0;
    const { error } = await supabase.from('asset_capitalization_components' as any).insert({
      ...form, company_id: activeCompanyId, original_cost: oc, current_book_value: oc,
      useful_life_months: form.useful_life_months ? parseInt(form.useful_life_months) : null,
      depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : 0,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Component added'); setOpen(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Capitalization & Component Accounting</h1><p className="text-sm text-muted-foreground">Component breakdown, depreciation, revaluation, and impairment</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Component</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Asset Component</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Component Name</Label><Input value={form.component_name} onChange={e => setForm({ ...form, component_name: e.target.value })} /></div><div><Label>Code</Label><Input value={form.component_code} onChange={e => setForm({ ...form, component_code: e.target.value })} /></div></div>
              <div className="grid grid-cols-3 gap-3"><div><Label>Original Cost</Label><Input type="number" value={form.original_cost} onChange={e => setForm({ ...form, original_cost: e.target.value })} /></div><div><Label>Useful Life (mo)</Label><Input type="number" value={form.useful_life_months} onChange={e => setForm({ ...form, useful_life_months: e.target.value })} /></div><div><Label>Depr Rate %</Label><Input type="number" value={form.depreciation_rate} onChange={e => setForm({ ...form, depreciation_rate: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Method</Label><Select value={form.depreciation_method} onValueChange={v => setForm({ ...form, depreciation_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="straight_line">Straight Line</SelectItem><SelectItem value="declining_balance">Declining Balance</SelectItem><SelectItem value="units_of_production">Units of Production</SelectItem></SelectContent></Select></div><div><Label>Capitalization Date</Label><Input type="date" value={form.capitalization_date} onChange={e => setForm({ ...form, capitalization_date: e.target.value })} /></div></div>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Calculator className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{components.length}</div><div className="text-xs text-muted-foreground">Components</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalOriginal.toLocaleString()}</div><div className="text-xs text-muted-foreground">Original Cost (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalBook.toLocaleString()}</div><div className="text-xs text-muted-foreground">Book Value (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalDepr.toLocaleString()}</div><div className="text-xs text-muted-foreground">Accum. Depreciation</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Component Registry</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Asset</TableHead><TableHead>Original Cost</TableHead><TableHead>Book Value</TableHead><TableHead>Accum. Depr</TableHead><TableHead>Method</TableHead><TableHead>Life (mo)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {components.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.component_name}</TableCell>
                <TableCell>{eqName(c.equipment_id)}</TableCell>
                <TableCell>{c.original_cost?.toLocaleString()}</TableCell>
                <TableCell>{c.current_book_value?.toLocaleString()}</TableCell>
                <TableCell>{c.accumulated_depreciation?.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{c.depreciation_method}</Badge></TableCell>
                <TableCell>{c.useful_life_months || '-'}</TableCell>
                <TableCell><Badge variant={c.status === 'active' ? 'secondary' : 'default'}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default CapitalizationAccounting;
