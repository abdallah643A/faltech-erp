import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Plus, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const MeterReadingsPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const [readings, setReadings] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [form, setForm] = useState({ equipment_id: '', reading_type: 'hours', reading_value: '', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    const [eqRes, rdRes] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_meter_readings' as any).select('*').order('reading_date', { ascending: false }).limit(500),
    ]);
    setEquipment((eqRes.data || []) as any[]);
    setReadings((rdRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    const value = parseFloat(form.reading_value);
    if (!form.equipment_id || isNaN(value)) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const prev = readings.filter(r => r.equipment_id === form.equipment_id && r.reading_type === form.reading_type);
    const previousValue = prev.length > 0 ? prev[0].reading_value : null;
    const delta = previousValue !== null ? value - previousValue : null;
    const isAbnormal = delta !== null && delta < 0;

    const { error } = await supabase.from('asset_meter_readings' as any).insert({
      equipment_id: form.equipment_id, reading_type: form.reading_type, reading_value: value,
      previous_value: previousValue, delta, is_abnormal: isAbnormal,
      abnormal_reason: isAbnormal ? 'Value decreased from previous reading' : null,
      company_id: activeCompanyId, notes: form.notes, source: 'manual',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Reading recorded' });
    setShowAdd(false);
    setForm({ equipment_id: '', reading_type: 'hours', reading_value: '', notes: '' });
    fetchData();
  };

  const filteredReadings = selectedEquipment ? readings.filter(r => r.equipment_id === selectedEquipment) : readings;
  const chartData = [...filteredReadings].reverse().slice(-30).map(r => ({
    date: format(new Date(r.reading_date), 'MM/dd'), value: r.reading_value,
  }));
  const abnormalCount = readings.filter(r => r.is_abnormal).length;
  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Meter & Runtime Readings</h1>
          <p className="text-muted-foreground text-sm">Odometer, hour meter, cycle counts with validation</p>
        </div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Reading</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><div><div className="text-2xl font-bold">{readings.length}</div><div className="text-xs text-muted-foreground">Total Readings</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /><div><div className="text-2xl font-bold">{abnormalCount}</div><div className="text-xs text-muted-foreground">Abnormal Jumps</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600" /><div><div className="text-2xl font-bold">{readings.filter(r => r.validated).length}</div><div className="text-xs text-muted-foreground">Validated</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-4">
          <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
            <SelectTrigger><SelectValue placeholder="Filter by Equipment" /></SelectTrigger>
            <SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent></Card>
      </div>

      {chartData.length > 3 && (
        <Card><CardHeader><CardTitle className="text-sm">Trend</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#0066cc" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Equipment</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Delta</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredReadings.slice(0, 100).map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{eqName(r.equipment_id)}</TableCell>
                <TableCell><Badge variant="outline">{r.reading_type}</Badge></TableCell>
                <TableCell>{Number(r.reading_value).toLocaleString()}</TableCell>
                <TableCell>{r.delta !== null ? (r.delta >= 0 ? '+' : '') + Number(r.delta).toLocaleString() : '-'}</TableCell>
                <TableCell>{format(new Date(r.reading_date), 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell>{r.is_abnormal ? <Badge variant="destructive">Abnormal</Badge> : <Badge variant="secondary">Normal</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Meter Reading</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger>
              <SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.code})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.reading_type} onValueChange={v => setForm({ ...form, reading_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hour Meter</SelectItem>
                <SelectItem value="odometer">Odometer</SelectItem>
                <SelectItem value="cycles">Cycle Count</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Reading Value" value={form.reading_value} onChange={e => setForm({ ...form, reading_value: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Save Reading</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeterReadingsPage;
