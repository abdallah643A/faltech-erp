import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/hooks/useUsers';
import { useLeads } from '@/hooks/useLeads';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { useTasks, type TaskInput } from '@/hooks/useTasks';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Plus, Filter, MoreVertical, Calendar, Clock, CheckCircle2,
  Circle, AlertCircle, User, ArrowUp, ArrowDown, AlertTriangle, List, LayoutGrid,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import type { Activity } from '@/hooks/useActivities';

const statusColors: Record<string, string> = {
  pending: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-muted text-muted-foreground',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
};

const typeColors: Record<string, string> = {
  task: 'bg-primary/10 text-primary',
  call: 'bg-info/10 text-info',
  email: 'bg-purple-500/10 text-purple-600',
  meeting: 'bg-warning/10 text-warning',
  note: 'bg-muted text-muted-foreground',
};

export default function Tasks() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { sync: syncTask } = useSAPSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const { tasks, isLoading, stats, createTask, updateTask, completeTask, reopenTask, deleteTask } = useTasks({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    type: filterType !== 'all' ? filterType : undefined,
  });

  const [newTask, setNewTask] = useState<Partial<TaskInput>>({
    type: 'task',
    subject: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    lead_id: '',
    opportunity_id: '',
    business_partner_id: '',
    project_id: '',
    employee_id: '',
    sales_order_id: '',
    purchase_order_id: '',
  });
  const [relatedType, setRelatedType] = useState('');

  const { users } = useUsers();
  const { leads } = useLeads();
  const { opportunities } = useOpportunities();
  const { businessPartners } = useBusinessPartners();

  const relatedItems = useMemo(() => {
    switch (relatedType) {
      case 'Lead': return (leads || []).map(l => ({ id: l.id, name: l.name }));
      case 'Opportunity': return (opportunities || []).map(o => ({ id: o.id, name: o.name }));
      case 'Business Partner': return (businessPartners || []).map(bp => ({ id: bp.id, name: bp.card_name }));
      default: return [];
    }
  }, [relatedType, leads, opportunities, businessPartners]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.assignee_name || '').toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const overdueTasks = useMemo(() =>
    tasks.filter(t => t.status !== 'completed' && t.due_date && isPast(new Date(t.due_date))),
    [tasks]
  );

  const resetForm = () => {
    setNewTask({ type: 'task', subject: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
    setRelatedType('');
    setEditingTask(null);
  };

  const handleSave = () => {
    if (!newTask.subject) {
      toast({ title: 'Error', description: 'Subject is required', variant: 'destructive' });
      return;
    }
    if (editingTask) {
      updateTask.mutate({ id: editingTask, ...newTask } as any);
    } else {
      createTask.mutate(newTask as TaskInput);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (task: typeof tasks[0]) => {
  const { t } = useLanguage();

    setEditingTask(task.id);
    setNewTask({
      type: task.type,
      subject: task.subject,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assigned_to: task.assigned_to || '',
    });
    if (task.lead_id) { setRelatedType('Lead'); setNewTask(prev => ({ ...prev, lead_id: task.lead_id! })); }
    else if (task.opportunity_id) { setRelatedType('Opportunity'); setNewTask(prev => ({ ...prev, opportunity_id: task.opportunity_id! })); }
    else if (task.business_partner_id) { setRelatedType('Business Partner'); setNewTask(prev => ({ ...prev, business_partner_id: task.business_partner_id! })); }
    else setRelatedType('');
    setIsDialogOpen(true);
  };

  const handleToggle = (task: typeof tasks[0]) => {
    if (task.status === 'completed') {
      reopenTask.mutate(task.id);
    } else {
      completeTask.mutate(task.id);
    }
  };

  // Convert for ActivityTimeline
  const timelineActivities: Activity[] = filteredTasks.map(t => ({
    id: t.id,
    type: t.type as Activity['type'],
    subject: t.subject,
    description: t.description,
    lead_id: t.lead_id,
    opportunity_id: t.opportunity_id,
    business_partner_id: t.business_partner_id,
    due_date: t.due_date,
    completed_at: t.completed_at,
    status: (t.status || 'pending') as Activity['status'],
    priority: t.priority,
    created_by: t.created_by,
    assigned_to: t.assigned_to,
    created_at: t.created_at,
    updated_at: t.updated_at,
    sync_status: null,
  }));

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'المهام والأنشطة' : 'Tasks & Activities'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة وتتبع المهام والأنشطة عبر جميع الوحدات' : 'Manage and track tasks across all modules'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="activity" />
          <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t('common.add')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                <DialogDescription>Enter task details below</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Type</Label>
                  <Select value={newTask.type || 'task'} onValueChange={v => setNewTask({ ...newTask, type: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['task', 'call', 'email', 'meeting', 'note'].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Subject *</Label>
                  <Input value={newTask.subject || ''} onChange={e => setNewTask({ ...newTask, subject: e.target.value })} className="col-span-3" placeholder="Task subject" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Description</Label>
                  <Textarea value={newTask.description || ''} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Priority</Label>
                  <Select value={newTask.priority || 'medium'} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Due Date</Label>
                  <Input type="date" value={newTask.due_date || ''} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Assignee</Label>
                  <Select value={newTask.assigned_to || 'unassigned'} onValueChange={v => setNewTask({ ...newTask, assigned_to: v === 'unassigned' ? '' : v })}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users?.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Related To</Label>
                  <Select value={relatedType || 'none'} onValueChange={v => {
                    setRelatedType(v === 'none' ? '' : v);
                    setNewTask({ ...newTask, lead_id: '', opportunity_id: '', business_partner_id: '' });
                  }}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Opportunity">Opportunity</SelectItem>
                      <SelectItem value="Business Partner">Business Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {relatedType && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Name</Label>
                    <Select
                      value={
                        relatedType === 'Lead' ? (newTask.lead_id || 'none') :
                        relatedType === 'Opportunity' ? (newTask.opportunity_id || 'none') :
                        (newTask.business_partner_id || 'none')
                      }
                      onValueChange={v => {
                        const val = v === 'none' ? '' : v;
                        if (relatedType === 'Lead') setNewTask({ ...newTask, lead_id: val });
                        else if (relatedType === 'Opportunity') setNewTask({ ...newTask, opportunity_id: val });
                        else setNewTask({ ...newTask, business_partner_id: val });
                      }}
                    >
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select...</SelectItem>
                        {relatedItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} disabled={createTask.isPending || updateTask.isPending}>
                  {editingTask ? 'Update' : t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'all', label: 'Total', value: stats.total, icon: <Circle className="h-4 w-4 text-muted-foreground" /> },
          { key: 'pending', label: 'Pending', value: stats.pending, icon: <Clock className="h-4 w-4 text-info" /> },
          { key: 'completed', label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
          { key: 'overdue', label: 'Overdue', value: stats.overdue, icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
        ].map(stat => (
          <div key={stat.key}
            onClick={() => setFilterStatus(stat.key === 'overdue' ? 'all' : stat.key)}
            className={`enterprise-card p-4 cursor-pointer transition-all hover:shadow-md ${filterStatus === stat.key ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {stat.icon}
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Overdue Alert Banner */}
      {overdueTasks.length > 0 && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-destructive">{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {overdueTasks.slice(0, 3).map(t => t.subject).join(', ')}
              {overdueTasks.length > 3 && ` +${overdueTasks.length - 3} more`}
            </span>
          </div>
        </div>
      )}

      {/* Tabs: List & Timeline */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-1"><List className="h-3.5 w-3.5" /> List</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-1 gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {['task', 'call', 'email', 'meeting', 'note'].map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list" className="mt-4">
          <div className="enterprise-card overflow-hidden">
            <div className="divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tasks found</div>
              ) : (
                filteredTasks.map(task => {
                  const isOverdue = task.status !== 'completed' && task.due_date && isPast(new Date(task.due_date));
                  return (
                    <div key={task.id} className={`p-4 hover:bg-muted/30 transition-colors ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}>
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={() => handleToggle(task)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {task.subject}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 truncate">{task.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={typeColors[task.type] || 'bg-muted text-muted-foreground'} variant="secondary">
                                {task.type}
                              </Badge>
                              <Badge className={priorityColors[task.priority || 'medium']}>
                                {task.priority || 'medium'}
                              </Badge>
                              <Badge className={statusColors[task.status || 'pending']}>
                                {isOverdue ? 'overdue' : task.status || 'pending'}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(task)}>{t('common.edit')}</DropdownMenuItem>
                                  {task.status !== 'completed' && (
                                    <DropdownMenuItem onClick={() => completeTask.mutate(task.id)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                                    </DropdownMenuItem>
                                  )}
                                  {task.status === 'completed' && (
                                    <DropdownMenuItem onClick={() => reopenTask.mutate(task.id)}>
                                      <Circle className="mr-2 h-4 w-4" /> Reopen
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => syncTask('activity', 'to_sap', task.id)}>
                                    <ArrowUp className="mr-2 h-4 w-4" /> Push to SAP
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => syncTask('activity', 'from_sap', task.id)}>
                                    <ArrowDown className="mr-2 h-4 w-4" /> Pull from SAP
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate(task.id)}>
                                    {t('common.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            {task.due_date && (
                              <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                                {isOverdue && <span className="text-[10px]">({formatDistanceToNow(new Date(task.due_date), { addSuffix: true })})</span>}
                              </div>
                            )}
                            {task.assignee_name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                <span>{task.assignee_name}</span>
                              </div>
                            )}
                            {task.related_type && (
                              <Badge variant="outline" className="text-[10px]">
                                {task.related_type}
                              </Badge>
                            )}
                            <span className="text-[10px]">{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline activities={timelineActivities} maxItems={50} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
