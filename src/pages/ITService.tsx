import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useITSM, ITTicket, ITChange, ITProblem, ITCMDB, ITSLAConfig } from '@/hooks/useITSM';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Search, Plus, MoreVertical, Ticket, Clock, CheckCircle2, AlertCircle, User,
  MessageSquare, BookOpen, ShoppingBag, BarChart3, Eye, Edit, Trash2,
  Send, ArrowRight, Globe, Wrench, Monitor, Wifi, Mail, Shield, Loader2,
  GitBranch, Bug, Database, Settings, AlertTriangle, TrendingUp, Timer,
  Server, Cpu, HardDrive, Zap, FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours, addHours, isPast } from 'date-fns';

const priorityColors: Record<string, string> = {
  Low: 'bg-muted text-muted-foreground',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Closed: 'bg-muted text-muted-foreground',
  Draft: 'bg-muted text-muted-foreground',
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'CAB Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Implementing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Retired: 'bg-muted text-muted-foreground',
};

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Email', 'Access', 'Other'];
const KB_CATEGORIES = ['General', 'Hardware', 'Software', 'Network', 'Security', 'How-to'];
const CATALOG_CATEGORIES = ['Hardware', 'Software', 'Access', 'Network', 'General'];
const CHANGE_TYPES = ['Standard', 'Normal', 'Emergency'];
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const CI_TYPES = ['Server', 'Workstation', 'Network Device', 'Printer', 'Software', 'Database', 'Application', 'Cloud Service', 'Storage', 'Other'];
const CI_CLASSES = ['Hardware', 'Software', 'Network', 'Cloud', 'Other'];
const ENVIRONMENTS = ['Production', 'Staging', 'Development', 'Testing', 'DR'];
const CHANGE_STATUSES = ['Draft', 'Submitted', 'CAB Review', 'Approved', 'Implementing', 'Completed', 'Rejected', 'Closed'];
const PROBLEM_STATUSES = ['Open', 'In Progress', 'Root Cause Identified', 'Known Error', 'Resolved', 'Closed'];

export default function ITService() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const {
    tickets, ticketsLoading, kbArticles, catalog,
    changes, problems, cmdbItems, slaConfigs,
    createTicket, updateTicket, deleteTicket,
    addComment,
    createKBArticle, updateKBArticle, deleteKBArticle,
    createServiceItem, updateServiceItem, deleteServiceItem,
    createChange, updateChange, deleteChange,
    createProblem, updateProblem, deleteProblem,
    createCI, updateCI, deleteCI,
    createSLA, updateSLA, deleteSLA,
  } = useITSM();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Dialogs
  const [ticketDialog, setTicketDialog] = useState(false);
  const [ticketDetailId, setTicketDetailId] = useState<string | null>(null);
  const [kbDialog, setKbDialog] = useState(false);
  const [kbViewId, setKbViewId] = useState<string | null>(null);
  const [catalogDialog, setCatalogDialog] = useState(false);
  const [changeDialog, setChangeDialog] = useState(false);
  const [problemDialog, setProblemDialog] = useState(false);
  const [cmdbDialog, setCmdbDialog] = useState(false);
  const [slaDialog, setSlaDialog] = useState(false);
  const [editingKb, setEditingKb] = useState<any>(null);
  const [editingCatalog, setEditingCatalog] = useState<any>(null);
  const [editingChange, setEditingChange] = useState<ITChange | null>(null);
  const [editingProblem, setEditingProblem] = useState<ITProblem | null>(null);
  const [editingCI, setEditingCI] = useState<ITCMDB | null>(null);
  const [editingSLA, setEditingSLA] = useState<ITSLAConfig | null>(null);

  // Forms
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category: 'Hardware', priority: 'Medium', department: '', impact: 'Medium', urgency: 'Medium', source: 'portal' });
  const [commentText, setCommentText] = useState('');
  const [kbForm, setKbForm] = useState({ title: '', content: '', category: 'General', tags: '' });
  const [catalogForm, setCatalogForm] = useState({ name: '', name_ar: '', description: '', category: 'General', estimated_time: '', requires_approval: false });
  const [changeForm, setChangeForm] = useState({ title: '', description: '', change_type: 'Standard', risk_level: 'Low', impact: 'Low', urgency: 'Low', priority: 'Medium', category: 'General', rollback_plan: '', test_plan: '', cab_required: false, planned_start: '', planned_end: '' });
  const [problemForm, setProblemForm] = useState({ title: '', description: '', category: 'General', priority: 'Medium', impact: 'Low', root_cause: '', workaround: '' });
  const [cmdbForm, setCmdbForm] = useState({ name: '', ci_type: 'Server', ci_class: 'Hardware', status: 'Active', environment: 'Production', owner_name: '', department: '', location: '', ip_address: '', os: '', manufacturer: '', model: '', serial_number: '', criticality: 'Medium', notes: '' });
  const [slaForm, setSlaForm] = useState({ name: '', priority: 'Medium', response_time_hours: 4, resolution_time_hours: 24, escalation_after_hours: 8, escalation_to: '', business_hours_only: true });

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Filtered tickets
  const filteredTickets = useMemo(() => tickets.filter(tk => {
    const matchesSearch = tk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tk.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tk.requester_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tk.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || tk.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  }), [tickets, searchQuery, filterStatus, filterPriority]);

  // Stats
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;
    const highPriority = tickets.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
    const resolvedTickets = tickets.filter(t => t.resolved_at && t.created_at);
    const avgResTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((s, t) => s + differenceInHours(new Date(t.resolved_at!), new Date(t.created_at)), 0) / resolvedTickets.length
      : 0;
    const slaBreached = tickets.filter(t => t.sla_resolution_breached).length;
    const slaCompliance = tickets.length > 0 ? Math.round(((tickets.length - slaBreached) / tickets.length) * 100) : 100;
    const byCategory: Record<string, number> = {};
    tickets.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + 1; });
    const openChanges = changes.filter(c => !['Completed', 'Closed', 'Rejected'].includes(c.status)).length;
    const openProblems = problems.filter(p => !['Resolved', 'Closed'].includes(p.status)).length;
    const totalCIs = cmdbItems.length;
    return { total: tickets.length, open, inProgress, resolved, closed, highPriority, avgResTime: Math.round(avgResTime), byCategory, slaCompliance, slaBreached, openChanges, openProblems, totalCIs };
  }, [tickets, changes, problems, cmdbItems]);

  const selectedTicket = ticketDetailId ? tickets.find(t => t.id === ticketDetailId) : null;
  const viewedArticle = kbViewId ? kbArticles.find(a => a.id === kbViewId) : null;

  // Priority matrix (impact x urgency)
  const getPriorityFromMatrix = (impact: string, urgency: string) => {
    const matrix: Record<string, Record<string, string>> = {
      Critical: { Critical: 'Critical', High: 'Critical', Medium: 'High', Low: 'High' },
      High: { Critical: 'Critical', High: 'High', Medium: 'High', Low: 'Medium' },
      Medium: { Critical: 'High', High: 'High', Medium: 'Medium', Low: 'Low' },
      Low: { Critical: 'High', High: 'Medium', Medium: 'Low', Low: 'Low' },
    };
    return matrix[impact]?.[urgency] || 'Medium';
  };

  // Handlers
  const handleCreateTicket = async () => {
    try {
      const priority = getPriorityFromMatrix(ticketForm.impact, ticketForm.urgency);
      await createTicket.mutateAsync({ ...ticketForm, priority } as any);
      setTicketDialog(false);
      setTicketForm({ title: '', description: '', category: 'Hardware', priority: 'Medium', department: '', impact: 'Medium', urgency: 'Medium', source: 'portal' });
      toast({ title: t('Success', 'نجاح'), description: t('Ticket created', 'تم إنشاء التذكرة') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleAddComment = async () => {
    if (!ticketDetailId || !commentText.trim()) return;
    try {
      await addComment.mutateAsync({ ticket_id: ticketDetailId, comment: commentText });
      setCommentText('');
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveKB = async () => {
    try {
      const payload = { ...kbForm, tags: kbForm.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editingKb) await updateKBArticle.mutateAsync({ id: editingKb.id, ...payload } as any);
      else await createKBArticle.mutateAsync(payload as any);
      setKbDialog(false); setEditingKb(null); setKbForm({ title: '', content: '', category: 'General', tags: '' });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveCatalog = async () => {
    try {
      if (editingCatalog) await updateServiceItem.mutateAsync({ id: editingCatalog.id, ...catalogForm } as any);
      else await createServiceItem.mutateAsync(catalogForm as any);
      setCatalogDialog(false); setEditingCatalog(null); setCatalogForm({ name: '', name_ar: '', description: '', category: 'General', estimated_time: '', requires_approval: false });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveChange = async () => {
    try {
      if (editingChange) await updateChange.mutateAsync({ id: editingChange.id, ...changeForm } as any);
      else await createChange.mutateAsync({ ...changeForm, status: 'Draft' } as any);
      setChangeDialog(false); setEditingChange(null);
      setChangeForm({ title: '', description: '', change_type: 'Standard', risk_level: 'Low', impact: 'Low', urgency: 'Low', priority: 'Medium', category: 'General', rollback_plan: '', test_plan: '', cab_required: false, planned_start: '', planned_end: '' });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveProblem = async () => {
    try {
      if (editingProblem) await updateProblem.mutateAsync({ id: editingProblem.id, ...problemForm } as any);
      else await createProblem.mutateAsync({ ...problemForm, status: 'Open' } as any);
      setProblemDialog(false); setEditingProblem(null);
      setProblemForm({ title: '', description: '', category: 'General', priority: 'Medium', impact: 'Low', root_cause: '', workaround: '' });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveCI = async () => {
    try {
      if (editingCI) await updateCI.mutateAsync({ id: editingCI.id, ...cmdbForm } as any);
      else await createCI.mutateAsync(cmdbForm as any);
      setCmdbDialog(false); setEditingCI(null);
      setCmdbForm({ name: '', ci_type: 'Server', ci_class: 'Hardware', status: 'Active', environment: 'Production', owner_name: '', department: '', location: '', ip_address: '', os: '', manufacturer: '', model: '', serial_number: '', criticality: 'Medium', notes: '' });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  const handleSaveSLA = async () => {
    try {
      if (editingSLA) await updateSLA.mutateAsync({ id: editingSLA.id, ...slaForm } as any);
      else await createSLA.mutateAsync(slaForm as any);
      setSlaDialog(false); setEditingSLA(null);
      setSlaForm({ name: '', priority: 'Medium', response_time_hours: 4, resolution_time_hours: 24, escalation_after_hours: 8, escalation_to: '', business_hours_only: true });
      toast({ title: t('Success', 'نجاح') });
    } catch (e: any) { toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('IT Service Management', 'إدارة خدمات تقنية المعلومات')}</h1>
          <p className="text-sm text-muted-foreground">{t('ITIL 4 Aligned — Incidents, Changes, Problems, CMDB & SLA', 'متوافق مع ITIL 4 — الحوادث والتغييرات والمشاكل و CMDB و SLA')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('itsm'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <Button onClick={() => setTicketDialog(true)} className="gap-2"><Plus className="h-4 w-4" />{t('New Ticket', 'تذكرة جديدة')}</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { icon: Ticket, label: t('Total', 'الإجمالي'), value: stats.total, color: 'text-foreground' },
          { icon: AlertCircle, label: t('Open', 'مفتوحة'), value: stats.open, color: 'text-blue-600' },
          { icon: Clock, label: t('In Progress', 'قيد المعالجة'), value: stats.inProgress, color: 'text-amber-600' },
          { icon: CheckCircle2, label: t('Resolved', 'محلولة'), value: stats.resolved, color: 'text-emerald-600' },
          { icon: Timer, label: t('SLA %', 'SLA %'), value: `${stats.slaCompliance}%`, color: stats.slaCompliance >= 95 ? 'text-emerald-600' : 'text-red-600' },
          { icon: GitBranch, label: t('Changes', 'التغييرات'), value: stats.openChanges, color: 'text-purple-600' },
          { icon: Bug, label: t('Problems', 'المشاكل'), value: stats.openProblems, color: 'text-orange-600' },
          { icon: Database, label: t('CIs', 'عناصر'), value: stats.totalCIs, color: 'text-cyan-600' },
        ].map((s, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" />{t('Dashboard', 'لوحة')}</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs"><Ticket className="h-3 w-3 mr-1" />{t('Incidents', 'الحوادث')}</TabsTrigger>
          <TabsTrigger value="changes" className="text-xs"><GitBranch className="h-3 w-3 mr-1" />{t('Changes', 'التغييرات')}</TabsTrigger>
          <TabsTrigger value="problems" className="text-xs"><Bug className="h-3 w-3 mr-1" />{t('Problems', 'المشاكل')}</TabsTrigger>
          <TabsTrigger value="cmdb" className="text-xs"><Database className="h-3 w-3 mr-1" />{t('CMDB', 'قاعدة التكوين')}</TabsTrigger>
          <TabsTrigger value="knowledge-base" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{t('Knowledge Base', 'قاعدة المعرفة')}</TabsTrigger>
          <TabsTrigger value="service-catalog" className="text-xs"><ShoppingBag className="h-3 w-3 mr-1" />{t('Catalog', 'الكتالوج')}</TabsTrigger>
          <TabsTrigger value="sla" className="text-xs"><Settings className="h-3 w-3 mr-1" />{t('SLA Config', 'إعدادات SLA')}</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SLA Compliance */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Timer className="h-4 w-4" />{t('SLA Compliance', 'التزام SLA')}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${stats.slaCompliance >= 95 ? 'text-emerald-600' : stats.slaCompliance >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{stats.slaCompliance}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('Target: 95%', 'الهدف: 95%')}</p>
                  <Progress value={stats.slaCompliance} className="mt-3 h-2" />
                  {stats.slaBreached > 0 && <p className="text-xs text-destructive mt-2">{stats.slaBreached} {t('breached', 'مخالفة')}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Tickets by Status */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Tickets by Status', 'التذاكر حسب الحالة')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map(status => {
                  const count = tickets.filter(t => t.status === status).length;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <Badge className={statusColors[status]}>{status}</Badge>
                        <span className="font-bold">{count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Priority', 'الأولوية')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {['Critical', 'High', 'Medium', 'Low'].map(p => {
                  const count = tickets.filter(t => t.priority === p).length;
                  return (
                    <div key={p} className="flex items-center justify-between text-sm">
                      <Badge className={priorityColors[p]}>{p}</Badge>
                      <span className="font-bold">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* ITSM Process Health */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Process Health', 'صحة العمليات')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{t('MTTR', 'وقت الحل')}</span>
                  <span className="font-bold">{stats.avgResTime}h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><GitBranch className="h-3 w-3 text-muted-foreground" />{t('Open Changes', 'تغييرات مفتوحة')}</span>
                  <span className="font-bold">{stats.openChanges}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Bug className="h-3 w-3 text-muted-foreground" />{t('Open Problems', 'مشاكل مفتوحة')}</span>
                  <span className="font-bold">{stats.openProblems}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1"><Database className="h-3 w-3 text-muted-foreground" />{t('CMDB Items', 'عناصر')}</span>
                  <span className="font-bold">{stats.totalCIs}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent tickets */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('Recent Incidents', 'أحدث الحوادث')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tickets.slice(0, 5).map(tk => (
                  <div key={tk.id} className="flex items-center justify-between p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => { setTicketDetailId(tk.id); setActiveTab('tickets'); }}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{tk.ticket_number}</span>
                      <span className="text-sm font-medium">{tk.title}</span>
                      {tk.sla_resolution_breached && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[tk.priority]} variant="secondary">{tk.priority}</Badge>
                      <Badge className={statusColors[tk.status]} variant="secondary">{tk.status}</Badge>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">{t('No incidents yet', 'لا حوادث بعد')}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCIDENTS (TICKETS) */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('Search incidents...', 'بحث...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Status', 'كل الحالات')}</SelectItem>
                {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Priority', 'كل الأولويات')}</SelectItem>
                {['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t('ID', 'رقم')}</TableHead>
                  <TableHead>{t('Title', 'العنوان')}</TableHead>
                  <TableHead>{t('Category', 'الفئة')}</TableHead>
                  <TableHead>{t('Priority', 'الأولوية')}</TableHead>
                  <TableHead>{t('Status', 'الحالة')}</TableHead>
                  <TableHead>{t('Impact', 'التأثير')}</TableHead>
                  <TableHead>{t('Assigned', 'مخصص')}</TableHead>
                  <TableHead>{t('SLA', 'SLA')}</TableHead>
                  <TableHead>{t('Created', 'أُنشئ')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{t('No incidents found', 'لا حوادث')}</TableCell></TableRow>
                ) : filteredTickets.map(tk => (
                  <TableRow key={tk.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setTicketDetailId(tk.id)}>
                    <TableCell className="font-mono text-xs">{tk.ticket_number}</TableCell>
                    <TableCell className="font-medium">{tk.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{tk.category}</Badge></TableCell>
                    <TableCell><Badge className={priorityColors[tk.priority]}>{tk.priority}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[tk.status]}>{tk.status}</Badge></TableCell>
                    <TableCell className="text-xs">{tk.impact || '—'}</TableCell>
                    <TableCell className="text-xs">{tk.assigned_to_name || '—'}</TableCell>
                    <TableCell>
                      {tk.sla_resolution_breached ? (
                        <Badge variant="destructive" className="text-[10px]">Breached</Badge>
                      ) : tk.sla_resolution_due ? (
                        <Badge variant="outline" className="text-[10px]">On Track</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(tk.created_at), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); updateTicket.mutate({ id: tk.id, status: 'In Progress' }); }}>{t('Start Working', 'بدء')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); updateTicket.mutate({ id: tk.id, status: 'Resolved' }); }}>{t('Resolve', 'حل')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); updateTicket.mutate({ id: tk.id, status: 'Closed' }); }}>{t('Close', 'إغلاق')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); deleteTicket.mutate(tk.id); }} className="text-destructive">{t('Delete', 'حذف')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CHANGE MANAGEMENT */}
        <TabsContent value="changes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('Change Management', 'إدارة التغييرات')}</h3>
            <Button onClick={() => { setEditingChange(null); setChangeForm({ title: '', description: '', change_type: 'Standard', risk_level: 'Low', impact: 'Low', urgency: 'Low', priority: 'Medium', category: 'General', rollback_plan: '', test_plan: '', cab_required: false, planned_start: '', planned_end: '' }); setChangeDialog(true); }}><Plus className="h-4 w-4 mr-1" />{t('New Change', 'تغيير جديد')}</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Number', 'رقم')}</TableHead>
                  <TableHead>{t('Title', 'العنوان')}</TableHead>
                  <TableHead>{t('Type', 'النوع')}</TableHead>
                  <TableHead>{t('Risk', 'المخاطر')}</TableHead>
                  <TableHead>{t('Status', 'الحالة')}</TableHead>
                  <TableHead>{t('CAB', 'لجنة')}</TableHead>
                  <TableHead>{t('Planned', 'المخطط')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('No changes', 'لا تغييرات')}</TableCell></TableRow>
                ) : changes.map(ch => (
                  <TableRow key={ch.id}>
                    <TableCell className="font-mono text-xs">{ch.change_number}</TableCell>
                    <TableCell className="font-medium">{ch.title}</TableCell>
                    <TableCell><Badge variant="outline">{ch.change_type}</Badge></TableCell>
                    <TableCell><Badge className={priorityColors[ch.risk_level]}>{ch.risk_level}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[ch.status] || 'bg-muted text-muted-foreground'}>{ch.status}</Badge></TableCell>
                    <TableCell>{ch.cab_required ? <Badge variant={ch.cab_approval_status === 'approved' ? 'default' : 'secondary'}>{ch.cab_approval_status}</Badge> : <span className="text-xs text-muted-foreground">N/A</span>}</TableCell>
                    <TableCell className="text-xs">{ch.planned_start ? format(new Date(ch.planned_start), 'MMM dd') : '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingChange(ch); setChangeForm({ title: ch.title, description: ch.description || '', change_type: ch.change_type, risk_level: ch.risk_level, impact: ch.impact, urgency: ch.urgency, priority: ch.priority, category: ch.category, rollback_plan: ch.rollback_plan || '', test_plan: ch.test_plan || '', cab_required: ch.cab_required, planned_start: ch.planned_start || '', planned_end: ch.planned_end || '' }); setChangeDialog(true); }}><Edit className="h-3 w-3 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                          {CHANGE_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => updateChange.mutate({ id: ch.id, status: s } as any)}>{s}</DropdownMenuItem>)}
                          {ch.cab_required && <DropdownMenuItem onClick={() => updateChange.mutate({ id: ch.id, cab_approval_status: 'approved', cab_approved_at: new Date().toISOString() } as any)}><CheckCircle2 className="h-3 w-3 mr-2" />{t('CAB Approve', 'موافقة اللجنة')}</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => deleteChange.mutate(ch.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />{t('Delete', 'حذف')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* PROBLEM MANAGEMENT */}
        <TabsContent value="problems" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('Problem Management', 'إدارة المشاكل')}</h3>
            <Button onClick={() => { setEditingProblem(null); setProblemForm({ title: '', description: '', category: 'General', priority: 'Medium', impact: 'Low', root_cause: '', workaround: '' }); setProblemDialog(true); }}><Plus className="h-4 w-4 mr-1" />{t('New Problem', 'مشكلة جديدة')}</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Number', 'رقم')}</TableHead>
                  <TableHead>{t('Title', 'العنوان')}</TableHead>
                  <TableHead>{t('Priority', 'الأولوية')}</TableHead>
                  <TableHead>{t('Status', 'الحالة')}</TableHead>
                  <TableHead>{t('Known Error', 'خطأ معروف')}</TableHead>
                  <TableHead>{t('Root Cause', 'السبب الجذري')}</TableHead>
                  <TableHead>{t('Assigned', 'مخصص')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('No problems', 'لا مشاكل')}</TableCell></TableRow>
                ) : problems.map(pr => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-xs">{pr.problem_number}</TableCell>
                    <TableCell className="font-medium">{pr.title}</TableCell>
                    <TableCell><Badge className={priorityColors[pr.priority]}>{pr.priority}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[pr.status] || 'bg-muted text-muted-foreground'}>{pr.status}</Badge></TableCell>
                    <TableCell>{pr.known_error ? <Badge variant="destructive">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{pr.root_cause || '—'}</TableCell>
                    <TableCell className="text-xs">{pr.assigned_to_name || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingProblem(pr); setProblemForm({ title: pr.title, description: pr.description || '', category: pr.category, priority: pr.priority, impact: pr.impact || 'Low', root_cause: pr.root_cause || '', workaround: pr.workaround || '' }); setProblemDialog(true); }}><Edit className="h-3 w-3 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                          {PROBLEM_STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => updateProblem.mutate({ id: pr.id, status: s, known_error: s === 'Known Error' } as any)}>{s}</DropdownMenuItem>)}
                          <DropdownMenuItem onClick={() => deleteProblem.mutate(pr.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />{t('Delete', 'حذف')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* CMDB */}
        <TabsContent value="cmdb" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('Configuration Management Database', 'قاعدة بيانات إدارة التكوين')}</h3>
            <Button onClick={() => { setEditingCI(null); setCmdbForm({ name: '', ci_type: 'Server', ci_class: 'Hardware', status: 'Active', environment: 'Production', owner_name: '', department: '', location: '', ip_address: '', os: '', manufacturer: '', model: '', serial_number: '', criticality: 'Medium', notes: '' }); setCmdbDialog(true); }}><Plus className="h-4 w-4 mr-1" />{t('Add CI', 'إضافة عنصر')}</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { icon: Server, label: t('Servers', 'الخوادم'), count: cmdbItems.filter(c => c.ci_type === 'Server').length },
              { icon: Monitor, label: t('Workstations', 'محطات'), count: cmdbItems.filter(c => c.ci_type === 'Workstation').length },
              { icon: Wifi, label: t('Network', 'الشبكة'), count: cmdbItems.filter(c => c.ci_type === 'Network Device').length },
              { icon: Cpu, label: t('Applications', 'التطبيقات'), count: cmdbItems.filter(c => c.ci_type === 'Application').length },
              { icon: HardDrive, label: t('Storage', 'التخزين'), count: cmdbItems.filter(c => c.ci_type === 'Storage').length },
            ].map((item, i) => (
              <Card key={i} className="p-3 text-center">
                <item.icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{item.count}</p>
              </Card>
            ))}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('CI ID', 'معرف')}</TableHead>
                  <TableHead>{t('Name', 'الاسم')}</TableHead>
                  <TableHead>{t('Type', 'النوع')}</TableHead>
                  <TableHead>{t('Status', 'الحالة')}</TableHead>
                  <TableHead>{t('Environment', 'البيئة')}</TableHead>
                  <TableHead>{t('Criticality', 'الحرجية')}</TableHead>
                  <TableHead>{t('IP', 'IP')}</TableHead>
                  <TableHead>{t('Location', 'الموقع')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cmdbItems.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('No configuration items', 'لا عناصر')}</TableCell></TableRow>
                ) : cmdbItems.map(ci => (
                  <TableRow key={ci.id}>
                    <TableCell className="font-mono text-xs">{ci.ci_id}</TableCell>
                    <TableCell className="font-medium">{ci.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{ci.ci_type}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[ci.status] || 'bg-muted text-muted-foreground'}>{ci.status}</Badge></TableCell>
                    <TableCell className="text-xs">{ci.environment}</TableCell>
                    <TableCell><Badge className={priorityColors[ci.criticality]}>{ci.criticality}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{ci.ip_address || '—'}</TableCell>
                    <TableCell className="text-xs">{ci.location || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingCI(ci); setCmdbForm({ name: ci.name, ci_type: ci.ci_type, ci_class: ci.ci_class, status: ci.status, environment: ci.environment, owner_name: ci.owner_name || '', department: ci.department || '', location: ci.location || '', ip_address: ci.ip_address || '', os: ci.os || '', manufacturer: ci.manufacturer || '', model: ci.model || '', serial_number: ci.serial_number || '', criticality: ci.criticality, notes: ci.notes || '' }); setCmdbDialog(true); }}><Edit className="h-3 w-3 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteCI.mutate(ci.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />{t('Delete', 'حذف')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* KNOWLEDGE BASE */}
        <TabsContent value="knowledge-base" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('Search articles...', 'بحث في المقالات...')} className="pl-10" />
            </div>
            <Button onClick={() => { setEditingKb(null); setKbForm({ title: '', content: '', category: 'General', tags: '' }); setKbDialog(true); }}><Plus className="h-4 w-4 mr-2" />{t('New Article', 'مقال جديد')}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kbArticles.map(article => (
              <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setKbViewId(article.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{article.category}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" />{article.views}</div>
                  </div>
                  <CardTitle className="text-sm mt-2">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3">{article.content}</p>
                  {article.tags?.length > 0 && <div className="flex gap-1 mt-2 flex-wrap">{article.tags.slice(0, 3).map((tag, i) => <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>}
                </CardContent>
              </Card>
            ))}
            {kbArticles.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />{t('No articles yet', 'لا مقالات بعد')}</div>}
          </div>
        </TabsContent>

        {/* SERVICE CATALOG */}
        <TabsContent value="service-catalog" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCatalog(null); setCatalogForm({ name: '', name_ar: '', description: '', category: 'General', estimated_time: '', requires_approval: false }); setCatalogDialog(true); }}><Plus className="h-4 w-4 mr-2" />{t('Add Service', 'إضافة خدمة')}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.filter(s => s.is_active).map(service => (
              <Card key={service.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{service.category}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCatalog(service); setCatalogForm({ name: service.name, name_ar: service.name_ar || '', description: service.description || '', category: service.category, estimated_time: service.estimated_time || '', requires_approval: service.requires_approval }); setCatalogDialog(true); }}><Edit className="h-3 w-3 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteServiceItem.mutate(service.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />{t('Delete', 'حذف')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-sm mt-1">{language === 'ar' && service.name_ar ? service.name_ar : service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {service.description && <p className="text-xs text-muted-foreground mb-2">{service.description}</p>}
                  <div className="flex items-center gap-3 text-xs">
                    {service.estimated_time && <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{service.estimated_time}</div>}
                    {service.requires_approval && <Badge variant="outline" className="text-[10px]">{t('Approval Required', 'موافقة مطلوبة')}</Badge>}
                  </div>
                  <Button size="sm" className="w-full mt-3 gap-2" onClick={() => { setTicketForm({ title: `Request: ${service.name}`, description: service.description || '', category: service.category, priority: 'Medium', department: '', impact: 'Medium', urgency: 'Medium', source: 'catalog' }); setTicketDialog(true); }}><Send className="h-3 w-3" />{t('Request Service', 'طلب الخدمة')}</Button>
                </CardContent>
              </Card>
            ))}
            {catalog.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground"><ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />{t('No services configured', 'لا خدمات مضافة')}</div>}
          </div>
        </TabsContent>

        {/* SLA CONFIGURATION */}
        <TabsContent value="sla" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('SLA Configuration', 'إعدادات اتفاقية مستوى الخدمة')}</h3>
            <Button onClick={() => { setEditingSLA(null); setSlaForm({ name: '', priority: 'Medium', response_time_hours: 4, resolution_time_hours: 24, escalation_after_hours: 8, escalation_to: '', business_hours_only: true }); setSlaDialog(true); }}><Plus className="h-4 w-4 mr-1" />{t('New SLA', 'SLA جديد')}</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name', 'الاسم')}</TableHead>
                  <TableHead>{t('Priority', 'الأولوية')}</TableHead>
                  <TableHead>{t('Response Time', 'وقت الاستجابة')}</TableHead>
                  <TableHead>{t('Resolution Time', 'وقت الحل')}</TableHead>
                  <TableHead>{t('Escalation', 'التصعيد')}</TableHead>
                  <TableHead>{t('Business Hours', 'ساعات العمل')}</TableHead>
                  <TableHead>{t('Active', 'نشط')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaConfigs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('No SLA configs', 'لا إعدادات')}</TableCell></TableRow>
                ) : slaConfigs.map(sla => (
                  <TableRow key={sla.id}>
                    <TableCell className="font-medium">{sla.name}</TableCell>
                    <TableCell><Badge className={priorityColors[sla.priority]}>{sla.priority}</Badge></TableCell>
                    <TableCell>{sla.response_time_hours}h</TableCell>
                    <TableCell>{sla.resolution_time_hours}h</TableCell>
                    <TableCell>{sla.escalation_after_hours ? `${sla.escalation_after_hours}h → ${sla.escalation_to || 'Auto'}` : '—'}</TableCell>
                    <TableCell>{sla.business_hours_only ? '✓' : '✗'}</TableCell>
                    <TableCell>{sla.is_active ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingSLA(sla); setSlaForm({ name: sla.name, priority: sla.priority, response_time_hours: sla.response_time_hours, resolution_time_hours: sla.resolution_time_hours, escalation_after_hours: sla.escalation_after_hours || 8, escalation_to: sla.escalation_to || '', business_hours_only: sla.business_hours_only }); setSlaDialog(true); }}><Edit className="h-3 w-3 mr-2" />{t('Edit', 'تعديل')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteSLA.mutate(sla.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />{t('Delete', 'حذف')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      {/* New Ticket Dialog */}
      <Dialog open={ticketDialog} onOpenChange={setTicketDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{t('Create New Incident', 'إنشاء حادثة جديدة')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Title', 'العنوان')} *</Label><Input value={ticketForm.title} onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })} /></div>
            <div><Label>{t('Description', 'التفاصيل')}</Label><Textarea value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Category', 'الفئة')}</Label>
                <Select value={ticketForm.category} onValueChange={v => setTicketForm({ ...ticketForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>{t('Source', 'المصدر')}</Label>
                <Select value={ticketForm.source} onValueChange={v => setTicketForm({ ...ticketForm, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['portal', 'phone', 'email', 'chat', 'walk-in', 'monitoring'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Impact', 'التأثير')}</Label>
                <Select value={ticketForm.impact} onValueChange={v => setTicketForm({ ...ticketForm, impact: v, priority: getPriorityFromMatrix(v, ticketForm.urgency) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>{t('Urgency', 'الإلحاح')}</Label>
                <Select value={ticketForm.urgency} onValueChange={v => setTicketForm({ ...ticketForm, urgency: v, priority: getPriorityFromMatrix(ticketForm.impact, v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="p-2 bg-muted rounded text-sm">{t('Calculated Priority:', 'الأولوية المحسوبة:')} <Badge className={priorityColors[getPriorityFromMatrix(ticketForm.impact, ticketForm.urgency)]}>{getPriorityFromMatrix(ticketForm.impact, ticketForm.urgency)}</Badge></div>
            <div><Label>{t('Department', 'القسم')}</Label><Input value={ticketForm.department} onChange={e => setTicketForm({ ...ticketForm, department: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleCreateTicket} disabled={!ticketForm.title || !ticketForm.category}>{t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!ticketDetailId} onOpenChange={() => setTicketDetailId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                  {selectedTicket.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityColors[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                  <Badge className={statusColors[selectedTicket.status]}>{selectedTicket.status}</Badge>
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                  {selectedTicket.impact && <Badge variant="secondary">Impact: {selectedTicket.impact}</Badge>}
                  {selectedTicket.urgency && <Badge variant="secondary">Urgency: {selectedTicket.urgency}</Badge>}
                  {selectedTicket.sla_resolution_breached && <Badge variant="destructive">SLA Breached</Badge>}
                  {selectedTicket.source && <Badge variant="outline">{selectedTicket.source}</Badge>}
                </div>
                {selectedTicket.description && <p className="text-sm">{selectedTicket.description}</p>}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 border rounded"><span className="text-xs text-muted-foreground block">{t('Requester', 'الطالب')}</span><span className="font-medium">{selectedTicket.requester_name || '—'}</span></div>
                  <div className="p-2 border rounded"><span className="text-xs text-muted-foreground block">{t('Assigned To', 'مخصص لـ')}</span><span className="font-medium">{selectedTicket.assigned_to_name || '—'}</span></div>
                  <div className="p-2 border rounded"><span className="text-xs text-muted-foreground block">{t('Created', 'أُنشئت')}</span><span className="font-medium">{format(new Date(selectedTicket.created_at), 'MMM dd, yyyy HH:mm')}</span></div>
                  <div className="p-2 border rounded"><span className="text-xs text-muted-foreground block">{t('Escalation Level', 'مستوى التصعيد')}</span><span className="font-medium">{selectedTicket.escalation_level || 0}</span></div>
                </div>
                {selectedTicket.resolution && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-sm"><strong>{t('Resolution:', 'الحل:')}</strong> {selectedTicket.resolution}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Input placeholder={t('Assign to...', 'تعيين إلى...')} className="flex-1" onKeyDown={e => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { updateTicket.mutate({ id: selectedTicket.id, assigned_to_name: val }); (e.target as HTMLInputElement).value = ''; } } }} />
                  {selectedTicket.status === 'Open' && <Button size="sm" onClick={() => updateTicket.mutate({ id: selectedTicket.id, status: 'In Progress' })}>{t('Start', 'بدء')}</Button>}
                  {selectedTicket.status === 'In Progress' && <Button size="sm" onClick={() => updateTicket.mutate({ id: selectedTicket.id, status: 'Resolved' })}>{t('Resolve', 'حل')}</Button>}
                  {selectedTicket.status !== 'Closed' && <Button size="sm" variant="outline" onClick={() => updateTicket.mutate({ id: selectedTicket.id, status: 'Closed' })}>{t('Close', 'إغلاق')}</Button>}
                  {selectedTicket.status !== 'Closed' && <Button size="sm" variant="secondary" onClick={() => updateTicket.mutate({ id: selectedTicket.id, escalation_level: (selectedTicket.escalation_level || 0) + 1, escalated_at: new Date().toISOString() })}><AlertTriangle className="h-3 w-3 mr-1" />{t('Escalate', 'تصعيد')}</Button>}
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">{t('Comments', 'التعليقات')}</h4>
                  <div className="flex gap-2">
                    <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={t('Add a comment...', 'إضافة تعليق...')} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                    <Button onClick={handleAddComment} size="sm"><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* KB Article View */}
      <Dialog open={!!kbViewId} onOpenChange={() => setKbViewId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{viewedArticle.category}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingKb(viewedArticle); setKbForm({ title: viewedArticle.title, content: viewedArticle.content, category: viewedArticle.category, tags: viewedArticle.tags?.join(', ') || '' }); setKbViewId(null); setKbDialog(true); }}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { deleteKBArticle.mutate(viewedArticle.id); setKbViewId(null); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <DialogTitle>{viewedArticle.title}</DialogTitle>
              </DialogHeader>
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">{viewedArticle.content}</div>
              {viewedArticle.tags?.length > 0 && <div className="flex gap-1 mt-4 flex-wrap">{viewedArticle.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}</div>}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* KB Form */}
      <Dialog open={kbDialog} onOpenChange={setKbDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingKb ? t('Edit Article', 'تعديل المقال') : t('New Article', 'مقال جديد')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Title', 'العنوان')} *</Label><Input value={kbForm.title} onChange={e => setKbForm({ ...kbForm, title: e.target.value })} /></div>
            <div><Label>{t('Category', 'الفئة')}</Label><Select value={kbForm.category} onValueChange={v => setKbForm({ ...kbForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('Content', 'المحتوى')} *</Label><Textarea value={kbForm.content} onChange={e => setKbForm({ ...kbForm, content: e.target.value })} rows={8} /></div>
            <div><Label>{t('Tags (comma-separated)', 'الوسوم')}</Label><Input value={kbForm.tags} onChange={e => setKbForm({ ...kbForm, tags: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKbDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveKB} disabled={!kbForm.title || !kbForm.content}>{editingKb ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Form */}
      <Dialog open={catalogDialog} onOpenChange={setCatalogDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCatalog ? t('Edit Service', 'تعديل الخدمة') : t('Add Service', 'إضافة خدمة')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Name (EN)', 'الاسم (EN)')} *</Label><Input value={catalogForm.name} onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })} /></div>
            <div><Label>{t('Name (AR)', 'الاسم (AR)')}</Label><Input value={catalogForm.name_ar} onChange={e => setCatalogForm({ ...catalogForm, name_ar: e.target.value })} dir="rtl" /></div>
            <div><Label>{t('Description', 'الوصف')}</Label><Textarea value={catalogForm.description} onChange={e => setCatalogForm({ ...catalogForm, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Category', 'الفئة')}</Label><Select value={catalogForm.category} onValueChange={v => setCatalogForm({ ...catalogForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATALOG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Est. Time', 'الوقت')}</Label><Input value={catalogForm.estimated_time} onChange={e => setCatalogForm({ ...catalogForm, estimated_time: e.target.value })} placeholder="e.g. 2 hours" /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={catalogForm.requires_approval} onCheckedChange={v => setCatalogForm({ ...catalogForm, requires_approval: v })} /><Label>{t('Requires Approval', 'يتطلب موافقة')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveCatalog} disabled={!catalogForm.name}>{editingCatalog ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Management Form */}
      <Dialog open={changeDialog} onOpenChange={setChangeDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingChange ? t('Edit Change', 'تعديل التغيير') : t('New Change Request', 'طلب تغيير جديد')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Title', 'العنوان')} *</Label><Input value={changeForm.title} onChange={e => setChangeForm({ ...changeForm, title: e.target.value })} /></div>
            <div><Label>{t('Description', 'الوصف')}</Label><Textarea value={changeForm.description} onChange={e => setChangeForm({ ...changeForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('Type', 'النوع')}</Label><Select value={changeForm.change_type} onValueChange={v => setChangeForm({ ...changeForm, change_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHANGE_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Risk Level', 'المخاطر')}</Label><Select value={changeForm.risk_level} onValueChange={v => setChangeForm({ ...changeForm, risk_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Category', 'الفئة')}</Label><Select value={changeForm.category} onValueChange={v => setChangeForm({ ...changeForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Impact', 'التأثير')}</Label><Select value={changeForm.impact} onValueChange={v => setChangeForm({ ...changeForm, impact: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Urgency', 'الإلحاح')}</Label><Select value={changeForm.urgency} onValueChange={v => setChangeForm({ ...changeForm, urgency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Planned Start', 'البداية المخططة')}</Label><Input type="datetime-local" value={changeForm.planned_start} onChange={e => setChangeForm({ ...changeForm, planned_start: e.target.value })} /></div>
              <div><Label>{t('Planned End', 'النهاية المخططة')}</Label><Input type="datetime-local" value={changeForm.planned_end} onChange={e => setChangeForm({ ...changeForm, planned_end: e.target.value })} /></div>
            </div>
            <div><Label>{t('Rollback Plan', 'خطة التراجع')}</Label><Textarea value={changeForm.rollback_plan} onChange={e => setChangeForm({ ...changeForm, rollback_plan: e.target.value })} rows={2} /></div>
            <div><Label>{t('Test Plan', 'خطة الاختبار')}</Label><Textarea value={changeForm.test_plan} onChange={e => setChangeForm({ ...changeForm, test_plan: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={changeForm.cab_required} onCheckedChange={v => setChangeForm({ ...changeForm, cab_required: v })} /><Label>{t('CAB Approval Required', 'يتطلب موافقة لجنة التغيير')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveChange} disabled={!changeForm.title}>{editingChange ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Problem Management Form */}
      <Dialog open={problemDialog} onOpenChange={setProblemDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingProblem ? t('Edit Problem', 'تعديل المشكلة') : t('New Problem', 'مشكلة جديدة')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Title', 'العنوان')} *</Label><Input value={problemForm.title} onChange={e => setProblemForm({ ...problemForm, title: e.target.value })} /></div>
            <div><Label>{t('Description', 'الوصف')}</Label><Textarea value={problemForm.description} onChange={e => setProblemForm({ ...problemForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('Category', 'الفئة')}</Label><Select value={problemForm.category} onValueChange={v => setProblemForm({ ...problemForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Priority', 'الأولوية')}</Label><Select value={problemForm.priority} onValueChange={v => setProblemForm({ ...problemForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Impact', 'التأثير')}</Label><Select value={problemForm.impact} onValueChange={v => setProblemForm({ ...problemForm, impact: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>{t('Root Cause', 'السبب الجذري')}</Label><Textarea value={problemForm.root_cause} onChange={e => setProblemForm({ ...problemForm, root_cause: e.target.value })} rows={2} /></div>
            <div><Label>{t('Workaround', 'حل مؤقت')}</Label><Textarea value={problemForm.workaround} onChange={e => setProblemForm({ ...problemForm, workaround: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProblemDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveProblem} disabled={!problemForm.title}>{editingProblem ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CMDB Form */}
      <Dialog open={cmdbDialog} onOpenChange={setCmdbDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCI ? t('Edit CI', 'تعديل العنصر') : t('Add Configuration Item', 'إضافة عنصر تكوين')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Name', 'الاسم')} *</Label><Input value={cmdbForm.name} onChange={e => setCmdbForm({ ...cmdbForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('Type', 'النوع')}</Label><Select value={cmdbForm.ci_type} onValueChange={v => setCmdbForm({ ...cmdbForm, ci_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CI_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Class', 'الفئة')}</Label><Select value={cmdbForm.ci_class} onValueChange={v => setCmdbForm({ ...cmdbForm, ci_class: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CI_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Environment', 'البيئة')}</Label><Select value={cmdbForm.environment} onValueChange={v => setCmdbForm({ ...cmdbForm, environment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENVIRONMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Criticality', 'الحرجية')}</Label><Select value={cmdbForm.criticality} onValueChange={v => setCmdbForm({ ...cmdbForm, criticality: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('Status', 'الحالة')}</Label><Select value={cmdbForm.status} onValueChange={v => setCmdbForm({ ...cmdbForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Active', 'Inactive', 'Under Maintenance', 'Retired', 'Planned'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('IP Address', 'عنوان IP')}</Label><Input value={cmdbForm.ip_address} onChange={e => setCmdbForm({ ...cmdbForm, ip_address: e.target.value })} /></div>
              <div><Label>{t('OS', 'النظام')}</Label><Input value={cmdbForm.os} onChange={e => setCmdbForm({ ...cmdbForm, os: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Manufacturer', 'الشركة المصنعة')}</Label><Input value={cmdbForm.manufacturer} onChange={e => setCmdbForm({ ...cmdbForm, manufacturer: e.target.value })} /></div>
              <div><Label>{t('Model', 'الموديل')}</Label><Input value={cmdbForm.model} onChange={e => setCmdbForm({ ...cmdbForm, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Serial Number', 'الرقم التسلسلي')}</Label><Input value={cmdbForm.serial_number} onChange={e => setCmdbForm({ ...cmdbForm, serial_number: e.target.value })} /></div>
              <div><Label>{t('Location', 'الموقع')}</Label><Input value={cmdbForm.location} onChange={e => setCmdbForm({ ...cmdbForm, location: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Owner', 'المالك')}</Label><Input value={cmdbForm.owner_name} onChange={e => setCmdbForm({ ...cmdbForm, owner_name: e.target.value })} /></div>
              <div><Label>{t('Department', 'القسم')}</Label><Input value={cmdbForm.department} onChange={e => setCmdbForm({ ...cmdbForm, department: e.target.value })} /></div>
            </div>
            <div><Label>{t('Notes', 'ملاحظات')}</Label><Textarea value={cmdbForm.notes} onChange={e => setCmdbForm({ ...cmdbForm, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCmdbDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveCI} disabled={!cmdbForm.name}>{editingCI ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLA Config Form */}
      <Dialog open={slaDialog} onOpenChange={setSlaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSLA ? t('Edit SLA', 'تعديل SLA') : t('New SLA Configuration', 'إعداد SLA جديد')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('Name', 'الاسم')} *</Label><Input value={slaForm.name} onChange={e => setSlaForm({ ...slaForm, name: e.target.value })} placeholder="e.g. Critical SLA" /></div>
            <div><Label>{t('Priority', 'الأولوية')}</Label><Select value={slaForm.priority} onValueChange={v => setSlaForm({ ...slaForm, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Response Time (hours)', 'وقت الاستجابة (ساعات)')}</Label><Input type="number" value={slaForm.response_time_hours} onChange={e => setSlaForm({ ...slaForm, response_time_hours: Number(e.target.value) })} /></div>
              <div><Label>{t('Resolution Time (hours)', 'وقت الحل (ساعات)')}</Label><Input type="number" value={slaForm.resolution_time_hours} onChange={e => setSlaForm({ ...slaForm, resolution_time_hours: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('Escalation After (hours)', 'تصعيد بعد (ساعات)')}</Label><Input type="number" value={slaForm.escalation_after_hours} onChange={e => setSlaForm({ ...slaForm, escalation_after_hours: Number(e.target.value) })} /></div>
              <div><Label>{t('Escalate To', 'تصعيد إلى')}</Label><Input value={slaForm.escalation_to} onChange={e => setSlaForm({ ...slaForm, escalation_to: e.target.value })} placeholder="e.g. IT Manager" /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={slaForm.business_hours_only} onCheckedChange={v => setSlaForm({ ...slaForm, business_hours_only: v })} /><Label>{t('Business Hours Only', 'ساعات العمل فقط')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlaDialog(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSaveSLA} disabled={!slaForm.name}>{editingSLA ? t('Update', 'تحديث') : t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
