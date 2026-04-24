import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subcontractor: SubPortalSubcontractor; }

const CATEGORIES = ['skilled', 'unskilled', 'supervisor', 'engineer', 'foreman'];
const WEATHER = ['clear', 'cloudy', 'rain', 'hot', 'sandstorm'];

export default function SubPortalManpower({ subcontractor }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    subcontract_order_id: '', log_date: new Date().toISOString().split('T')[0],
    category: 'skilled', trade: '', worker_count: '', hours_worked: '', overtime_hours: '',
    weather_condition: 'clear', work_description: '', safety_incidents: '0', notes: ''
  });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const [logsRes, ordersRes] = await Promise.all([
      supabase.from('sub_manpower_logs').select('*').eq('subcontractor_id', subcontractor.id).order('log_date', { ascending: false }).limit(50) as any,
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id) as any,
    ]);
    setLogs(logsRes.data || []);
    setOrders(ordersRes.data || []);
  };

  const handleCreate = async () => {
    if (!form.worker_count || !form.hours_worked) { toast.error('Worker count and hours are required'); return; }
    const order = orders.find((o: any) => o.id === form.subcontract_order_id);
    const { error } = await supabase.from('sub_manpower_logs').insert({
      subcontractor_id: subcontractor.id,
      subcontract_order_id: form.subcontract_order_id || null,
      project_id: order?.project_id || null,
      company_id: subcontractor.company_id,
      log_date: form.log_date,
      category: form.category,
      trade: form.trade || subcontractor.trade,
      worker_count: parseInt(form.worker_count),
      hours_worked: parseFloat(form.hours_worked),
      overtime_hours: form.overtime_hours ? parseFloat(form.overtime_hours) : 0,
      weather_condition: form.weather_condition,
      work_description: form.work_description,
      safety_incidents: parseInt(form.safety_incidents) || 0,
      notes: form.notes,
      status: 'draft',
    } as any);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Manpower log saved');
    setCreateOpen(false);
    load();
  };

  const handleSubmit = async (id: string) => {
    await supabase.from('sub_manpower_logs').update({ status: 'submitted', submitted_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Log submitted');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manpower Logs</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Add Log</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Workers</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead>Weather</TableHead>
                <TableHead>Safety</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No logs yet</TableCell></TableRow>
              ) : logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.log_date}</TableCell>
                  <TableCell className="text-xs">{orders.find((o: any) => o.id === l.subcontract_order_id)?.order_number || '—'}</TableCell>
                  <TableCell className="capitalize text-xs">{l.category}</TableCell>
                  <TableCell className="text-right">{l.worker_count}</TableCell>
                  <TableCell className="text-right">{l.hours_worked}</TableCell>
                  <TableCell className="text-right">{l.overtime_hours || 0}</TableCell>
                  <TableCell className="text-xs capitalize">{l.weather_condition}</TableCell>
                  <TableCell>{l.safety_incidents > 0 ? <Badge variant="destructive" className="text-[10px]">{l.safety_incidents}</Badge> : '0'}</TableCell>
                  <TableCell><Badge variant={l.status === 'approved' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{l.status}</Badge></TableCell>
                  <TableCell>
                    {l.status === 'draft' && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleSubmit(l.id)}>
                        <Send className="h-3 w-3" /> Submit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manpower Log</DialogTitle>
            <DialogDescription>Record daily workforce and safety data</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Contract</Label>
                <Select value={form.subcontract_order_id} onValueChange={v => setForm(f => ({ ...f, subcontract_order_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Workers *</Label><Input type="number" value={form.worker_count} onChange={e => setForm(f => ({ ...f, worker_count: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Hours *</Label><Input type="number" step="0.5" value={form.hours_worked} onChange={e => setForm(f => ({ ...f, hours_worked: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Overtime</Label><Input type="number" step="0.5" value={form.overtime_hours} onChange={e => setForm(f => ({ ...f, overtime_hours: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Weather</Label>
                <Select value={form.weather_condition} onValueChange={v => setForm(f => ({ ...f, weather_condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WEATHER.map(w => <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Safety Incidents</Label><Input type="number" value={form.safety_incidents} onChange={e => setForm(f => ({ ...f, safety_incidents: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Work Description</Label><Textarea value={form.work_description} onChange={e => setForm(f => ({ ...f, work_description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}