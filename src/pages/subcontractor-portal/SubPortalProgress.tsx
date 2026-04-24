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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalProgress({ subcontractor }: Props) {
  const [reports, setReports] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    subcontract_order_id: '', report_date: new Date().toISOString().split('T')[0],
    report_type: 'daily', activity_description: '', planned_progress: '', actual_progress: '',
    cumulative_progress: '', delay_reason: '', work_area: '', next_day_plan: '', weather: 'clear'
  });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const [reportsRes, ordersRes] = await Promise.all([
      supabase.from('sub_work_progress').select('*').eq('subcontractor_id', subcontractor.id).order('report_date', { ascending: false }).limit(50) as any,
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id) as any,
    ]);
    setReports(reportsRes.data || []);
    setOrders(ordersRes.data || []);
  };

  const handleCreate = async () => {
    if (!form.activity_description) { toast.error('Activity description required'); return; }
    const order = orders.find((o: any) => o.id === form.subcontract_order_id);
    const { error } = await supabase.from('sub_work_progress').insert({
      subcontractor_id: subcontractor.id,
      subcontract_order_id: form.subcontract_order_id || null,
      project_id: order?.project_id || null,
      company_id: subcontractor.company_id,
      report_date: form.report_date,
      report_type: form.report_type,
      activity_description: form.activity_description,
      planned_progress: parseFloat(form.planned_progress) || 0,
      actual_progress: parseFloat(form.actual_progress) || 0,
      cumulative_progress: parseFloat(form.cumulative_progress) || 0,
      delay_reason: form.delay_reason || null,
      work_area: form.work_area || null,
      next_day_plan: form.next_day_plan || null,
      weather: form.weather,
      status: 'draft',
    } as any);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Progress report saved');
    setCreateOpen(false);
    load();
  };

  const handleSubmit = async (id: string) => {
    await supabase.from('sub_work_progress').update({ status: 'submitted', submitted_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Report submitted');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Work Progress</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Add Report</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Cumulative</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reports yet</TableCell></TableRow>
              ) : reports.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.report_date}</TableCell>
                  <TableCell className="capitalize text-xs">{r.report_type}</TableCell>
                  <TableCell className="text-xs">{orders.find((o: any) => o.id === r.subcontract_order_id)?.order_number || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{r.activity_description}</TableCell>
                  <TableCell className="text-sm">{r.planned_progress}%</TableCell>
                  <TableCell className="text-sm">{r.actual_progress}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={r.cumulative_progress} className="h-2 w-16" />
                      <span className="text-xs">{r.cumulative_progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={r.status === 'acknowledged' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === 'draft' && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleSubmit(r.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Progress Report</DialogTitle>
            <DialogDescription>Report daily or weekly work progress</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.report_type} onValueChange={v => setForm(f => ({ ...f, report_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contract</Label>
                <Select value={form.subcontract_order_id} onValueChange={v => setForm(f => ({ ...f, subcontract_order_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Activity Description *</Label><Textarea value={form.activity_description} onChange={e => setForm(f => ({ ...f, activity_description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Planned %</Label><Input type="number" max={100} value={form.planned_progress} onChange={e => setForm(f => ({ ...f, planned_progress: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Actual %</Label><Input type="number" max={100} value={form.actual_progress} onChange={e => setForm(f => ({ ...f, actual_progress: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Cumulative %</Label><Input type="number" max={100} value={form.cumulative_progress} onChange={e => setForm(f => ({ ...f, cumulative_progress: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Delay Reason (if any)</Label><Input value={form.delay_reason} onChange={e => setForm(f => ({ ...f, delay_reason: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Work Area</Label><Input value={form.work_area} onChange={e => setForm(f => ({ ...f, work_area: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Weather</Label>
                <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['clear', 'cloudy', 'rain', 'hot', 'sandstorm'].map(w => <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Next Day Plan</Label><Textarea value={form.next_day_plan} onChange={e => setForm(f => ({ ...f, next_day_plan: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}