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
import { Plus, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';

const REASONS = ['mechanical_failure', 'electrical_failure', 'spare_part_delay', 'operator_issue', 'planned_maintenance', 'external_vendor_delay', 'safety_stop', 'weather', 'other'];
const COLORS = ['#cc0000', '#e8a000', '#0066cc', '#1a7a4a', '#6b7280', '#8b5cf6', '#ef4444', '#3b82f6', '#9ca3af'];

const DowntimeAnalytics = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ equipment_id: '', start_time: '', reason_category: 'mechanical_failure', reason_detail: '', cost_impact: '' });

  const fetchData = async () => {
    const [eq, ev] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_downtime_events' as any).select('*').order('start_time', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setEvents((ev.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.equipment_id || !form.start_time || !form.reason_category) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_downtime_events' as any).insert({
      ...form, cost_impact: parseFloat(form.cost_impact) || 0,
      company_id: activeCompanyId, reported_by: user?.id, status: 'active',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Downtime event logged' }); setShowAdd(false); fetchData();
  };

  const totalHours = events.reduce((s, e) => s + (e.duration_hours || 0), 0);
  const totalCost = events.reduce((s, e) => s + (e.cost_impact || 0), 0);
  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  const pieData = REASONS.map(r => ({ name: r.replace(/_/g, ' '), value: events.filter(e => e.reason_category === r).length })).filter(d => d.value > 0);
  const barData = REASONS.map(r => ({ name: r.replace(/_/g, ' ').slice(0, 12), hours: events.filter(e => e.reason_category === r).reduce((s, e) => s + (e.duration_hours || 0), 0) })).filter(d => d.hours > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Downtime Analytics</h1><p className="text-sm text-muted-foreground">Classify downtime by failure type with trend dashboards</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />Log Downtime</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Clock className="h-5 w-5 text-red-600 mb-1" /><div className="text-2xl font-bold">{totalHours.toFixed(0)}</div><div className="text-xs text-muted-foreground">Total Downtime (hrs)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{events.length}</div><div className="text-xs text-muted-foreground">Events</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalCost.toLocaleString()}</div><div className="text-xs text-muted-foreground">Cost Impact</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{events.filter(e => e.status === 'active').length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pieData.length > 0 && <Card><CardHeader><CardTitle className="text-sm">By Reason</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /></PieChart></ResponsiveContainer></CardContent></Card>}
        {barData.length > 0 && <Card><CardHeader><CardTitle className="text-sm">Hours by Reason</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={9} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="hours" fill="#cc0000" /></BarChart></ResponsiveContainer></CardContent></Card>}
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Asset</TableHead><TableHead>Reason</TableHead><TableHead>Start</TableHead><TableHead>Duration (hrs)</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {events.slice(0, 50).map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{eqName(e.equipment_id)}</TableCell>
                <TableCell>{e.reason_category?.replace(/_/g, ' ')}</TableCell>
                <TableCell>{format(new Date(e.start_time), 'yyyy-MM-dd HH:mm')}</TableCell>
                <TableCell>{e.duration_hours || '-'}</TableCell>
                <TableCell>{(e.cost_impact || 0).toLocaleString()}</TableCell>
                <TableCell><Badge variant={e.status === 'active' ? 'destructive' : 'secondary'}>{e.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Log Downtime Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <div><label className="text-xs">Start Time</label><Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <Select value={form.reason_category} onValueChange={v => setForm({ ...form, reason_category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
            <Textarea placeholder="Details" value={form.reason_detail} onChange={e => setForm({ ...form, reason_detail: e.target.value })} />
            <Input type="number" placeholder="Cost Impact" value={form.cost_impact} onChange={e => setForm({ ...form, cost_impact: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Log</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DowntimeAnalytics;
