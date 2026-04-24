import { useState, useEffect } from 'react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useSAPSync } from '@/hooks/useSAPSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Plus, MoreVertical, Phone, Mail, Calendar, FileText, CheckCircle, Clock, Users,
  ArrowUp, ArrowDown, Pencil, List, CalendarDays, Activity as ActivityIcon, BarChart3, AlertTriangle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ActivitySummary } from '@/components/ai/ActivitySummary';
import { VoiceNoteRecorder } from '@/components/crm/VoiceNoteRecorder';
import { useActivities, ActivityInput } from '@/hooks/useActivities';
import { useLeads } from '@/hooks/useLeads';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { useDimensions } from '@/hooks/useDimensions';
import { ActivityCalendarView } from '@/components/activities/ActivityCalendarView';
import { ActivityTimeline } from '@/components/activities/ActivityTimeline';
import { OverdueAlerts } from '@/components/activities/OverdueAlerts';
import { ActivityPerformanceDashboard } from '@/components/activities/ActivityPerformanceDashboard';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { cn } from '@/lib/utils';

const activityColumns: ColumnDef[] = [
  { key: 'type', header: 'Type' },
  { key: 'subject', header: 'Subject' },
  { key: 'status', header: 'Status' },
  { key: 'priority', header: 'Priority' },
  { key: 'due_date', header: 'Due Date' },
  { key: 'assigned_to', header: 'Assigned To' },
];

type RelatedType = 'Lead' | 'Opportunity' | 'Business Partner' | '';

const typeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText,
};

const statusColors: Record<string, string> = {
  'pending': 'bg-info/10 text-info',
  'completed': 'bg-success/10 text-success',
  'cancelled': 'bg-muted text-muted-foreground',
};

const priorityColors: Record<string, string> = {
  'low': 'bg-muted text-muted-foreground',
  'medium': 'bg-warning/10 text-warning',
  'high': 'bg-destructive/10 text-destructive',
};

export default function Activities() {
  const { t, language } = useLanguage();
  const { sync: syncActivity } = useSAPSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [relatedType, setRelatedType] = useState<RelatedType>('');
  const [relatedId, setRelatedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('list');

  const { activities, isLoading, createActivity, completeActivity, updateActivity, deleteActivity } = useActivities();

  const [newActivity, setNewActivity] = useState<ActivityInput & { priority?: string }>({
    type: 'call', subject: '', description: '', priority: 'medium',
  });

  const { leads } = useLeads();
  const { opportunities } = useOpportunities();
  const { businessPartners } = useBusinessPartners();
  const { activeDimensions: employeeDimensions } = useDimensions('employees');

  const overdueCount = activities.filter(a => a.status === 'pending' && a.due_date && new Date(a.due_date) < new Date()).length;

  const getRelatedOptions = () => {
    switch (relatedType) {
      case 'Lead': return leads.map(l => ({ id: l.id, name: `${l.name} - ${l.company}` }));
      case 'Opportunity': return opportunities.map(o => ({ id: o.id, name: `${o.name} - ${o.company}` }));
      case 'Business Partner': return businessPartners.map(bp => ({ id: bp.id, name: `${bp.card_name} (${bp.card_code})` }));
      default: return [];
    }
  };
  const relatedOptions = getRelatedOptions();

  const handleRelatedTypeChange = (value: RelatedType) => { setRelatedType(value); setRelatedId(''); };
  const handleRelatedIdChange = (value: string) => { setRelatedId(value); };

  useEffect(() => { if (!isDialogOpen) { setRelatedType(''); setRelatedId(''); } }, [isDialogOpen]);

  const filteredActivities = activities.filter(a => {
    const matchesSearch = a.subject.toLowerCase().includes(searchQuery.toLowerCase()) || (a.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || a.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'overdue' ? (a.status === 'pending' && a.due_date && new Date(a.due_date) < new Date()) : false) ||
      (filterStatus === 'high' ? (a.priority === 'high' && a.status !== 'completed') : false) ||
      (filterStatus !== 'overdue' && filterStatus !== 'high' && a.status === filterStatus);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAddActivity = () => {
    if (!newActivity.subject) {
      toast({ title: "Validation Error", description: "Please fill in the subject field", variant: "destructive" });
      return;
    }
    const input: ActivityInput = {
      type: newActivity.type, subject: newActivity.subject, description: newActivity.description,
      due_date: newActivity.due_date, assigned_to: newActivity.assigned_to,
      priority: newActivity.priority || 'medium',
    };
    if (relatedType === 'Lead' && relatedId) input.business_partner_id = relatedId;
    else if (relatedType === 'Opportunity' && relatedId) input.opportunity_id = relatedId;
    else if (relatedType === 'Business Partner' && relatedId) input.business_partner_id = relatedId;

    createActivity.mutate(input, { onSuccess: () => { setNewActivity({ type: 'call', subject: '', description: '', priority: 'medium' }); setIsDialogOpen(false); } });
  };

  const handleStatusChange = (id: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    if (newStatus === 'completed') completeActivity.mutate(id);
    else updateActivity.mutate({ id, status: newStatus });
  };

  const handleDeleteActivity = (id: string) => { deleteActivity.mutate(id); };

  const handleEditActivity = (activity: any) => {
    setEditingActivity({
      id: activity.id, type: activity.type, subject: activity.subject,
      description: activity.description || '', priority: activity.priority || 'medium',
      due_date: activity.due_date || '', assigned_to: activity.assigned_to || '', status: activity.status || 'pending',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingActivity?.subject) return;
    updateActivity.mutate({
      id: editingActivity.id, type: editingActivity.type, subject: editingActivity.subject,
      description: editingActivity.description, priority: editingActivity.priority,
      due_date: editingActivity.due_date || null, assigned_to: editingActivity.assigned_to || null, status: editingActivity.status,
    }, { onSuccess: () => { setIsEditDialogOpen(false); setEditingActivity(null); } });
  };

  const summaryActivities = activities.map(a => ({
    id: a.id, type: a.type, subject: a.subject, description: a.description || '', relatedTo: '',
    relatedType: 'Lead' as const, assignedTo: a.assigned_to || '', dueDate: a.due_date || '',
    status: a.status === 'pending' ? 'Planned' as const : a.status === 'completed' ? 'Completed' as const : 'Cancelled' as const,
    priority: (a.priority || 'Medium') as 'Low' | 'Medium' | 'High', createdAt: a.created_at,
  }));

  return (
    <div className="space-y-4 md:space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">{t('nav.activities')}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Track calls, emails, meetings, and tasks</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ActivitySummary activities={summaryActivities} />
          <ExportImportButtons data={filteredActivities} columns={activityColumns} filename="activities" title="Activities" />
          <SAPSyncButton entity="activity" />
          <ClearAllButton tableName="activities" displayName="Activities" queryKeys={['activities']} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t('common.add')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Activity</DialogTitle>
                <DialogDescription>Schedule a new activity or task</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 overflow-y-auto flex-1 pr-1">
                <div className="space-y-2">
                  <Label>Activity Type *</Label>
                  <Select value={newActivity.type} onValueChange={(v) => setNewActivity({ ...newActivity, type: v as ActivityInput['type'] })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Call</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="meeting">📅 Meeting</SelectItem>
                      <SelectItem value="task">✓ Task</SelectItem>
                      <SelectItem value="note">📝 Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newActivity.priority || 'medium'} onValueChange={(v) => setNewActivity({ ...newActivity, priority: v })}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('activity.subject')} *</Label>
                  <Input placeholder={t('activity.subject')} value={newActivity.subject} onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('activity.relatedType')}</Label>
                  <Select value={relatedType} onValueChange={(v) => handleRelatedTypeChange(v as RelatedType)}>
                    <SelectTrigger><SelectValue placeholder={t('activity.selectRelatedType')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">{t('nav.leads')}</SelectItem>
                      <SelectItem value="Opportunity">{t('nav.opportunities')}</SelectItem>
                      <SelectItem value="Business Partner">{t('nav.businessPartners')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('activity.relatedTo')}</Label>
                  <Select value={relatedId} onValueChange={handleRelatedIdChange} disabled={!relatedType}>
                    <SelectTrigger><SelectValue placeholder={relatedType ? t('common.search') : t('activity.selectRelatedType')} /></SelectTrigger>
                    <SelectContent>
                      {relatedOptions.filter(o => o.id).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('activity.dueDate')}</Label>
                  <Input type="datetime-local" value={newActivity.due_date || ''} onChange={(e) => setNewActivity({ ...newActivity, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('activity.assignedTo')}</Label>
                  <Select value={newActivity.assigned_to || ''} onValueChange={(v) => setNewActivity({ ...newActivity, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder={t('activity.selectUser')} /></SelectTrigger>
                    <SelectContent>
                      {employeeDimensions.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.cost_center})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('activity.description')}</Label>
                  <Textarea placeholder={t('activity.description')} value={newActivity.description || ''} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleAddActivity} disabled={createActivity.isPending}>
                  {createActivity.isPending ? 'Saving...' : t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {[
          { icon: Clock, color: 'bg-info/10 text-info', value: activities.filter(a => a.status === 'pending').length, label: 'Pending', filter: 'pending' },
          { icon: CheckCircle, color: 'bg-success/10 text-success', value: activities.filter(a => a.status === 'completed').length, label: 'Completed', filter: 'completed' },
          { icon: Users, color: 'bg-warning/10 text-warning', value: activities.length, label: 'Total', filter: 'all' },
          { icon: Calendar, color: 'bg-destructive/10 text-destructive', value: activities.filter(a => a.priority === 'high' && a.status !== 'completed').length, label: 'High Priority', filter: 'high' },
          { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive', value: overdueCount, label: 'Overdue', filter: 'overdue' },
        ].map(s => (
          <div
            key={s.label}
            className={cn(
              "enterprise-card p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
              filterStatus === s.filter && "ring-2 ring-primary ring-offset-1"
            )}
            onClick={() => {
              setFilterStatus(filterStatus === s.filter ? 'all' : s.filter);
              setActiveTab('list');
              if (s.filter === 'overdue') setActiveTab('overdue');
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5">
            <TabsTrigger value="list" className="gap-1 text-xs md:text-sm"><List className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">List</span></TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 text-xs md:text-sm"><CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">Calendar</span></TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 text-xs md:text-sm"><ActivityIcon className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">Timeline</span></TabsTrigger>
            <TabsTrigger value="overdue" className="gap-1 text-xs md:text-sm relative">
              <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">Overdue</span>
              {overdueCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">{overdueCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1 text-xs md:text-sm"><BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" /><span className="hidden sm:inline">Analytics</span></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="enterprise-card">
            <div className="p-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('common.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="enterprise-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Subject</th>
                    <th className="col-mobile-hidden">Due Date</th>
                    <th className="col-mobile-hidden">Priority</th>
                    <th>Status</th>
                    <th className="col-tablet-hidden">Sync Status</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No activities found</td></tr>
                  ) : (
                    filteredActivities.map(activity => {
                      const TypeIcon = typeIcons[activity.type] || FileText;
                      const isOverdue = activity.status === 'pending' && activity.due_date && new Date(activity.due_date) < new Date();
                      return (
                        <tr key={activity.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <TypeIcon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="capitalize">{activity.type}</span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="font-medium">{activity.subject}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">{activity.description}</p>
                            </div>
                          </td>
                          <td className="col-mobile-hidden">
                            {activity.due_date ? (
                              <div className={`flex items-center gap-2 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(activity.due_date).toLocaleDateString()}
                                {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="col-mobile-hidden">
                            <Badge className={priorityColors[activity.priority || 'medium']}>{activity.priority || 'medium'}</Badge>
                          </td>
                          <td>
                            <Badge className={statusColors[activity.status || 'pending']}>{activity.status || 'pending'}</Badge>
                          </td>
                          <td className="col-tablet-hidden">
                            <Badge className={
                              activity.sync_status === 'synced' ? 'bg-success/10 text-success' :
                              activity.sync_status === 'error' ? 'bg-destructive/10 text-destructive' :
                              activity.sync_status === 'pending' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-foreground'
                            }>{activity.sync_status || 'not synced'}</Badge>
                          </td>
                          <td>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditActivity(activity)}>
                                  <Pencil className="mr-2 h-4 w-4" />{t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(activity.id, 'completed')}>Mark Completed</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(activity.id, 'cancelled')}>Mark Cancelled</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => syncActivity('activity', 'to_sap', activity.id)}>
                                  <ArrowUp className="mr-2 h-4 w-4" />{language === 'ar' ? 'دفع إلى SAP' : 'Push to SAP'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => syncActivity('activity', 'from_sap', activity.id)}>
                                  <ArrowDown className="mr-2 h-4 w-4" />{language === 'ar' ? 'سحب من SAP' : 'Pull from SAP'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteActivity(activity.id)}>{t('common.delete')}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <ActivityCalendarView activities={activities} onActivityClick={handleEditActivity} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline activities={filteredActivities} maxItems={30} />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <OverdueAlerts activities={activities} onComplete={(id) => completeActivity.mutate(id)} onEdit={handleEditActivity} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <ActivityPerformanceDashboard activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Edit Activity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} Activity</DialogTitle>
            <DialogDescription>Update activity details</DialogDescription>
          </DialogHeader>
          {editingActivity && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-2">
                <Label>Activity Type *</Label>
                <Select value={editingActivity.type} onValueChange={(v) => setEditingActivity({ ...editingActivity, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">📅 Meeting</SelectItem>
                    <SelectItem value="task">✓ Task</SelectItem>
                    <SelectItem value="note">📝 Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editingActivity.priority} onValueChange={(v) => setEditingActivity({ ...editingActivity, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('activity.subject')} *</Label>
                <Input value={editingActivity.subject} onChange={(e) => setEditingActivity({ ...editingActivity, subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingActivity.status} onValueChange={(v) => setEditingActivity({ ...editingActivity, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('activity.dueDate')}</Label>
                <Input type="datetime-local" value={editingActivity.due_date} onChange={(e) => setEditingActivity({ ...editingActivity, due_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('activity.assignedTo')}</Label>
                <Select value={editingActivity.assigned_to} onValueChange={(v) => setEditingActivity({ ...editingActivity, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder={t('activity.selectUser')} /></SelectTrigger>
                  <SelectContent>
                    {employeeDimensions.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.cost_center})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('activity.description')}</Label>
                <Textarea value={editingActivity.description} onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-2 block">Voice Note</Label>
                <VoiceNoteRecorder
                  activityId={editingActivity.id}
                  onTranscriptReady={(text) => {
                    setEditingActivity({
                      ...editingActivity,
                      description: (editingActivity.description ? editingActivity.description + '\n\n' : '') + '🎙️ ' + text,
                    });
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveEdit} disabled={updateActivity.isPending}>
              {updateActivity.isPending ? 'Saving...' : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
