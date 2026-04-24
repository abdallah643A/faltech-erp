import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertTriangle, Clock, Wrench, Plus, TrendingUp, BarChart3, CheckCircle } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

const causeColors: Record<string, string> = {
  mechanical: 'bg-blue-100 text-blue-800', electrical: 'bg-amber-100 text-amber-800',
  operator_error: 'bg-red-100 text-red-800', wear: 'bg-muted text-muted-foreground',
  environmental: 'bg-green-100 text-green-800', unknown: 'bg-muted text-muted-foreground',
};

export default function MaintenanceReliabilityAnalytics() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [showDowntimeDialog, setShowDowntimeDialog] = useState(false);
  const [dtForm, setDtForm] = useState<any>({ asset_name: '', asset_class: '', failure_mode: '', cause_category: 'unknown', start_time: '', end_time: '', corrective_action: '' });

  const { data: downtime = [] } = useQuery({
    queryKey: ['maint-downtime', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('maintenance_downtime_events' as any).select('*').eq('company_id', activeCompanyId!).order('start_time', { ascending: false }).limit(500));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: pmSchedules = [] } = useQuery({
    queryKey: ['maint-pm', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('maintenance_pm_schedules' as any).select('*').eq('company_id', activeCompanyId!).order('next_due_at'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const createDowntime = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('maintenance_downtime_events' as any).insert({ company_id: activeCompanyId, ...form }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maint-downtime'] }); setShowDowntimeDialog(false); toast({ title: 'Downtime event recorded' }); },
  });

  const kpis = useMemo(() => {
    const totalHours = downtime.reduce((s, d) => s + (d.duration_hours || 0), 0);
    const totalEvents = downtime.length;
    const mtbf = totalEvents > 1 ? Math.round((720 - totalHours) / totalEvents) : 0; // approximation over a month
    const mttr = totalEvents > 0 ? Math.round(totalHours / totalEvents * 10) / 10 : 0;
    const overdue = pmSchedules.filter(p => p.next_due_at && new Date(p.next_due_at) < new Date()).length;
    const pmCompliance = pmSchedules.length > 0 ? Math.round(((pmSchedules.length - overdue) / pmSchedules.length) * 100) : 100;
    return { totalHours: Math.round(totalHours), totalEvents, mtbf, mttr, pmCompliance, overdue };
  }, [downtime, pmSchedules]);

  // Failure mode frequency
  const failureModes = useMemo(() => {
    const map: Record<string, number> = {};
    downtime.forEach(d => { const k = d.failure_mode || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [downtime]);

  // Cause category frequency
  const causeFreq = useMemo(() => {
    const map: Record<string, number> = {};
    downtime.forEach(d => { const k = d.cause_category || 'unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [downtime]);

  // Asset cost ranking
  const assetCosts = useMemo(() => {
    const map: Record<string, { hours: number; cost: number; events: number }> = {};
    downtime.forEach(d => {
      const k = d.asset_name;
      if (!map[k]) map[k] = { hours: 0, cost: 0, events: 0 };
      map[k].hours += d.duration_hours || 0;
      map[k].cost += d.cost_estimate || 0;
      map[k].events += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost).slice(0, 10);
  }, [downtime]);

  return (
    <div className="p-4 md:p-6 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'تحليلات موثوقية الصيانة' : 'Maintenance Reliability Analytics'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'مراقبة الأعطال والصيانة' : 'Downtime, failure patterns, and PM compliance'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center"><Activity className="h-5 w-5 mx-auto text-red-500 mb-1" /><p className="text-xl font-bold">{kpis.totalHours}h</p><p className="text-[10px] text-muted-foreground">Total Downtime</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-xl font-bold">{kpis.totalEvents}</p><p className="text-[10px] text-muted-foreground">Failure Events</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" /><p className="text-xl font-bold">{kpis.mtbf}h</p><p className="text-[10px] text-muted-foreground">MTBF</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" /><p className="text-xl font-bold">{kpis.mttr}h</p><p className="text-[10px] text-muted-foreground">MTTR</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><CheckCircle className="h-5 w-5 mx-auto text-emerald-500 mb-1" /><p className="text-xl font-bold">{kpis.pmCompliance}%</p><p className="text-[10px] text-muted-foreground">PM Compliance</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Wrench className="h-5 w-5 mx-auto text-red-500 mb-1" /><p className="text-xl font-bold">{kpis.overdue}</p><p className="text-[10px] text-muted-foreground">PM Overdue</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Reliability Dashboard</TabsTrigger>
          <TabsTrigger value="downtime">Downtime Analysis</TabsTrigger>
          <TabsTrigger value="failures">Failure Mode Trends</TabsTrigger>
          <TabsTrigger value="pm">PM Compliance</TabsTrigger>
          <TabsTrigger value="mtbf">MTBF & MTTR</TabsTrigger>
          <TabsTrigger value="backlog">Maintenance Backlog</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Top Failure Modes</CardTitle></CardHeader>
              <CardContent>
                {failureModes.map(([mode, count]) => (
                  <div key={mode} className="flex justify-between items-center py-1 border-b last:border-0">
                    <span className="text-sm">{mode}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
                {failureModes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Cause Categories</CardTitle></CardHeader>
              <CardContent>
                {causeFreq.map(([cause, count]) => (
                  <div key={cause} className="flex justify-between items-center py-1 border-b last:border-0">
                    <Badge className={causeColors[cause] || 'bg-muted text-muted-foreground'}>{cause.replace('_', ' ')}</Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Maintenance Cost by Asset (Top 10)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Events</TableHead><TableHead>Downtime (h)</TableHead><TableHead>Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assetCosts.map(([name, data]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{data.events}</TableCell>
                        <TableCell>{Math.round(data.hours)}</TableCell>
                        <TableCell>{data.cost.toLocaleString()} SAR</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="downtime">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Downtime Events</CardTitle>
              <Dialog open={showDowntimeDialog} onOpenChange={setShowDowntimeDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log Downtime</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Downtime Event</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Asset Name</Label><Input value={dtForm.asset_name} onChange={e => setDtForm({ ...dtForm, asset_name: e.target.value })} /></div>
                    <div><Label>Asset Class</Label><Input value={dtForm.asset_class} onChange={e => setDtForm({ ...dtForm, asset_class: e.target.value })} /></div>
                    <div><Label>Failure Mode</Label><Input value={dtForm.failure_mode} onChange={e => setDtForm({ ...dtForm, failure_mode: e.target.value })} /></div>
                    <div><Label>Cause</Label>
                      <Select value={dtForm.cause_category} onValueChange={v => setDtForm({ ...dtForm, cause_category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mechanical">Mechanical</SelectItem><SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="operator_error">Operator Error</SelectItem><SelectItem value="wear">Wear</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem><SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Start</Label><Input type="datetime-local" value={dtForm.start_time} onChange={e => setDtForm({ ...dtForm, start_time: e.target.value })} /></div>
                    <div><Label>End</Label><Input type="datetime-local" value={dtForm.end_time} onChange={e => setDtForm({ ...dtForm, end_time: e.target.value })} /></div>
                    <div><Label>Corrective Action</Label><Textarea value={dtForm.corrective_action} onChange={e => setDtForm({ ...dtForm, corrective_action: e.target.value })} /></div>
                    <Button className="w-full" onClick={() => createDowntime.mutate(dtForm)}>Log Event</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Class</TableHead><TableHead>Failure Mode</TableHead><TableHead>Cause</TableHead><TableHead>Duration</TableHead><TableHead>Cost</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {downtime.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.asset_name}</TableCell>
                      <TableCell>{d.asset_class || '-'}</TableCell>
                      <TableCell>{d.failure_mode || '-'}</TableCell>
                      <TableCell><Badge className={causeColors[d.cause_category] || ''}>{d.cause_category}</Badge></TableCell>
                      <TableCell>{d.duration_hours ? `${Math.round(d.duration_hours * 10) / 10}h` : '-'}</TableCell>
                      <TableCell>{d.cost_estimate ? `${d.cost_estimate.toLocaleString()} SAR` : '-'}</TableCell>
                      <TableCell>{format(new Date(d.start_time), 'dd/MM/yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failures">
          <Card>
            <CardHeader><CardTitle>Failure Mode Trends</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failureModes.map(([mode, count]) => {
                  const pct = downtime.length > 0 ? Math.round((count / downtime.length) * 100) : 0;
                  const repeated = count > 2;
                  return (
                    <div key={mode} className="flex items-center gap-3">
                      <span className="text-sm w-40 truncate">{mode}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div className={`h-full rounded-full ${repeated ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                      {repeated && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                  );
                })}
                {failureModes.length === 0 && <p className="text-center text-muted-foreground py-8">No failure data</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pm">
          <Card>
            <CardHeader><CardTitle>PM Compliance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Task</TableHead><TableHead>Frequency</TableHead><TableHead>Last Done</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pmSchedules.map((p: any) => {
                    const overdue = p.next_due_at && new Date(p.next_due_at) < new Date();
                    return (
                      <TableRow key={p.id} className={overdue ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{p.asset_name}</TableCell>
                        <TableCell>{p.task_description || '-'}</TableCell>
                        <TableCell>{p.frequency_days}d</TableCell>
                        <TableCell>{p.last_completed_at ? format(new Date(p.last_completed_at), 'dd/MM/yyyy') : 'Never'}</TableCell>
                        <TableCell>{p.next_due_at ? format(new Date(p.next_due_at), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell><Badge className={overdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>{overdue ? 'Overdue' : 'On Track'}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mtbf">
          <Card>
            <CardHeader><CardTitle>MTBF & MTTR Analytics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-4xl font-bold text-primary">{kpis.mtbf}h</p>
                  <p className="text-sm text-muted-foreground mt-1">Mean Time Between Failures</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-4xl font-bold text-amber-500">{kpis.mttr}h</p>
                  <p className="text-sm text-muted-foreground mt-1">Mean Time To Repair</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">Based on {kpis.totalEvents} events and {kpis.totalHours} hours of total downtime</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backlog">
          <Card>
            <CardHeader><CardTitle>Maintenance Backlog</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Task</TableHead><TableHead>Overdue By</TableHead><TableHead>Assigned</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pmSchedules.filter(p => p.next_due_at && new Date(p.next_due_at) < new Date()).map((p: any) => {
                    const overdueDays = Math.round((Date.now() - new Date(p.next_due_at).getTime()) / 86400000);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.asset_name}</TableCell>
                        <TableCell className="capitalize">{p.schedule_type}</TableCell>
                        <TableCell>{p.task_description || '-'}</TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-800">{overdueDays}d overdue</Badge></TableCell>
                        <TableCell>{p.assigned_to || 'Unassigned'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {pmSchedules.filter(p => p.next_due_at && new Date(p.next_due_at) < new Date()).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No overdue maintenance</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
