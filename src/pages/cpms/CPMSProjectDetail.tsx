import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCPMS, WBSNode } from '@/hooks/useCPMS';
import { useCPMSChangeOrders } from '@/hooks/useCPMSChangeOrders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ProjectBillingTab from '@/components/cpms/ProjectBillingTab';
import ProjectPhasesTab from '@/components/cpms/ProjectPhasesTab';
import ProjectCostCodeBudgetTab from '@/components/cpms/ProjectCostCodeBudgetTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { importFromExcel } from '@/utils/exportImportUtils';
import type { ColumnDef } from '@/utils/exportImportUtils';
import {
  ArrowLeft, Layers, DollarSign, FileText, Users, Plus, Pencil, Trash2,
  ClipboardList, Building2, Calendar, RefreshCw, CheckSquare, Target,
  Clock, CheckCircle2, AlertTriangle, Receipt, ShieldAlert, ArrowRightLeft,
  Send, XCircle, TrendingUp, Upload, Download, Paperclip, FileSpreadsheet, GitBranch,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const milestoneStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
};

const taskPriorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const taskStatusColors: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export default function CPMSProjectDetail() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchWBS, createWBSNode, deleteWBSNode, fetchTable } = useCPMS();
  const changeOrderHook = useCPMSChangeOrders(projectId);

  const [project, setProject] = useState<any>(null);
  const [wbsNodes, setWbsNodes] = useState<WBSNode[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showWBSForm, setShowWBSForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showBOQForm, setShowBOQForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const boqFileRef = useRef<HTMLInputElement>(null);

  const [wbsForm, setWbsForm] = useState<Partial<WBSNode>>({ code: '', name: '', level: 1, type: 'package' });
  const [milestoneForm, setMilestoneForm] = useState<any>({ name: '', description: '', status: 'pending', planned_start: '', planned_end: '', sequence_order: 0 });
  const [taskForm, setTaskForm] = useState<any>({ title: '', description: '', priority: 'medium', status: 'todo', milestone_id: '', due_date: '', estimated_hours: 0 });
  const [boqForm, setBoqForm] = useState<any>({ category: '', item_code: '', description: '', unit: '', quantity: 0, unit_price: 0 });
  const [docForm, setDocForm] = useState<any>({ name: '', description: '', category: 'other', status: 'draft', file_path: '' });
  const [teamForm, setTeamForm] = useState<any>({ user_name: '', role: 'member', allocation_pct: 100, is_active: true });

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    const [projRes, wbs, cont, team] = await Promise.all([
      supabase.from('cpms_projects').select('*').eq('id', projectId).single(),
      fetchWBS(projectId),
      fetchTable('cpms_contracts', { project_id: projectId }),
      fetchTable('cpms_project_teams', { project_id: projectId }),
    ]);
    const [ms, ts, boq, docs] = await Promise.all([
      supabase.from('cpms_milestones' as any).select('*').eq('project_id', projectId).order('sequence_order'),
      supabase.from('cpms_tasks' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('cpms_boq_items' as any).select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('cpms_document_files' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    let invQuery = supabase.from('ar_invoices').select('*') as any;
    invQuery = invQuery.eq('cpms_project_id', projectId).order('doc_date', { ascending: false });
    const [invRes, expRes] = await Promise.all([
      invQuery,
      supabase.from('cpms_expenses' as any).select('*').eq('project_id', projectId).order('expense_date', { ascending: false }),
    ]);
    setProject(projRes.data);
    setWbsNodes(wbs);
    setContracts(cont);
    setTeams(team);
    setMilestones((ms.data || []) as any);
    setTasks((ts.data || []) as any);
    setBoqItems((boq.data || []) as any);
    setDocuments((docs.data || []) as any);
    setInvoices((invRes.data || []) as any);
    setExpenses((expRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [projectId]);

  // Handlers
  const handleAddWBS = async () => {
    if (!wbsForm.code || !wbsForm.name || !projectId) return;
    await createWBSNode({ ...wbsForm, project_id: projectId });
    setShowWBSForm(false);
    setWbsForm({ code: '', name: '', level: 1, type: 'package' });
    setWbsNodes(await fetchWBS(projectId));
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.name || !projectId) return;
    const { error } = await supabase.from('cpms_milestones' as any).insert({ ...milestoneForm, project_id: projectId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Milestone added' });
    setShowMilestoneForm(false);
    loadData();
  };

  const handleAddTask = async () => {
    if (!taskForm.title || !projectId) return;
    const { error } = await supabase.from('cpms_tasks' as any).insert({
      ...taskForm, project_id: projectId, created_by: user?.id,
      milestone_id: taskForm.milestone_id || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Task added' });
    setShowTaskForm(false);
    loadData();
  };

  const handleAddBOQ = async () => {
    if (!boqForm.description || !projectId) return;
    const { error } = await supabase.from('cpms_boq_items' as any).insert({ ...boqForm, project_id: projectId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'BOQ item added' });
    setShowBOQForm(false);
    loadData();
  };

  const handleBOQExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    try {
      const rows = await importFromExcel(file);
      const items = rows.map((r: any, i: number) => ({
        project_id: projectId,
        item_code: r['Item Code'] || r['item_code'] || r['Code'] || '',
        description: r['Description'] || r['description'] || r['Item Description'] || '',
        category: r['Category'] || r['category'] || '',
        unit: r['Unit'] || r['unit'] || '',
        quantity: parseFloat(r['Quantity'] || r['quantity'] || r['Qty'] || 0),
        unit_price: parseFloat(r['Unit Price'] || r['unit_price'] || r['Rate'] || r['Price'] || 0),
        sort_order: i + 1,
      }));
      const valid = items.filter((it: any) => it.description);
      if (valid.length === 0) { toast({ title: 'No valid rows found', variant: 'destructive' }); return; }
      const { error } = await supabase.from('cpms_boq_items' as any).insert(valid);
      if (error) throw error;
      toast({ title: `${valid.length} BOQ items imported` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Import error', description: err.message, variant: 'destructive' });
    } finally {
      if (boqFileRef.current) boqFileRef.current.value = '';
    }
  };

  const handleBOQBulkImport = async (rows: any[]) => {
    if (!projectId) return;
    const items = rows.map((r: any, i: number) => ({
      project_id: projectId,
      item_code: r['Item Code'] || r['Code'] || '',
      description: r['Description'] || r['Item Description'] || '',
      category: r['Category'] || '',
      unit: r['Unit'] || '',
      quantity: parseFloat(r['Quantity'] || r['Qty'] || 0),
      unit_price: parseFloat(r['Unit Price'] || r['Rate'] || r['Price'] || 0),
      sort_order: i + 1,
    }));
    const valid = items.filter((it: any) => it.description);
    if (valid.length === 0) throw new Error('No valid rows found');
    const { error } = await supabase.from('cpms_boq_items' as any).insert(valid);
    if (error) throw error;
    loadData();
  };

  const handleAddTeam = async () => {
    if (!teamForm.user_name || !projectId) return;
    const { error } = await supabase.from('cpms_project_teams' as any).insert({ ...teamForm, project_id: projectId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Team member added' });
    setShowTeamForm(false);
    loadData();
  };

  const handleTeamImport = async (rows: any[]) => {
    if (!projectId) return;
    const items = rows.map((r: any) => ({
      project_id: projectId,
      user_name: r['Name'] || r['user_name'] || r['Member'] || '',
      role: r['Role'] || r['role'] || 'member',
      allocation_pct: parseFloat(r['Allocation %'] || r['allocation_pct'] || 100),
      is_active: true,
    }));
    const valid = items.filter((it: any) => it.user_name);
    if (valid.length === 0) throw new Error('No valid rows found');
    const { error } = await supabase.from('cpms_project_teams' as any).insert(valid);
    if (error) throw error;
    loadData();
  };

  const [docUploading, setDocUploading] = useState(false);

  const handleDocFileUpload = async (file: File): Promise<{ url: string; size: number; type: string } | null> => {
    if (!projectId) return null;
    const ext = file.name.split('.').pop();
    const path = `${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('cpms-documents').upload(path, file);
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); return null; }
    const { data: urlData } = supabase.storage.from('cpms-documents').getPublicUrl(path);
    return { url: urlData.publicUrl, size: file.size, type: ext || file.type };
  };

  const handleAddDoc = async (files?: FileList | null) => {
    if (!docForm.name || !projectId) return;
    setDocUploading(true);
    let filePath = docForm.file_path || '';
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (files && files.length > 0) {
      const result = await handleDocFileUpload(files[0]);
      if (result) { filePath = result.url; fileSize = result.size; fileType = result.type; }
    }

    const { error } = await supabase.from('cpms_document_files' as any).insert({
      ...docForm, project_id: projectId, uploaded_by: user?.id,
      file_path: filePath, file_size: fileSize, file_type: fileType,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Document added' });
    setShowDocForm(false);
    setDocUploading(false);
    loadData();
  };

  const handleDeleteRow = async (table: string, id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from(table as any).delete().eq('id', id);
    toast({ title: 'Deleted' });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!project) return <div className="text-center py-12">Project not found</div>;

  const totalBudget = wbsNodes.reduce((s, w) => s + (w.budget_amount || 0), 0);
  const avgProgress = wbsNodes.length > 0 ? wbsNodes.reduce((s, w) => s + (w.progress_pct || 0), 0) / wbsNodes.length : 0;
  const totalBOQ = boqItems.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length;
  const actualCost = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const contractVal = project.contract_value || 0;
  const profitMargin = contractVal > 0 ? ((contractVal - actualCost) / contractVal * 100) : 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cpms')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.code} – {project.name}</h1>
          <p className="text-muted-foreground">{project.client_name || 'No client'} • {project.city || '-'}</p>
        </div>
        <Badge className={project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
          {project.status}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Contract</p><p className="text-lg font-bold">{(contractVal / 1e6).toFixed(1)}M</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Actual Cost</p><p className="text-lg font-bold">${actualCost.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Profit Margin</p><p className={`text-lg font-bold ${profitMargin < 0 ? 'text-destructive' : 'text-green-600'}`}>{profitMargin.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">BOQ Total</p><p className="text-lg font-bold">{(totalBOQ / 1e6).toFixed(1)}M</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Milestones</p><p className="text-lg font-bold">{completedMilestones}/{milestones.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Tasks</p><p className="text-lg font-bold">{completedTasks}/{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">WBS Progress</p><p className="text-lg font-bold">{avgProgress.toFixed(0)}%</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Team</p><p className="text-lg font-bold">{teams.length}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="milestones">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="milestones"><Target className="h-4 w-4 mr-1" /> Milestones</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare className="h-4 w-4 mr-1" /> Tasks</TabsTrigger>
          <TabsTrigger value="wbs"><Layers className="h-4 w-4 mr-1" /> WBS</TabsTrigger>
          <TabsTrigger value="boq"><DollarSign className="h-4 w-4 mr-1" /> BOQ</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" /> Documents</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
          <TabsTrigger value="billing"><DollarSign className="h-4 w-4 mr-1" /> Billing</TabsTrigger>
          <TabsTrigger value="expenses"><DollarSign className="h-4 w-4 mr-1" /> Expenses</TabsTrigger>
          <TabsTrigger value="contracts"><ClipboardList className="h-4 w-4 mr-1" /> Contracts</TabsTrigger>
          <TabsTrigger value="change-orders"><ArrowRightLeft className="h-4 w-4 mr-1" /> Change Orders</TabsTrigger>
          <TabsTrigger value="phases"><GitBranch className="h-4 w-4 mr-1" /> Phases</TabsTrigger>
          <TabsTrigger value="cost-budget"><DollarSign className="h-4 w-4 mr-1" /> Cost Codes</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Team</TabsTrigger>
        </TabsList>

        {/* MILESTONES TAB */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Milestones</CardTitle>
              <Button size="sm" onClick={() => { setMilestoneForm({ name: '', status: 'pending', sequence_order: milestones.length }); setShowMilestoneForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Milestone
              </Button>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No milestones. Add milestones to track project phases.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.planned_start && m.planned_end ? `${format(new Date(m.planned_start), 'dd MMM')} → ${format(new Date(m.planned_end), 'dd MMM yyyy')}` : 'No dates set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={m.progress_percentage || 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{m.progress_percentage || 0}%</span>
                      </div>
                      <Badge className={milestoneStatusColors[m.status] || ''}>{m.status}</Badge>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRow('cpms_milestones', m.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Tasks</CardTitle>
              <Button size="sm" onClick={() => { setTaskForm({ title: '', priority: 'medium', status: 'todo', milestone_id: '' }); setShowTaskForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks</TableCell></TableRow>
                  ) : tasks.map((t: any) => {
                    const ms = milestones.find((m: any) => m.id === t.milestone_id);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-xs">{ms?.name || '-'}</TableCell>
                        <TableCell><Badge className={taskPriorityColors[t.priority] || ''}>{t.priority}</Badge></TableCell>
                        <TableCell>{t.assigned_to_name || '-'}</TableCell>
                        <TableCell>{t.due_date ? format(new Date(t.due_date), 'dd MMM') : '-'}</TableCell>
                        <TableCell className="text-xs">{t.actual_hours || 0}/{t.estimated_hours || 0}h</TableCell>
                        <TableCell><Badge className={taskStatusColors[t.status] || ''}>{t.status}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRow('cpms_tasks', t.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WBS TAB */}
        <TabsContent value="wbs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Work Breakdown Structure</CardTitle>
              <Button size="sm" onClick={() => setShowWBSForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Node</Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.type')}</TableHead><TableHead>Budget</TableHead><TableHead>Progress</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wbsNodes.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No WBS nodes</TableCell></TableRow>
                    ) : wbsNodes.map(n => (
                      <TableRow key={n.id}>
                        <TableCell><Badge variant="outline">L{n.level}</Badge></TableCell>
                        <TableCell className="font-mono">{n.code}</TableCell>
                        <TableCell style={{ paddingLeft: `${(n.level - 1) * 20 + 8}px` }}>{n.name}</TableCell>
                        <TableCell><Badge variant="secondary">{n.type}</Badge></TableCell>
                        <TableCell>{(n.budget_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={n.progress_pct || 0} className="h-2 flex-1" />
                            <span className="text-xs">{n.progress_pct || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteWBSNode(n.id!); loadData(); }}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOQ TAB */}
        <TabsContent value="boq">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Bill of Quantities</CardTitle>
              <div className="flex items-center gap-2">
                <ExportImportButtons
                  data={boqItems}
                  columns={[
                    { key: 'item_code', header: 'Item Code' },
                    { key: 'description', header: 'Description' },
                    { key: 'category', header: 'Category' },
                    { key: 'unit', header: 'Unit' },
                    { key: 'quantity', header: 'Quantity' },
                    { key: 'unit_price', header: 'Unit Price' },
                    { key: 'total_amount', header: 'Total' },
                    { key: 'actual_amount', header: 'Actual' },
                  ] as ColumnDef[]}
                  filename="BOQ"
                  title="Bill of Quantities"
                  onImport={handleBOQBulkImport}
                />
                <Button size="sm" onClick={() => { setBoqForm({ category: '', item_code: '', description: '', unit: '', quantity: 0, unit_price: 0 }); setShowBOQForm(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>{t('common.description')}</TableHead><TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead><TableHead className="text-right">Actual</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boqItems.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No BOQ items</TableCell></TableRow>
                  ) : boqItems.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">{b.item_code || '-'}</TableCell>
                      <TableCell className="font-medium">{b.description}</TableCell>
                      <TableCell>{b.unit || '-'}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="text-right">{(b.unit_price || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{(b.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(b.actual_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRow('cpms_boq_items', b.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {boqItems.length > 0 && (
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={5} className="text-right">Total BOQ:</TableCell>
                      <TableCell className="text-right">{totalBOQ.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{boqItems.reduce((s: number, b: any) => s + (b.actual_amount || 0), 0).toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Document Control</CardTitle>
              <Button size="sm" onClick={() => { setDocForm({ name: '', category: 'other', status: 'draft' }); setShowDocForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Document
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead><TableHead>Category</TableHead><TableHead>Version</TableHead><TableHead>{t('common.status')}</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No documents</TableCell></TableRow>
                  ) : documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {d.file_path ? <Paperclip className="h-3 w-3 text-muted-foreground" /> : null}
                        {d.name}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{d.category}</Badge></TableCell>
                      <TableCell>v{d.version}</TableCell>
                      <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                      <TableCell className="flex items-center gap-1">
                        {d.file_path && (
                          <Button size="sm" variant="ghost" asChild><a href={d.file_path} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3" /></a></Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRow('cpms_document_files', d.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices">
          {(() => {
            const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
            const totalRetention = invoices.reduce((s: number, i: any) => s + (i.retention_amount || 0), 0);
            const totalCollected = invoices.filter((i: any) => i.status === 'closed').reduce((s: number, i: any) => s + (i.total || 0), 0);
            const contractValue = project.contract_value || 0;
            const remainingToBill = contractValue - totalInvoiced;

            const invoiceTypeColors: Record<string, string> = {
              standard: 'bg-muted text-muted-foreground',
              progress_billing: 'bg-orange-100 text-orange-800',
              final: 'bg-green-100 text-green-800',
              change_order: 'bg-purple-100 text-purple-800',
            };

            return (
              <div className="space-y-4">
                {/* Invoice Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total Invoiced</p>
                      <p className="text-lg font-bold">{(totalInvoiced / 1e6).toFixed(2)}M</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3 text-orange-500" /> Retention Held
                      </p>
                      <p className="text-lg font-bold text-orange-600">{totalRetention.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total Collected</p>
                      <p className="text-lg font-bold text-green-600">{(totalCollected / 1e6).toFixed(2)}M</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Remaining to Bill</p>
                      <p className={`text-lg font-bold ${remainingToBill < 0 ? 'text-destructive' : ''}`}>
                        {(remainingToBill / 1e6).toFixed(2)}M
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Project Invoices</CardTitle>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => navigate('/ar-invoices', { state: { fromProject: true, projectData: { cpms_project_id: projectId, customer_name: project.client_name || '', customer_code: '' } } })}>
                      <Plus className="h-4 w-4 mr-1" /> Create Invoice
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead>{t('common.type')}</TableHead>
                          <TableHead className="text-right">{t('common.amount')}</TableHead>
                          <TableHead className="text-right">Retention</TableHead>
                          <TableHead className="text-right">Amount Due</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No invoices linked to this project
                          </TableCell></TableRow>
                        ) : invoices.map((inv: any) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono font-medium">{inv.doc_num}</TableCell>
                            <TableCell>{inv.doc_date ? format(new Date(inv.doc_date), 'dd MMM yyyy') : '—'}</TableCell>
                            <TableCell>
                              <Badge className={invoiceTypeColors[inv.invoice_type] || invoiceTypeColors.standard}>
                                {(inv.invoice_type || 'standard').replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{(inv.total || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {inv.retention_amount > 0 ? (
                                <span className="text-orange-600 font-medium flex items-center justify-end gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  -{(inv.retention_amount || 0).toLocaleString()}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {(inv.amount_after_retention || inv.total || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={inv.status === 'closed' ? 'bg-green-100 text-green-800' : inv.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {invoices.length > 0 && (
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={3} className="text-right">Totals:</TableCell>
                            <TableCell className="text-right">{totalInvoiced.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-orange-600">-{totalRetention.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(totalInvoiced - totalRetention).toLocaleString()}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing">
          <ProjectBillingTab project={project} onRefresh={loadData} />
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses">
          {(() => {
            const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
            const budgeted = project.budgeted_cost || project.total_budget || 0;
            const remaining = budgeted - totalExpenses;
            const budgetPct = budgeted > 0 ? Math.min((totalExpenses / budgeted) * 100, 100) : 0;
            const overBudget = totalExpenses > budgeted && budgeted > 0;

            const categoryTotals: Record<string, number> = {};
            expenses.forEach((e: any) => {
              categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
            });

            const catColors: Record<string, string> = {
              materials: 'bg-blue-100 text-blue-800',
              labor: 'bg-green-100 text-green-800',
              equipment: 'bg-purple-100 text-purple-800',
              subcontractor: 'bg-orange-100 text-orange-800',
              permits: 'bg-yellow-100 text-yellow-800',
              other: 'bg-muted text-muted-foreground',
            };

            return (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total Expenses</p>
                      <p className="text-lg font-bold">${totalExpenses.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-lg font-bold">${budgeted.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className={`border-l-4 ${overBudget ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Remaining Budget</p>
                      <p className={`text-lg font-bold ${overBudget ? 'text-destructive' : 'text-green-600'}`}>
                        {overBudget && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                        ${remaining.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Budget Used</p>
                      <Progress value={budgetPct} className="h-2 mt-2" />
                      <p className="text-xs mt-1 font-medium">{budgetPct.toFixed(0)}%</p>
                    </CardContent>
                  </Card>
                </div>

                {overBudget && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warning: Expenses exceed budget by ${(totalExpenses - budgeted).toLocaleString()}</span>
                  </div>
                )}

                {/* Category Breakdown */}
                {Object.keys(categoryTotals).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                      <Badge key={cat} className={catColors[cat] || ''}>
                        {cat}: ${total.toLocaleString()}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Expenses Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Project Expenses</CardTitle>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => navigate('/cpms/expenses', { state: { fromProject: true, projectId } })}>
                      <Plus className="h-4 w-4 mr-1" /> Add Expense
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>{t('common.description')}</TableHead>
                          <TableHead className="text-right">{t('common.amount')}</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No expenses for this project
                          </TableCell></TableRow>
                        ) : expenses.map((exp: any) => (
                          <TableRow key={exp.id}>
                            <TableCell>{exp.expense_date ? format(new Date(exp.expense_date), 'dd MMM yyyy') : '—'}</TableCell>
                            <TableCell className="font-medium">{exp.vendor_name}</TableCell>
                            <TableCell><Badge className={catColors[exp.category] || ''}>{exp.category}</Badge></TableCell>
                            <TableCell className="max-w-[200px] truncate">{exp.description || '—'}</TableCell>
                            <TableCell className="text-right font-semibold">${(exp.amount || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {exp.paid ? (
                                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" /> Unpaid</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {expenses.length > 0 && (
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4} className="text-right">Total:</TableCell>
                            <TableCell className="text-right">${totalExpenses.toLocaleString()}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader><CardTitle className="text-base">Contracts</CardTitle></CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No contracts</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Contract No</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Value</TableHead><TableHead>Retention %</TableHead><TableHead>{t('common.status')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {contracts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.contract_no}</TableCell>
                        <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                        <TableCell>{(c.value || 0).toLocaleString()} SAR</TableCell>
                        <TableCell>{c.retention_pct}%</TableCell>
                        <TableCell><Badge>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHANGE ORDERS TAB */}
        <TabsContent value="change-orders">
          {(() => {
            const coStats = changeOrderHook.getStats();
            const originalContract = project.contract_value || 0;
            const contractGrowth = originalContract > 0 ? ((coStats.totalCOValue / originalContract) * 100) : 0;
            const coStatusColors: Record<string, string> = {
              draft: 'bg-muted text-muted-foreground',
              submitted: 'bg-blue-100 text-blue-800',
              approved: 'bg-emerald-100 text-emerald-800',
              rejected: 'bg-red-100 text-red-800',
              invoiced: 'bg-purple-100 text-purple-800',
            };
            return (
              <div className="space-y-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Card className="border-l-4 border-l-primary"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total COs</p>
                    <p className="text-2xl font-bold">{coStats.total}</p>
                  </CardContent></Card>
                  <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Total CO Value</p>
                    <p className="text-lg font-bold text-emerald-600">{(coStats.totalCOValue).toLocaleString()} SAR</p>
                  </CardContent></Card>
                  <Card className="border-l-4 border-l-blue-500"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                    <p className="text-lg font-bold text-blue-600">{coStats.pending}</p>
                    <p className="text-[10px] text-muted-foreground">{coStats.pendingValue.toLocaleString()} SAR</p>
                  </CardContent></Card>
                  <Card className="border-l-4 border-l-amber-500"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Contract Growth</p>
                    <p className={`text-lg font-bold ${contractGrowth > 10 ? 'text-amber-600' : contractGrowth > 0 ? 'text-emerald-600' : ''}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {contractGrowth > 0 ? '+' : ''}{contractGrowth.toFixed(1)}%
                    </p>
                  </CardContent></Card>
                  <Card className="border-l-4 border-l-orange-500"><CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Schedule Impact</p>
                    <p className="text-lg font-bold">{coStats.totalScheduleImpact > 0 ? '+' : ''}{coStats.totalScheduleImpact} days</p>
                  </CardContent></Card>
                </div>

                {/* Original vs Revised */}
                {originalContract > 0 && coStats.totalCOValue !== 0 && (
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Original Contract</p>
                          <p className="text-lg font-bold">{(originalContract).toLocaleString()} SAR</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Approved COs</p>
                          <p className={`text-lg font-bold ${coStats.totalCOValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {coStats.totalCOValue >= 0 ? '+' : ''}{coStats.totalCOValue.toLocaleString()} SAR
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contract + Approved COs</p>
                          <p className="text-lg font-bold text-primary">{(originalContract + coStats.totalCOValue).toLocaleString()} SAR</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Change Orders List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Change Orders</CardTitle>
                    <Button size="sm" onClick={() => navigate('/cpms/change-orders')}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" /> Manage COs
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CO #</TableHead><TableHead>Title</TableHead><TableHead>Reason</TableHead>
                          <TableHead>{t('common.amount')}</TableHead><TableHead>Cost</TableHead><TableHead>Schedule</TableHead><TableHead>{t('common.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {changeOrderHook.changeOrders.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No change orders for this project
                          </TableCell></TableRow>
                        ) : changeOrderHook.changeOrders.map((c) => {
                          const profit = (c.amount || 0) - (c.cost_impact || 0);
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.co_number}</TableCell>
                              <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.title}</TableCell>
                              <TableCell className="text-xs">{c.reason || '—'}</TableCell>
                              <TableCell className={`text-xs font-medium ${(c.amount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {(c.amount || 0) >= 0 ? '+' : ''}{(c.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs text-red-600">{(c.cost_impact || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-xs">
                                {c.schedule_impact_days > 0 ? `+${c.schedule_impact_days}d` : c.schedule_impact_days === 0 ? '—' : `${c.schedule_impact_days}d`}
                              </TableCell>
                              <TableCell><Badge className={coStatusColors[c.status] || ''}>{c.status}</Badge></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>


        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Project Team</CardTitle>
              <div className="flex items-center gap-2">
                <ExportImportButtons
                  data={teams}
                  columns={[
                    { key: 'user_name', header: 'Name' },
                    { key: 'role', header: 'Role' },
                    { key: 'allocation_pct', header: 'Allocation %' },
                    { key: 'is_active', header: 'Active' },
                  ] as ColumnDef[]}
                  filename="Project_Team"
                  title="Project Team"
                  onImport={handleTeamImport}
                />
                <Button size="sm" onClick={() => { setTeamForm({ user_name: '', role: 'member', allocation_pct: 100, is_active: true }); setShowTeamForm(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No team members</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>Role</TableHead><TableHead>Allocation</TableHead><TableHead>{t('common.active')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {teams.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.user_name || '-'}</TableCell>
                        <TableCell><Badge variant="secondary">{t.role}</Badge></TableCell>
                        <TableCell>{t.allocation_pct}%</TableCell>
                        <TableCell>{t.is_active ? '✅' : '❌'}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRow('cpms_project_teams', t.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases">
          {project && <ProjectPhasesTab projectId={project.id} projectBudget={project.contract_value || 0} />}
        </TabsContent>

        <TabsContent value="cost-budget">
          {project && <ProjectCostCodeBudgetTab projectId={project.id} contractValue={project.contract_value || 0} />}
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      {/* WBS Form */}
      <Dialog open={showWBSForm} onOpenChange={setShowWBSForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add WBS Node</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Code *</Label><Input value={wbsForm.code} onChange={e => setWbsForm(f => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={wbsForm.name} onChange={e => setWbsForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Level</Label>
              <Select value={String(wbsForm.level || 1)} onValueChange={v => setWbsForm(f => ({ ...f, level: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Level 1</SelectItem><SelectItem value="2">Level 2</SelectItem><SelectItem value="3">Level 3</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Budget</Label><Input type="number" value={wbsForm.budget_amount || ''} onChange={e => setWbsForm(f => ({ ...f, budget_amount: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowWBSForm(false)}>{t('common.cancel')}</Button><Button onClick={handleAddWBS}>Add</Button></div>
        </DialogContent>
      </Dialog>

      {/* Milestone Form */}
      <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2"><Label>Name *</Label><Input value={milestoneForm.name} onChange={e => setMilestoneForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Planned Start</Label><Input type="date" value={milestoneForm.planned_start} onChange={e => setMilestoneForm((f: any) => ({ ...f, planned_start: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Planned End</Label><Input type="date" value={milestoneForm.planned_end} onChange={e => setMilestoneForm((f: any) => ({ ...f, planned_end: e.target.value }))} /></div>
            <div className="space-y-2 col-span-2"><Label>{t('common.description')}</Label><Textarea value={milestoneForm.description || ''} onChange={e => setMilestoneForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowMilestoneForm(false)}>{t('common.cancel')}</Button><Button onClick={handleAddMilestone} disabled={!milestoneForm.name}>Add</Button></div>
        </DialogContent>
      </Dialog>

      {/* Task Form */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2"><Label>Title *</Label><Input value={taskForm.title} onChange={e => setTaskForm((f: any) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Milestone</Label>
              <Select value={taskForm.milestone_id || 'none'} onValueChange={v => setTaskForm((f: any) => ({ ...f, milestone_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {milestones.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={v => setTaskForm((f: any) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm((f: any) => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Est. Hours</Label><Input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm((f: any) => ({ ...f, estimated_hours: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2 col-span-2"><Label>{t('common.description')}</Label><Textarea value={taskForm.description || ''} onChange={e => setTaskForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowTaskForm(false)}>{t('common.cancel')}</Button><Button onClick={handleAddTask} disabled={!taskForm.title}>Add</Button></div>
        </DialogContent>
      </Dialog>

      {/* BOQ Form */}
      <Dialog open={showBOQForm} onOpenChange={setShowBOQForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add BOQ Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Item Code</Label><Input value={boqForm.item_code} onChange={e => setBoqForm((f: any) => ({ ...f, item_code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={boqForm.category} onChange={e => setBoqForm((f: any) => ({ ...f, category: e.target.value }))} /></div>
            <div className="space-y-2 col-span-2"><Label>Description *</Label><Input value={boqForm.description} onChange={e => setBoqForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit</Label><Input value={boqForm.unit} onChange={e => setBoqForm((f: any) => ({ ...f, unit: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={boqForm.quantity} onChange={e => setBoqForm((f: any) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" value={boqForm.unit_price} onChange={e => setBoqForm((f: any) => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setShowBOQForm(false)}>{t('common.cancel')}</Button><Button onClick={handleAddBOQ} disabled={!boqForm.description}>Add</Button></div>
        </DialogContent>
      </Dialog>

      {/* Document Form */}
      <Dialog open={showDocForm} onOpenChange={setShowDocForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          {(() => {
            const docFileRef = { current: null as FileList | null };
            return (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name *</Label><Input value={docForm.name} onChange={e => setDocForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={docForm.category} onValueChange={v => setDocForm((f: any) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drawing">Drawing</SelectItem><SelectItem value="specification">Specification</SelectItem>
                        <SelectItem value="report">Report</SelectItem><SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="permit">Permit</SelectItem><SelectItem value="submittal">Submittal</SelectItem>
                        <SelectItem value="rfi">RFI</SelectItem><SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2"><Label>{t('common.description')}</Label><Textarea value={docForm.description || ''} onChange={e => setDocForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} /></div>
                  <div className="space-y-2 col-span-2">
                    <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Attach File</Label>
                    <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.png,.jpg,.jpeg,.zip" onChange={e => { docFileRef.current = e.target.files; }} />
                    <p className="text-xs text-muted-foreground">PDF, DOC, XLS, DWG, Images, ZIP supported</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowDocForm(false)}>{t('common.cancel')}</Button>
                  <Button onClick={() => handleAddDoc(docFileRef.current)} disabled={!docForm.name || docUploading}>
                    {docUploading ? 'Uploading...' : 'Add'}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Team Form */}
      <Dialog open={showTeamForm} onOpenChange={setShowTeamForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2"><Label>Name *</Label><Input value={teamForm.user_name} onChange={e => setTeamForm((f: any) => ({ ...f, user_name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={teamForm.role} onValueChange={v => setTeamForm((f: any) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="site_engineer">Site Engineer</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                  <SelectItem value="quantity_surveyor">Quantity Surveyor</SelectItem>
                  <SelectItem value="safety_officer">Safety Officer</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Allocation %</Label><Input type="number" min={0} max={100} value={teamForm.allocation_pct} onChange={e => setTeamForm((f: any) => ({ ...f, allocation_pct: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowTeamForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddTeam} disabled={!teamForm.user_name}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
