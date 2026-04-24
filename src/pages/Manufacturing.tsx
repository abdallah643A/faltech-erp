import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionOrders, useQCCheckpoints, ProductionOrder, QCCheckpoint } from '@/hooks/useManufacturing';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Factory, Plus, Search, MoreHorizontal, Play, CheckCircle, XCircle,
  Clock, AlertTriangle, ShieldCheck, Send, X, CreditCard,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  planned: { label: 'Planned', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  on_hold: { label: 'On Hold', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  low: { label: 'Low', variant: 'outline' },
  normal: { label: 'Normal', variant: 'secondary' },
  high: { label: 'High', variant: 'default' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

export default function Manufacturing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { orders, isLoading, createOrder, updateOrder } = useProductionOrders();
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'normal', production_line: '', project_id: '',
    planned_start_date: '', planned_end_date: '',
  });

  // Fetch manufacturing_start alerts
  const { data: mfgAlerts } = useQuery({
    queryKey: ['manufacturing-alerts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number, contract_value, total)
        `)
        .eq('alert_type', 'manufacturing_start')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('finance_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manufacturing-alerts', activeCompanyId] }),
  });

  // Trigger final payment request (manufacturing near completion)
  const triggerFinalPayment = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('trigger_final_payment_request', {
        p_project_id: projectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-alerts', activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['production-orders', activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['payment-certificates', activeCompanyId] });
      toast({ title: 'Final payment requested', description: 'Payment certificate created and contract creator notified to collect remaining payment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error triggering final payment', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateFromAlert = (alert: any) => {
    setForm({
      title: `Production - ${alert.sales_order?.customer_name || 'Project'}`,
      description: alert.description || '',
      priority: 'high',
      production_line: '',
      project_id: alert.project_id || '',
      planned_start_date: '',
      planned_end_date: '',
    });
    setFormOpen(true);
  };

  const stats = {
    total: orders?.length || 0,
    inProgress: orders?.filter(o => o.status === 'in_progress').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    completionRate: orders?.length ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 0,
  };

  const filteredOrders = (orders || []).filter(o => {
    const matchesSearch = !searchTerm ||
      o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || o.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manufacturing</h1>
          <p className="text-muted-foreground">Production orders, work orders, and quality control</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('manufacturing'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <Button onClick={() => { setForm({ title: '', description: '', priority: 'normal', production_line: '', project_id: '', planned_start_date: '', planned_end_date: '' }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Production Order
          </Button>
        </div>
      </div>

      {/* Manufacturing Alerts */}
      {mfgAlerts && mfgAlerts.length > 0 && (
        <div className="space-y-3">
          {mfgAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
              <Factory className="h-4 w-4 !text-blue-600" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resolveAlert.mutate(alert.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {alert.description}
                {alert.sales_order && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">SO-{alert.sales_order.doc_num}</Badge>
                    <span className="text-xs">{alert.sales_order.customer_name}</span>
                  </div>
                )}
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={() => handleCreateFromAlert(alert)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Production Order
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Factory className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Orders</p></div></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Play className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><ShieldCheck className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.completionRate}%</p><p className="text-xs text-muted-foreground">Completion Rate</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="planned">Planned</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No production orders found</TableCell></TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const statusCfg = statusConfig[order.status] || statusConfig.planned;
                  const priorityCfg = priorityConfig[order.priority] || priorityConfig.normal;
                  const progress = order.quantity_planned > 0 ? Math.round((order.quantity_completed / order.quantity_planned) * 100) : 0;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number || '—'}</TableCell>
                      <TableCell className="font-medium">{order.title}</TableCell>
                      <TableCell><Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.production_line || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.planned_start_date ? format(new Date(order.planned_start_date), 'MMM dd') : '—'}
                        {order.planned_end_date ? ` — ${format(new Date(order.planned_end_date), 'MMM dd')}` : ''}
                      </TableCell>
                      <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === 'planned' && (
                              <DropdownMenuItem onClick={() => updateOrder.mutate({ id: order.id, status: 'in_progress', actual_start_date: new Date().toISOString().split('T')[0] })}>
                                <Play className="h-4 w-4 mr-2" />Start Production
                              </DropdownMenuItem>
                            )}
                            {order.status === 'in_progress' && (
                              <>
                                <DropdownMenuItem onClick={() => updateOrder.mutate({ id: order.id, status: 'completed', actual_end_date: new Date().toISOString().split('T')[0] })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />Complete
                                </DropdownMenuItem>
                                {order.project_id && (
                                  <DropdownMenuItem onClick={() => triggerFinalPayment.mutate(order.project_id)}>
                                    <CreditCard className="h-4 w-4 mr-2" />Request Final Payment
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Order title" /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Priority</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div><Label>Production Line</Label><Input value={form.production_line} onChange={(e) => setForm({ ...form, production_line: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Planned Start</Label><Input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} /></div>
              <div><Label>Planned End</Label><Input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!form.title} onClick={() => {
              createOrder.mutate({
                title: form.title,
                description: form.description || null,
                priority: form.priority,
                production_line: form.production_line || null,
                project_id: form.project_id || crypto.randomUUID(),
                planned_start_date: form.planned_start_date || null,
                planned_end_date: form.planned_end_date || null,
              }, {
                onSuccess: () => {
                  // Resolve matching manufacturing alert
                  if (form.project_id) {
                    const matchingAlert = mfgAlerts?.find(a => a.project_id === form.project_id);
                    if (matchingAlert) resolveAlert.mutate(matchingAlert.id);
                  }
                },
              });
              setFormOpen(false);
              setForm({ title: '', description: '', priority: 'normal', production_line: '', project_id: '', planned_start_date: '', planned_end_date: '' });
            }}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
