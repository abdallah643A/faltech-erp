import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Wrench, Calendar, ClipboardCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ServiceMaintenance() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('requests');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', request_type: 'corrective', priority: 'medium', customer_name: '', equipment_name: '', location: '' });

  const { data: requests = [] } = useQuery({
    queryKey: ['service-requests', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('service_requests' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pmPlans = [] } = useQuery({
    queryKey: ['pm-plans', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('preventive_maintenance_plans' as any).select('*').order('next_due') as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const num = 'SR-' + Date.now().toString().slice(-6);
      const { error } = await (supabase.from('service_requests' as any).insert({ ...formData, request_number: num, company_id: activeCompanyId, created_by: user?.id, reported_by: user?.email }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-requests'] }); setShowCreate(false); toast({ title: 'Service request created' }); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') updates.completed_date = new Date().toISOString();
      const { error } = await (supabase.from('service_requests' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-requests'] }); toast({ title: 'Status updated' }); },
  });

  const priorityColor = (p: string) => p === 'critical' ? 'destructive' : p === 'high' ? 'default' : 'secondary';
  const statusColor = (s: string) => s === 'completed' ? 'default' : s === 'in_progress' ? 'secondary' : s === 'cancelled' ? 'destructive' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" />Service & Maintenance</h1>
          <p className="text-muted-foreground">Service requests, PM plans, technician assignments, and service reports</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Service Request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Service Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('common.type')}</Label>
                  <Select value={formData.request_type} onValueChange={v => setFormData(p => ({ ...p, request_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Customer</Label><Input value={formData.customer_name} onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Equipment</Label><Input value={formData.equipment_name} onChange={e => setFormData(p => ({ ...p, equipment_name: e.target.value }))} /></div>
              <div><Label>Location</Label><Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>{t('common.description')}</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={() => createRequest.mutate()} disabled={!formData.title}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {[{ label: 'Open', value: requests.filter((r: any) => r.status === 'open').length, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'In Progress', value: requests.filter((r: any) => r.status === 'in_progress').length, icon: Wrench, color: 'text-blue-600' },
          { label: 'Completed', value: requests.filter((r: any) => r.status === 'completed').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'PM Plans', value: pmPlans.length, icon: Calendar, color: 'text-purple-600' },
          { label: 'Overdue PM', value: pmPlans.filter((p: any) => p.next_due && new Date(p.next_due) < new Date()).length, icon: AlertTriangle, color: 'text-red-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.color}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-[10px] text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="requests">Service Requests</TabsTrigger><TabsTrigger value="pm">PM Plans</TabsTrigger></TabsList>
        <TabsContent value="requests">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Title</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Priority</TableHead><TableHead>Customer</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.equipment_name}</div></TableCell>
                    <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                    <TableCell><Badge variant={priorityColor(r.priority)}>{r.priority}</Badge></TableCell>
                    <TableCell className="text-sm">{r.customer_name || '—'}</TableCell>
                    <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'in_progress' })}>Start</Button>}
                        {r.status === 'in_progress' && <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'completed' })}>Complete</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No service requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="pm">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Plan</TableHead><TableHead>Equipment</TableHead><TableHead>Frequency</TableHead><TableHead>Next Due</TableHead><TableHead>Technician</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pmPlans.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.plan_name}</TableCell>
                    <TableCell className="text-sm">{p.equipment_name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{p.frequency}</Badge></TableCell>
                    <TableCell className="text-sm">{p.next_due ? format(new Date(p.next_due), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm">{p.assigned_technician_name || 'Unassigned'}</TableCell>
                    <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Paused'}</Badge></TableCell>
                  </TableRow>
                ))}
                {pmPlans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No PM plans</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
