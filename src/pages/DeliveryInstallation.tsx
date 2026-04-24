import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeliveryOrders, useInstallationTasks, useProjectSignoffs, DeliveryOrder, InstallationTask } from '@/hooks/useDelivery';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  Truck, Plus, Search, MoreHorizontal, CheckCircle, Package,
  Wrench, MapPin, Calendar, Clock, X, Star, PenTool, Paperclip,
  Upload, MessageCircle, Send, Loader2, FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const deliveryStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  planning: { label: 'Planning', variant: 'outline' },
  ready: { label: 'Ready', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const taskStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  on_hold: { label: 'On Hold', variant: 'destructive' },
};

export default function DeliveryInstallation() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { deliveries, isLoading: deliveriesLoading, createDelivery, updateDelivery } = useDeliveryOrders();
  const { tasks, isLoading: tasksLoading, createTask, updateTask } = useInstallationTasks();
  const { signoffs, createSignoff, updateSignoff } = useProjectSignoffs();
  const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [signoffFormOpen, setSignoffFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('deliveries');

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // WhatsApp questionnaire
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [selectedSignoffForWA, setSelectedSignoffForWA] = useState<string>('');

  // Sales orders for contract selection
  const { data: salesOrders } = useQuery({
    queryKey: ['sales-orders-for-signoff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('id, doc_num, customer_name, contract_value, customer_code, project_id')
        .order('doc_num', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [signoffForm, setSignoffForm] = useState({
    project_id: '', title: '', sales_order_id: '', customer_name: '', customer_title: '',
    contract_number: '', contract_value: 0, customer_phone: '',
    satisfaction_score: 5, notes: '', warranty_terms: '',
    warranty_start_date: '', warranty_end_date: '',
    sales_rating: 5, delivery_rating: 5, installation_rating: 5, project_time_rating: 5,
    installation_task_id: '',
  });

  // Complete project after sign-off
  const completeProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('complete_project_signoff', { p_project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['project-signoffs'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project completed', description: 'Customer sign-off recorded. Project marked as completed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error completing project', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch installation_ready alerts
  const { data: installAlerts } = useQuery({
    queryKey: ['installation-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`*, sales_order:sales_orders(doc_num, customer_name, contract_value)`)
        .eq('alert_type', 'installation_ready')
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installation-alerts'] }),
  });

  const [deliveryForm, setDeliveryForm] = useState({
    destination_address: '', transport_method: '', scheduled_date: '',
    delivery_contact_name: '', delivery_contact_phone: '', project_id: '',
  });
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', task_type: 'installation', assigned_team: '',
    estimated_hours: '', scheduled_start: '', scheduled_end: '', project_id: '',
  });

  const stats = {
    totalDeliveries: deliveries?.length || 0,
    inTransit: deliveries?.filter(d => d.status === 'in_transit').length || 0,
    totalTasks: tasks?.length || 0,
    completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
  };

  // --- Signature canvas handlers ---
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL());
  }, []);

  const clearSignature = () => {
  const { t } = useLanguage();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureData('');
  };

  // --- File upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const newAttachments: { name: string; url: string }[] = [];
    for (const file of Array.from(files)) {
      const filePath = `signoffs/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('signoff-attachments').upload(filePath, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('signoff-attachments').getPublicUrl(filePath);
        newAttachments.push({ name: file.name, url: urlData.publicUrl });
      }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
  };

  // --- Contract selection handler ---
  const handleContractSelect = (soId: string) => {
    const so = salesOrders?.find(s => s.id === soId);
    if (so) {
      setSignoffForm(prev => ({
        ...prev,
        sales_order_id: soId,
        customer_name: so.customer_name || '',
        contract_number: `SO-${so.doc_num}`,
        contract_value: so.contract_value || 0,
        project_id: so.project_id || '',
      }));
    }
  };

  // --- Open sign-off from task action ---
  const openSignoffForTask = (task: InstallationTask) => {
    // Find matching sales order via project_id
    const so = salesOrders?.find(s => s.project_id === task.project_id);
    setSignoffForm({
      project_id: task.project_id,
      title: `Installation completion sign-off - ${task.title}`,
      sales_order_id: so?.id || '',
      customer_name: so?.customer_name || '',
      customer_title: '',
      contract_number: so ? `SO-${so.doc_num}` : '',
      contract_value: so?.contract_value || 0,
      customer_phone: '',
      satisfaction_score: 5,
      notes: '',
      warranty_terms: '',
      warranty_start_date: '',
      warranty_end_date: '',
      sales_rating: 5, delivery_rating: 5, installation_rating: 5, project_time_rating: 5,
      installation_task_id: task.id,
    });
    setAttachments([]);
    clearSignature();
    setSignoffFormOpen(true);
  };

  // --- Submit sign-off ---
  const handleSubmitSignoff = () => {
    const projectId = signoffForm.project_id || (installAlerts?.[0]?.project_id) || '';
    createSignoff.mutate({
      project_id: projectId || crypto.randomUUID(),
      title: signoffForm.title,
      signoff_type: 'installation_completion',
      customer_name: signoffForm.customer_name,
      customer_title: signoffForm.customer_title || null,
      satisfaction_score: signoffForm.satisfaction_score,
      notes: signoffForm.notes || null,
      warranty_terms: signoffForm.warranty_terms || null,
      warranty_start_date: signoffForm.warranty_start_date || null,
      warranty_end_date: signoffForm.warranty_end_date || null,
      status: 'completed',
      customer_signed_at: new Date().toISOString(),
      sales_order_id: signoffForm.sales_order_id || null,
      contract_number: signoffForm.contract_number || null,
      contract_value: signoffForm.contract_value || null,
      customer_phone: signoffForm.customer_phone || null,
      customer_signature_data: signatureData || null,
      attachments: attachments.length > 0 ? attachments : [],
      sales_rating: signoffForm.sales_rating,
      delivery_rating: signoffForm.delivery_rating,
      installation_rating: signoffForm.installation_rating,
      project_time_rating: signoffForm.project_time_rating,
      installation_task_id: signoffForm.installation_task_id || null,
    } as any, {
      onSuccess: () => {
        if (projectId) {
          completeProject.mutate(projectId);
          const matchingAlert = installAlerts?.find(a => a.project_id === projectId);
          if (matchingAlert) resolveAlert.mutate(matchingAlert.id);
        }
      },
    });
    setSignoffFormOpen(false);
    setSignoffForm({
      project_id: '', title: '', sales_order_id: '', customer_name: '', customer_title: '',
      contract_number: '', contract_value: 0, customer_phone: '',
      satisfaction_score: 5, notes: '', warranty_terms: '',
      warranty_start_date: '', warranty_end_date: '',
      sales_rating: 5, delivery_rating: 5, installation_rating: 5, project_time_rating: 5,
      installation_task_id: '',
    });
    setAttachments([]);
    clearSignature();
  };

  // --- Send WhatsApp questionnaire ---
  const handleSendQuestionnaire = async () => {
    if (!selectedSignoffForWA || !whatsappPhone) return;
    setSendingWhatsapp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('send-questionnaire', {
        body: {
          signoffId: selectedSignoffForWA,
          customerPhone: whatsappPhone,
          appUrl: window.location.origin,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (response.error) throw new Error(response.error.message);
      toast({ title: 'Questionnaire sent', description: response.data?.sent ? 'WhatsApp message sent successfully' : `Link generated: ${response.data?.questionnaireUrl}` });
      setWhatsappDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSendingWhatsapp(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery & Installation</h1>
          <p className="text-muted-foreground">Delivery scheduling, installation tracking, and sign-offs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSignoffFormOpen(true); setAttachments([]); clearSignature(); }}>
            <PenTool className="h-4 w-4 mr-2" />Customer Sign-off
          </Button>
          <Button variant="outline" onClick={() => setTaskFormOpen(true)}>
            <Wrench className="h-4 w-4 mr-2" />New Task
          </Button>
          <Button onClick={() => setDeliveryFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Delivery
          </Button>
        </div>
      </div>

      {/* Installation Ready Alerts */}
      {installAlerts && installAlerts.length > 0 && (
        <div className="space-y-3">
          {installAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-200">
              <Truck className="h-4 w-4 !text-cyan-600" />
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
                <div className="flex justify-end mt-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setDeliveryForm({ ...deliveryForm, project_id: alert.project_id || '' });
                    setDeliveryFormOpen(true);
                  }}>
                    <Truck className="h-4 w-4 mr-1" />Schedule Delivery
                  </Button>
                  <Button size="sm" onClick={() => {
                    setTaskForm({ ...taskForm, project_id: alert.project_id || '', title: `Installation - ${alert.sales_order?.customer_name || 'Project'}` });
                    setTaskFormOpen(true);
                  }}>
                    <Wrench className="h-4 w-4 mr-1" />Create Installation Task
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalDeliveries}</p><p className="text-xs text-muted-foreground">Total Deliveries</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Package className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.inTransit}</p><p className="text-xs text-muted-foreground">In Transit</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Wrench className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.totalTasks}</p><p className="text-xs text-muted-foreground">Installation Tasks</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.completedTasks}</p><p className="text-xs text-muted-foreground">Completed Tasks</p></div></div></CardContent></Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="installations">Installation Tasks</TabsTrigger>
            <TabsTrigger value="signoffs">Sign-offs ({signoffs?.length || 0})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Deliveries Table */}
      {activeTab === 'deliveries' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery #</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveriesLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                ) : (deliveries || []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deliveries found</TableCell></TableRow>
                ) : (
                  (deliveries || []).map((d) => {
                    const statusCfg = deliveryStatusConfig[d.status] || deliveryStatusConfig.planning;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm">{d.delivery_number || '—'}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /><span className="max-w-[200px] truncate">{d.destination_address || '—'}</span></div></TableCell>
                        <TableCell><p className="text-sm">{d.delivery_contact_name || '—'}</p><p className="text-xs text-muted-foreground">{d.delivery_contact_phone}</p></TableCell>
                        <TableCell>{d.transport_method || '—'}</TableCell>
                        <TableCell>{d.scheduled_date ? format(new Date(d.scheduled_date), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {d.status === 'planning' && <DropdownMenuItem onClick={() => updateDelivery.mutate({ id: d.id, status: 'ready' })}>Mark Ready</DropdownMenuItem>}
                              {d.status === 'ready' && <DropdownMenuItem onClick={() => updateDelivery.mutate({ id: d.id, status: 'in_transit' })}>Ship</DropdownMenuItem>}
                              {d.status === 'in_transit' && <DropdownMenuItem onClick={() => updateDelivery.mutate({ id: d.id, status: 'delivered', actual_delivery_date: new Date().toISOString().split('T')[0] })}>Confirm Delivery</DropdownMenuItem>}
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
      )}

      {/* Installation Tasks Table */}
      {activeTab === 'installations' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Hours (Est/Actual)</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                ) : (tasks || []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
                ) : (
                  (tasks || []).map((t) => {
                    const statusCfg = taskStatusConfig[t.status] || taskStatusConfig.pending;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.task_number || '—'}</TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{t.task_type}</Badge></TableCell>
                        <TableCell>{t.assigned_team || '—'}</TableCell>
                        <TableCell>{t.estimated_hours}h / {t.actual_hours}h</TableCell>
                        <TableCell className="text-xs">{t.scheduled_start ? format(new Date(t.scheduled_start), 'MMM dd') : '—'}</TableCell>
                        <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {t.status === 'pending' && <DropdownMenuItem onClick={() => updateTask.mutate({ id: t.id, status: 'in_progress', actual_start: new Date().toISOString() })}>Start</DropdownMenuItem>}
                              {t.status === 'in_progress' && <DropdownMenuItem onClick={() => updateTask.mutate({ id: t.id, status: 'completed', actual_end: new Date().toISOString() })}>Complete</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openSignoffForTask(t)}>
                                <PenTool className="h-4 w-4 mr-2" />Customer Sign-off
                              </DropdownMenuItem>
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
      )}

      {/* Sign-offs Table */}
      {activeTab === 'signoffs' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[120px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(signoffs || []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sign-offs found</TableCell></TableRow>
                ) : (
                  (signoffs || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>
                        {s.contract_number ? (
                          <Badge variant="outline" className="text-xs">{s.contract_number}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{s.customer_name || '—'}</TableCell>
                      <TableCell>
                        {s.satisfaction_score ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-semibold">{s.satisfaction_score}/10</span>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{s.warranty_start_date && s.warranty_end_date ? `${format(new Date(s.warranty_start_date), 'MMM yyyy')} – ${format(new Date(s.warranty_end_date), 'MMM yyyy')}` : '—'}</TableCell>
                      <TableCell><Badge variant={s.status === 'completed' ? 'secondary' : 'outline'}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                            setSelectedSignoffForWA(s.id);
                            setWhatsappPhone(s.customer_phone || '');
                            setWhatsappDialogOpen(true);
                          }} title="Send Questionnaire via WhatsApp">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          {s.status === 'pending' && s.project_id && (
                            <Button size="sm" onClick={() => {
                              updateSignoff.mutate({
                                id: s.id,
                                status: 'completed',
                                customer_signed_at: new Date().toISOString(),
                              } as any, {
                                onSuccess: () => completeProject.mutate(s.project_id),
                              });
                            }} disabled={completeProject.isPending}>
                              <CheckCircle className="h-4 w-4 mr-1" />Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Delivery Dialog */}
      <Dialog open={deliveryFormOpen} onOpenChange={setDeliveryFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Delivery Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Destination Address</Label><Input value={deliveryForm.destination_address} onChange={(e) => setDeliveryForm({ ...deliveryForm, destination_address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Transport Method</Label><Input value={deliveryForm.transport_method} onChange={(e) => setDeliveryForm({ ...deliveryForm, transport_method: e.target.value })} /></div>
              <div><Label>Scheduled Date</Label><Input type="date" value={deliveryForm.scheduled_date} onChange={(e) => setDeliveryForm({ ...deliveryForm, scheduled_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={deliveryForm.delivery_contact_name} onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_contact_name: e.target.value })} /></div>
              <div><Label>Contact Phone</Label><Input value={deliveryForm.delivery_contact_phone} onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_contact_phone: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => {
              createDelivery.mutate({
                project_id: deliveryForm.project_id || crypto.randomUUID(),
                destination_address: deliveryForm.destination_address || null,
                transport_method: deliveryForm.transport_method || null,
                scheduled_date: deliveryForm.scheduled_date || null,
                delivery_contact_name: deliveryForm.delivery_contact_name || null,
                delivery_contact_phone: deliveryForm.delivery_contact_phone || null,
              });
              setDeliveryFormOpen(false);
              setDeliveryForm({ destination_address: '', transport_method: '', scheduled_date: '', delivery_contact_name: '', delivery_contact_phone: '', project_id: '' });
            }}>Create Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Installation Task Dialog */}
      <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Installation Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('common.type')}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}>
                  <option value="installation">Installation</option>
                  <option value="commissioning">Commissioning</option>
                  <option value="testing">Testing</option>
                  <option value="training">Training</option>
                </select>
              </div>
              <div><Label>Team</Label><Input value={taskForm.assigned_team} onChange={(e) => setTaskForm({ ...taskForm, assigned_team: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Est. Hours</Label><Input type="number" value={taskForm.estimated_hours} onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} /></div>
              <div><Label>Start Date</Label><Input type="date" value={taskForm.scheduled_start} onChange={(e) => setTaskForm({ ...taskForm, scheduled_start: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={taskForm.scheduled_end} onChange={(e) => setTaskForm({ ...taskForm, scheduled_end: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!taskForm.title} onClick={() => {
              createTask.mutate({
                project_id: taskForm.project_id || crypto.randomUUID(),
                title: taskForm.title,
                description: taskForm.description || null,
                task_type: taskForm.task_type,
                assigned_team: taskForm.assigned_team || null,
                estimated_hours: parseFloat(taskForm.estimated_hours) || 0,
                scheduled_start: taskForm.scheduled_start || null,
                scheduled_end: taskForm.scheduled_end || null,
              });
              setTaskFormOpen(false);
              setTaskForm({ title: '', description: '', task_type: 'installation', assigned_team: '', estimated_hours: '', scheduled_start: '', scheduled_end: '', project_id: '' });
            }}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Customer Sign-off Dialog */}
      <Dialog open={signoffFormOpen} onOpenChange={setSignoffFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Sign-off & Satisfaction</DialogTitle>
            <DialogDescription>Complete the sign-off with contract data, ratings and signature</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={signoffForm.title} onChange={(e) => setSignoffForm({ ...signoffForm, title: e.target.value })} placeholder="Installation completion sign-off" /></div>

            {/* Contract Selection */}
            <div className="space-y-2">
              <Label>Select Contract / Sales Order</Label>
              <Select value={signoffForm.sales_order_id} onValueChange={handleContractSelect}>
                <SelectTrigger><SelectValue placeholder="Select a contract..." /></SelectTrigger>
                <SelectContent>
                  {(salesOrders || []).map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      SO-{so.doc_num} — {so.customer_name} ({(so.contract_value || 0).toLocaleString()} SAR)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contract Info Display */}
            {signoffForm.contract_number && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Contract:</span>
                  <Badge variant="outline">{signoffForm.contract_number}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Customer:</span>
                  <span className="text-sm">{signoffForm.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Contract Value:</span>
                  <span className="text-sm font-semibold">{signoffForm.contract_value.toLocaleString()} SAR</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Customer Title</Label><Input value={signoffForm.customer_title} onChange={(e) => setSignoffForm({ ...signoffForm, customer_title: e.target.value })} /></div>
              <div><Label>Customer Phone</Label><Input value={signoffForm.customer_phone} onChange={(e) => setSignoffForm({ ...signoffForm, customer_phone: e.target.value })} placeholder="+966 5XX XXX XXXX" dir="ltr" /></div>
            </div>

            {/* Multi-category Ratings */}
            <div className="space-y-3 p-3 rounded-lg border">
              <Label className="text-base font-semibold">Team Ratings</Label>
              {[
                { label: 'Sales Team', key: 'sales_rating' as const },
                { label: 'Delivery Team', key: 'delivery_rating' as const },
                { label: 'Installation Team', key: 'installation_rating' as const },
                { label: 'Project Timeline', key: 'project_time_rating' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{label}</span>
                    <div className="flex items-center gap-1">
                      <Star className={`h-4 w-4 ${signoffForm[key] >= 7 ? 'text-amber-500 fill-amber-500' : signoffForm[key] >= 4 ? 'text-amber-400' : 'text-red-400'}`} />
                      <span className="font-bold">{signoffForm[key]}</span>
                    </div>
                  </div>
                  <Slider value={[signoffForm[key]]} onValueChange={(v) => setSignoffForm({ ...signoffForm, [key]: v[0] })} min={1} max={10} step={1} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Overall Average</span>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-lg">
                    {((signoffForm.sales_rating + signoffForm.delivery_rating + signoffForm.installation_rating + signoffForm.project_time_rating) / 4).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div><Label>Notes / Punch List</Label><Textarea value={signoffForm.notes} onChange={(e) => setSignoffForm({ ...signoffForm, notes: e.target.value })} placeholder="Any remaining items, observations..." /></div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="cursor-pointer">
                  <label>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    Upload Files
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1 mt-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">{a.name}</a>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Signature */}
            <div className="space-y-2">
              <Label>Customer Signature</Label>
              <div className="border rounded-lg p-1 bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full cursor-crosshair border rounded"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={clearSignature}>Clear Signature</Button>
            </div>

            <div><Label>Warranty Terms</Label><Input value={signoffForm.warranty_terms} onChange={(e) => setSignoffForm({ ...signoffForm, warranty_terms: e.target.value })} placeholder="e.g. 12 months parts & labor" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Warranty Start</Label><Input type="date" value={signoffForm.warranty_start_date} onChange={(e) => setSignoffForm({ ...signoffForm, warranty_start_date: e.target.value })} /></div>
              <div><Label>Warranty End</Label><Input type="date" value={signoffForm.warranty_end_date} onChange={(e) => setSignoffForm({ ...signoffForm, warranty_end_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignoffFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!signoffForm.title || !signoffForm.sales_order_id} onClick={handleSubmitSignoff}>
              <PenTool className="h-4 w-4 mr-1" />
              Submit Sign-off & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Questionnaire Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Send Satisfaction Questionnaire
            </DialogTitle>
            <DialogDescription>Send a questionnaire link to the customer via WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Customer Phone Number *</Label>
              <Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="+966 5XX XXX XXXX" dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">Enter phone number with country code</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSendQuestionnaire} disabled={sendingWhatsapp || !whatsappPhone} className="gap-2">
              {sendingWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
