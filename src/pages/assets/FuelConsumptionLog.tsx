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
import { Fuel, Plus, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FuelConsumptionLog = () => {
  const { activeCompanyId } = useActiveCompany();
  const [logs, setLogs] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipment_id: '', fuel_type: 'diesel', quantity: '', unit_cost: '', meter_reading: '', operator_name: '', project_name: '', branch_name: '' });

  const load = async () => {
    const [eq, fl] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_fuel_logs' as any).select('*').order('log_date', { ascending: false }).limit(500),
    ]);
    setEquipment((eq.data || []) as any[]);
    setLogs((fl.data || []) as any[]);
  };
  useEffect(() => { load(); }, [activeCompanyId]);

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const totalFuel = logs.reduce((s, l) => s + (l.quantity || 0), 0);
  const totalCost = logs.reduce((s, l) => s + (l.total_cost || 0), 0);

  const handleSave = async () => {
    const qty = parseFloat(form.quantity) || 0;
    const uc = parseFloat(form.unit_cost) || 0;
    const { error } = await supabase.from('asset_fuel_logs' as any).insert({
      ...form, company_id: activeCompanyId, quantity: qty, unit_cost: uc, total_cost: qty * uc,
      meter_reading: form.meter_reading ? parseFloat(form.meter_reading) : null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Fuel log added'); setOpen(false); load();
  };

  const chartData = [...logs].reverse().slice(-30).map(l => ({ date: format(new Date(l.log_date), 'MM/dd'), qty: l.quantity, cost: l.total_cost }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Fuel & Operating Consumption</h1><p className="text-sm text-muted-foreground">Track fuel usage, costs, and anomalies by asset and project</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Log Fuel</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Fuel Consumption</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Asset</Label><Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-3"><div><Label>Fuel Type</Label><Select value={form.fuel_type} onValueChange={v => setForm({ ...form, fuel_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="gasoline">Gasoline</SelectItem><SelectItem value="electric">Electric</SelectItem><SelectItem value="lpg">LPG</SelectItem></SelectContent></Select></div><div><Label>Quantity (L)</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div><div><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Meter Reading</Label><Input type="number" value={form.meter_reading} onChange={e => setForm({ ...form, meter_reading: e.target.value })} /></div><div><Label>Operator</Label><Input value={form.operator_name} onChange={e => setForm({ ...form, operator_name: e.target.value })} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Project</Label><Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div><div><Label>Branch</Label><Input value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} /></div></div>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Fuel className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{logs.length}</div><div className="text-xs text-muted-foreground">Total Entries</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalFuel.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Liters</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalCost.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Cost (SAR)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><TrendingUp className="h-5 w-5 text-green-600 mb-1" /><div className="text-2xl font-bold">{logs.filter(l => l.is_anomaly).length}</div><div className="text-xs text-muted-foreground">Anomalies</div></CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Consumption Trend (Last 30)</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line type="monotone" dataKey="qty" stroke="#0066cc" name="Liters" /><Line type="monotone" dataKey="cost" stroke="#cc0000" name="Cost" /></LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Fuel Log</CardTitle></CardHeader>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Asset</TableHead><TableHead>Fuel</TableHead><TableHead>Qty (L)</TableHead><TableHead>Cost</TableHead><TableHead>Meter</TableHead><TableHead>Operator</TableHead><TableHead>Project</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.slice(0, 50).map(l => (
              <TableRow key={l.id}>
                <TableCell>{format(new Date(l.log_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell className="font-medium">{eqName(l.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{l.fuel_type}</Badge></TableCell>
                <TableCell>{l.quantity}</TableCell>
                <TableCell>{l.total_cost?.toLocaleString()}</TableCell>
                <TableCell>{l.meter_reading || '-'}</TableCell>
                <TableCell>{l.operator_name || '-'}</TableCell>
                <TableCell>{l.project_name || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
export default FuelConsumptionLog;
