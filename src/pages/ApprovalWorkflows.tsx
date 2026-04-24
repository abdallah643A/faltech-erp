import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useApprovalTemplates, useApprovalStages, useApprovalRequests } from '@/hooks/useApprovals';
import { useUsers } from '@/hooks/useUsers';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Layers, Settings2, BarChart3, ClipboardCheck, Eye, CheckCircle2, XCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import WorkflowList from '@/components/workflows/WorkflowList';
import WorkflowDesigner from '@/components/workflows/WorkflowDesigner';
import WorkflowAnalytics from '@/components/workflows/WorkflowAnalytics';
import { DOCUMENT_TYPES } from '@/components/workflows/workflowConstants';
import { WorkflowConditionEngine } from '@/components/workflow/WorkflowConditionEngine';

export default function ApprovalWorkflows() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [tab, setTab] = useState('workflows');
  const [designerTemplate, setDesignerTemplate] = useState<any>(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState<any>(null);
  const [actionComment, setActionComment] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const templates = useApprovalTemplates();
  const stages = useApprovalStages(designerTemplate?.id);
  const allRequests = useApprovalRequests(undefined, undefined);
  const filteredRequests = useApprovalRequests(undefined, statusFilter || undefined);
  const { users } = useUsers();

  // Enrich templates with stage count
  const enrichedTemplates = useMemo(() => {
    return (templates.data || []).map((t: any) => ({ ...t, stage_count: '—' }));
  }, [templates.data]);

  const statusSummary = useMemo(() => ({
    total: allRequests.data?.length || 0,
    pending: allRequests.data?.filter((r: any) => r.status === 'pending').length || 0,
    approved: allRequests.data?.filter((r: any) => r.status === 'approved').length || 0,
    rejected: allRequests.data?.filter((r: any) => r.status === 'rejected').length || 0,
  }), [allRequests.data]);

  const handleCreateNew = () => {
    setDesignerTemplate(null);
    setShowDesigner(true);
  };

  const handleEdit = (template: any) => {
    setDesignerTemplate(template);
    setShowDesigner(true);
  };

  const handleClone = (template: any) => {
    templates.create.mutate({
      name: `${template.name} (Copy)`,
      description: template.description,
      document_type: template.document_type,
      priority: template.priority,
      sla_hours: template.sla_hours,
      conditions: template.conditions,
      min_amount: template.min_amount,
      max_amount: template.max_amount,
      category: template.category,
      status: 'draft',
    });
  };

  const handleToggleStatus = (template: any) => {
    templates.update.mutate({
      id: template.id,
      is_active: !template.is_active,
      status: template.is_active ? 'draft' : 'active',
    });
  };

  const handleArchive = (template: any) => {
    templates.update.mutate({ id: template.id, status: 'archived', is_active: false });
  };

  const handleSaveTemplate = (data: any) => {
    if (data.id) {
      templates.update.mutate(data, {
        onSuccess: () => toast.success(isAr ? 'تم تحديث سير العمل' : 'Workflow updated'),
      });
    } else {
      templates.create.mutate(data, {
        onSuccess: (result: any) => {
          setDesignerTemplate(result);
          toast.success(isAr ? 'تم إنشاء سير العمل' : 'Workflow created');
        },
      });
    }
  };

  const handleSaveStage = (stage: any) => {
    stages.upsert.mutate(stage, {
      onSuccess: () => toast.success(isAr ? 'تم حفظ المرحلة' : 'Stage saved'),
    });
  };

  const handleDeleteStage = (id: string) => {
    stages.remove.mutate(id, {
      onSuccess: () => toast.success(isAr ? 'تم حذف المرحلة' : 'Stage deleted'),
    });
  };

  const handleApprove = (req: any) => {
  const { t } = useLanguage();

    filteredRequests.approve.mutate({ requestId: req.id, comments: actionComment }, {
      onSuccess: () => { setShowActionDialog(null); setActionComment(''); },
    });
  };

  const handleReject = (req: any) => {
  const { t } = useLanguage();

    filteredRequests.reject.mutate({ requestId: req.id, reason: actionComment || 'Rejected' }, {
      onSuccess: () => { setShowActionDialog(null); setActionComment(''); },
    });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return <Badge className={map[s] || 'bg-muted text-muted-foreground'}>{s}</Badge>;
  };

  if (showDesigner) {
    return (
      <div className="space-y-4 page-enter">
        <WorkflowDesigner
          template={designerTemplate}
          stages={stages.data || []}
          users={users}
          onSaveTemplate={handleSaveTemplate}
          onSaveStage={handleSaveStage}
          onDeleteStage={handleDeleteStage}
          onClose={() => setShowDesigner(false)}
          isAr={isAr}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isAr ? 'إعداد سير العمل' : 'Workflow Setup & Configuration'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'تصميم وإدارة عمليات الموافقة لجميع المستندات' : 'Design and manage approval workflows for all document types'}
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'سير العمل' : 'Workflows'}</p>
          <p className="text-lg font-bold">{enrichedTemplates.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'إجمالي الطلبات' : 'Total Requests'}</p>
          <p className="text-lg font-bold">{statusSummary.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'قيد الانتظار' : 'Pending'}</p>
          <p className="text-lg font-bold text-amber-600">{statusSummary.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'معتمد' : 'Approved'}</p>
          <p className="text-lg font-bold text-emerald-600">{statusSummary.approved}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase">{isAr ? 'مرفوض' : 'Rejected'}</p>
          <p className="text-lg font-bold text-destructive">{statusSummary.rejected}</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="workflows" className="text-xs gap-1"><Layers className="h-3 w-3" />{isAr ? 'سير العمل' : 'Workflows'}</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs gap-1"><ClipboardCheck className="h-3 w-3" />{isAr ? 'طلبات الموافقة' : 'Approval Queue'}</TabsTrigger>
          <TabsTrigger value="conditions" className="text-xs gap-1"><Filter className="h-3 w-3" />{isAr ? 'شروط التشغيل' : 'Conditions'}</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />{isAr ? 'التحليلات' : 'Analytics'}</TabsTrigger>
        </TabsList>

        {/* Workflow List */}
        <TabsContent value="workflows" className="mt-3">
          <WorkflowList
            templates={enrichedTemplates}
            isLoading={templates.isLoading}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onClone={handleClone}
            onToggleStatus={handleToggleStatus}
            onArchive={handleArchive}
            isAr={isAr}
          />
        </TabsContent>

        {/* Approval Queue */}
        <TabsContent value="approvals" className="mt-3 space-y-3">
          <div className="flex gap-2">
            {[
              { val: 'pending', label: isAr ? 'قيد الانتظار' : 'Pending' },
              { val: 'approved', label: isAr ? 'معتمد' : 'Approved' },
              { val: 'rejected', label: isAr ? 'مرفوض' : 'Rejected' },
              { val: '', label: isAr ? 'الكل' : 'All' },
            ].map(s => (
              <Button key={s.val} variant={statusFilter === s.val ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setStatusFilter(s.val)}>
                {s.label}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>{isAr ? 'المستند' : 'Document'}</TableHead>
                    <TableHead>{isAr ? 'مقدم الطلب' : 'Requester'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{isAr ? 'المرحلة' : 'Stage'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.data?.map((r: any) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell>
                        <div className="font-medium">{r.document_number || r.document_type}</div>
                        <div className="text-[10px] text-muted-foreground">{DOCUMENT_TYPES.find(d => d.value === r.document_type)?.[isAr ? 'labelAr' : 'label'] || r.document_type}</div>
                      </TableCell>
                      <TableCell>{r.requester_name}</TableCell>
                      <TableCell className="text-right font-mono">{r.amount?.toLocaleString()} SAR</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.current_stage}/{r.total_stages}</Badge></TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>{r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setShowActionDialog(r)}>
                            <Eye className="h-3 w-3 mr-1" /> {isAr ? 'مراجعة' : 'Review'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredRequests.data?.length && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">{isAr ? 'لا توجد طلبات' : 'No requests found'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions */}
        <TabsContent value="conditions" className="mt-3">
          <WorkflowConditionEngine templateId={designerTemplate?.id} />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-3">
          <WorkflowAnalytics
            requests={allRequests.data || []}
            templates={enrichedTemplates}
            isAr={isAr}
          />
        </TabsContent>
      </Tabs>

      {/* Approval Action Dialog */}
      <Dialog open={!!showActionDialog} onOpenChange={() => setShowActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'مراجعة طلب الموافقة' : 'Review Approval Request'}</DialogTitle>
          </DialogHeader>
          {showActionDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">{isAr ? 'المستند:' : 'Document:'}</span> <strong>{showActionDialog.document_number || showActionDialog.document_type}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'المبلغ:' : 'Amount:'}</span> <strong>{showActionDialog.amount?.toLocaleString()} SAR</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'مقدم الطلب:' : 'Requester:'}</span> <strong>{showActionDialog.requester_name}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'المرحلة:' : 'Stage:'}</span> <strong>{showActionDialog.current_stage}/{showActionDialog.total_stages}</strong></div>
              </div>
              <div>
                <Textarea placeholder={isAr ? 'تعليقات...' : 'Comments...'} value={actionComment} onChange={e => setActionComment(e.target.value)} className="text-xs" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" size="sm" onClick={() => handleReject(showActionDialog)} className="text-xs">
              <XCircle className="h-3.5 w-3.5 mr-1" />{isAr ? 'رفض' : 'Reject'}
            </Button>
            <Button size="sm" onClick={() => handleApprove(showActionDialog)} className="text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{isAr ? 'موافقة' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
