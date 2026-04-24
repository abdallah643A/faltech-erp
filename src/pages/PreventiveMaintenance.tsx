import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wrench, Plus, Calendar, AlertTriangle, Clock, DollarSign, Search } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PreventiveMaintenance() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ plan_name: '', frequency: 'monthly', frequency_days: 30, next_service_date: '', estimated_cost: 0, estimated_downtime_hours: 0 });

  const { data: plans = [] } = useQuery({
    queryKey: ['maintenance-plans', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('maintenance_plans' as any).select('*').order('next_service_date') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['maintenance-work-orders', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('maintenance_work_orders' as any).select('*').order('scheduled_date', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('maintenance_plans' as any).insert({
        ...data, created_by: user?.id, is_active: true,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      toast({ title: 'Maintenance plan created' });
      setShowNewPlan(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const generateWorkOrder = useMutation({
    mutationFn: async (plan: any) => {
      const woNumber = 'WO-' + Date.now().toString().slice(-6);
      const { error } = await (supabase.from('maintenance_work_orders' as any).insert({
        plan_id: plan.id, asset_id: plan.asset_id, work_order_number: woNumber,
        status: 'scheduled', scheduled_date: plan.next_service_date,
        technician_id: plan.technician_id, technician_name: plan.technician_name,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
      // Advance next service date
      const nextDate = new Date(plan.next_service_date);
      nextDate.setDate(nextDate.getDate() + (plan.frequency_days || 30));
      await (supabase.from('maintenance_plans' as any).update({
        last_service_date: plan.next_service_date,
        next_service_date: nextDate.toISOString().split('T')[0],
      }).eq('id', plan.id) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-work-orders'] });
      toast({ title: 'Work order generated' });
    },
  });

  const overduePlans = plans.filter((p: any) => p.next_service_date && isPast(new Date(p.next_service_date)));
  const activePlans = plans.filter((p: any) => p.is_active).length;
  const openWOs = workOrders.filter((w: any) => !['completed', 'cancelled'].includes(w.status)).length;
  const totalCost = workOrders.reduce((s: number, w: any) => s + (w.actual_cost || 0), 0);

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Preventive Maintenance</h1>
          <p className="text-sm text-muted-foreground">Schedule and track equipment maintenance</p>
        </div>
        <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Maintenance Plan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Plan Name *</Label><Input value={planForm.plan_name} onChange={e => setPlanForm(f => ({ ...f, plan_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Frequency</Label>
                  <Select value={planForm.frequency} onValueChange={v => setPlanForm(f => ({ ...f, frequency: v, frequency_days: v === 'weekly' ? 7 : v === 'monthly' ? 30 : v === 'quarterly' ? 90 : 365 }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Next Service Date</Label><Input type="date" value={planForm.next_service_date} onChange={e => setPlanForm(f => ({ ...f, next_service_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Est. Cost (SAR)</Label><Input type="number" value={planForm.estimated_cost} onChange={e => setPlanForm(f => ({ ...f, estimated_cost: +e.target.value }))} /></div>
                <div><Label>Est. Downtime (hrs)</Label><Input type="number" value={planForm.estimated_downtime_hours} onChange={e => setPlanForm(f => ({ ...f, estimated_downtime_hours: +e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={() => createPlan.mutate(planForm)} disabled={!planForm.plan_name}>Create Plan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Plans</p><p className="text-2xl font-bold">{activePlans}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</p><p className="text-2xl font-bold text-destructive">{overduePlans.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Work Orders</p><p className="text-2xl font-bold">{openWOs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-2xl font-bold">SAR {totalCost.toLocaleString()}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="plans">
        <TabsList><TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger><TabsTrigger value="work-orders">Work Orders ({workOrders.length})</TabsTrigger></TabsList>
        <TabsContent value="plans">
          <div className="border rounded-lg overflow-auto">
            <Table><TableHeader><TableRow>
              <TableHead>Plan Name</TableHead><TableHead>Frequency</TableHead><TableHead>Next Service</TableHead><TableHead>Last Service</TableHead><TableHead>Est. Cost</TableHead><TableHead>Technician</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {plans.map((p: any) => {
                const isOverdue = p.next_service_date && isPast(new Date(p.next_service_date));
                return (
                  <TableRow key={p.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{p.plan_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{p.frequency}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {p.next_service_date ? format(new Date(p.next_service_date), 'PP') : '—'}
                      {isOverdue && <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{p.last_service_date ? format(new Date(p.last_service_date), 'PP') : '—'}</TableCell>
                    <TableCell className="text-sm">SAR {(p.estimated_cost || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{p.technician_name || '—'}</TableCell>
                    <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'} className="text-xs">{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" className="text-xs" onClick={() => generateWorkOrder.mutate(p)}>Generate WO</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="work-orders">
          <div className="border rounded-lg overflow-auto">
            <Table><TableHeader><TableRow>
              <TableHead>WO #</TableHead><TableHead>Scheduled</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Technician</TableHead><TableHead>Downtime (hrs)</TableHead><TableHead>Cost</TableHead><TableHead>{t('common.notes')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {workOrders.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.work_order_number}</TableCell>
                  <TableCell className="text-sm">{w.scheduled_date ? format(new Date(w.scheduled_date), 'PP') : '—'}</TableCell>
                  <TableCell><Badge variant={w.status === 'completed' ? 'default' : 'outline'} className="text-xs capitalize">{w.status}</Badge></TableCell>
                  <TableCell className="text-sm">{w.technician_name || '—'}</TableCell>
                  <TableCell className="text-sm">{w.downtime_hours || 0}</TableCell>
                  <TableCell className="text-sm">SAR {(w.actual_cost || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm truncate max-w-[150px]">{w.technician_notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
