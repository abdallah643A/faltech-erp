import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2, ArrowDown, ArrowUp, Shield, Settings2, User, CheckCircle2 } from 'lucide-react';

const documentTypes = [
  { key: 'inspection', en: 'Inspection', ar: 'فحص' },
  { key: 'ncr', en: 'NCR', ar: 'عدم مطابقة' },
  { key: 'defect', en: 'Defect / Ticket', ar: 'عيب / تذكرة' },
  { key: 'material', en: 'Material Approval', ar: 'موافقة مواد' },
  { key: 'checklist', en: 'Checklist', ar: 'قائمة فحص' },
  { key: 'drawing', en: 'Drawing Revision', ar: 'مراجعة مخطط' },
  { key: 'handover', en: 'Handover', ar: 'تسليم' },
  { key: 'method_statement', en: 'Method Statement', ar: 'بيان أسلوب العمل' },
  { key: 'rfi', en: 'RFI', ar: 'طلب معلومات' },
  { key: 'change_order', en: 'Change Order', ar: 'أمر تغيير' },
];

interface WorkflowStage {
  id: string;
  stageName: string;
  approverRole: string;
  approverType: 'role' | 'user';
  slaHours: number;
  canReject: boolean;
  rejectionAction: 'back_to_creator' | 'previous_stage' | 'specific_stage';
  escalationRole: string;
}

interface WorkflowTemplate {
  id: string;
  documentType: string;
  name: string;
  isActive: boolean;
  stages: WorkflowStage[];
}

const defaultStage = (): WorkflowStage => ({
  id: crypto.randomUUID(),
  stageName: '',
  approverRole: '',
  approverType: 'role',
  slaHours: 24,
  canReject: true,
  rejectionAction: 'back_to_creator',
  escalationRole: '',
});

const sampleWorkflows: WorkflowTemplate[] = [
  {
    id: '1', documentType: 'inspection', name: 'Standard Inspection Approval', isActive: true,
    stages: [
      { id: 's1', stageName: 'QC Engineer Review', approverRole: 'QC Engineer', approverType: 'role', slaHours: 8, canReject: true, rejectionAction: 'back_to_creator', escalationRole: 'QA Manager' },
      { id: 's2', stageName: 'QA Manager Approval', approverRole: 'QA Manager', approverType: 'role', slaHours: 24, canReject: true, rejectionAction: 'previous_stage', escalationRole: 'Project Director' },
    ],
  },
  {
    id: '2', documentType: 'ncr', name: 'NCR Approval Workflow', isActive: true,
    stages: [
      { id: 's3', stageName: 'Site Engineer Investigation', approverRole: 'Site Engineer', approverType: 'role', slaHours: 24, canReject: false, rejectionAction: 'back_to_creator', escalationRole: 'QC Manager' },
      { id: 's4', stageName: 'QC Manager Review', approverRole: 'QC Manager', approverType: 'role', slaHours: 24, canReject: true, rejectionAction: 'back_to_creator', escalationRole: 'QA Director' },
      { id: 's5', stageName: 'QA Director Final Approval', approverRole: 'QA Director', approverType: 'role', slaHours: 48, canReject: true, rejectionAction: 'previous_stage', escalationRole: 'Project Director' },
    ],
  },
  {
    id: '3', documentType: 'material', name: 'Material Approval Cycle', isActive: true,
    stages: [
      { id: 's6', stageName: 'QC Inspector Check', approverRole: 'QC Inspector', approverType: 'role', slaHours: 8, canReject: true, rejectionAction: 'back_to_creator', escalationRole: 'QC Manager' },
      { id: 's7', stageName: 'Procurement Review', approverRole: 'Procurement Manager', approverType: 'role', slaHours: 24, canReject: true, rejectionAction: 'back_to_creator', escalationRole: 'Project Manager' },
    ],
  },
];

const approverRoles = [
  'QC Inspector', 'QC Engineer', 'QC Manager', 'QA Manager', 'QA Director',
  'Site Engineer', 'Project Engineer', 'Project Manager', 'Project Director',
  'Procurement Manager', 'Safety Manager', 'Consultant Representative',
];

export function QAQCWorkflowSetup() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(sampleWorkflows);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);

  const openNewWorkflow = () => {
    setEditingWorkflow({ id: crypto.randomUUID(), documentType: '', name: '', isActive: true, stages: [defaultStage()] });
    setShowWorkflowDialog(true);
  };

  const openEditWorkflow = (wf: WorkflowTemplate) => {
    setEditingWorkflow({ ...wf, stages: wf.stages.map(s => ({ ...s })) });
    setShowWorkflowDialog(true);
  };

  const addStage = () => {
    if (!editingWorkflow) return;
    setEditingWorkflow({ ...editingWorkflow, stages: [...editingWorkflow.stages, defaultStage()] });
  };

  const removeStage = (idx: number) => {
    if (!editingWorkflow || editingWorkflow.stages.length <= 1) return;
    const stages = [...editingWorkflow.stages];
    stages.splice(idx, 1);
    setEditingWorkflow({ ...editingWorkflow, stages });
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    if (!editingWorkflow) return;
    const stages = [...editingWorkflow.stages];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= stages.length) return;
    [stages[idx], stages[newIdx]] = [stages[newIdx], stages[idx]];
    setEditingWorkflow({ ...editingWorkflow, stages });
  };

  const updateStage = (idx: number, field: keyof WorkflowStage, value: any) => {
    if (!editingWorkflow) return;
    const stages = [...editingWorkflow.stages];
    (stages[idx] as any)[field] = value;
    setEditingWorkflow({ ...editingWorkflow, stages });
  };

  const saveWorkflow = () => {
    if (!editingWorkflow || !editingWorkflow.name || !editingWorkflow.documentType) return;
    setWorkflows(prev => {
      const existing = prev.findIndex(w => w.id === editingWorkflow.id);
      if (existing >= 0) { const updated = [...prev]; updated[existing] = editingWorkflow; return updated; }
      return [...prev, editingWorkflow];
    });
    setShowWorkflowDialog(false);
    setEditingWorkflow(null);
  };

  const deleteWorkflow = (id: string) => setWorkflows(prev => prev.filter(w => w.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{isAr ? 'قوالب سير عمل الموافقة' : 'Approval Workflow Templates'}</h3>
          <p className="text-xs text-muted-foreground">{isAr ? 'حدد دورة الموافقة لكل نوع مستند' : 'Define the approval cycle for each document type'}</p>
        </div>
        <Button size="sm" onClick={openNewWorkflow}><Plus className="h-4 w-4 mr-1" />{isAr ? 'قالب جديد' : 'New Template'}</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workflows.map(wf => {
          const docLabel = documentTypes.find(d => d.key === wf.documentType);
          return (
            <Card key={wf.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEditWorkflow(wf)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium">{wf.name}</h4>
                    <Badge variant="outline" className="text-[10px] mt-1">{isAr ? docLabel?.ar : docLabel?.en}</Badge>
                  </div>
                  <Badge className={`text-[10px] ${wf.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                    {wf.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {wf.stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</div>
                        <span className="text-[9px] text-muted-foreground max-w-[70px] text-center truncate mt-0.5">{stage.stageName || stage.approverRole}</span>
                      </div>
                      {idx < wf.stages.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                  <span>{wf.stages.length} {isAr ? 'مراحل' : 'stages'}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {workflows.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isAr ? 'لا توجد قوالب سير عمل بعد' : 'No workflow templates yet'}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={openNewWorkflow}><Plus className="h-4 w-4 mr-1" />{isAr ? 'إنشاء أول قالب' : 'Create First Template'}</Button>
          </div>
        )}
      </div>

      {/* Workflow Editor Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={v => { if (!v) { setShowWorkflowDialog(false); setEditingWorkflow(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {editingWorkflow && workflows.find(w => w.id === editingWorkflow.id)
                ? (isAr ? 'تعديل قالب سير العمل' : 'Edit Workflow Template')
                : (isAr ? 'قالب سير عمل جديد' : 'New Workflow Template')}
            </DialogTitle>
          </DialogHeader>

          {editingWorkflow && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label>{isAr ? 'اسم القالب' : 'Template Name'}</Label>
                  <Input value={editingWorkflow.name} onChange={e => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })} placeholder={isAr ? 'مثال: دورة موافقة الفحص' : 'e.g. Inspection Approval Cycle'} />
                </div>
                <div>
                  <Label>{isAr ? 'نوع المستند' : 'Document Type'}</Label>
                  <Select value={editingWorkflow.documentType} onValueChange={v => setEditingWorkflow({ ...editingWorkflow, documentType: v })}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      {documentTypes.map(dt => <SelectItem key={dt.key} value={dt.key}>{isAr ? dt.ar : dt.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">{isAr ? 'مراحل الموافقة' : 'Approval Stages'}</Label>
                  <Button variant="outline" size="sm" onClick={addStage}><Plus className="h-3 w-3 mr-1" />{isAr ? 'إضافة مرحلة' : 'Add Stage'}</Button>
                </div>
                <div className="space-y-3">
                  {editingWorkflow.stages.map((stage, idx) => (
                    <Card key={stage.id} className="border-dashed">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">{idx + 1}</div>
                          <Input value={stage.stageName} onChange={e => updateStage(idx, 'stageName', e.target.value)} placeholder={isAr ? 'اسم المرحلة' : 'Stage Name'} className="h-8 text-sm font-medium" />
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveStage(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveStage(idx, 1)} disabled={idx === editingWorkflow.stages.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeStage(idx)} disabled={editingWorkflow.stages.length <= 1}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[11px]">{isAr ? 'دور الموافق' : 'Approver Role'}</Label>
                            <Select value={stage.approverRole} onValueChange={v => updateStage(idx, 'approverRole', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                              <SelectContent>{approverRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[11px]">{isAr ? 'مهلة SLA (ساعات)' : 'SLA (hours)'}</Label>
                            <Input type="number" value={stage.slaHours} onChange={e => updateStage(idx, 'slaHours', Number(e.target.value))} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-[11px]">{isAr ? 'عند الرفض' : 'On Rejection'}</Label>
                            <Select value={stage.rejectionAction} onValueChange={v => updateStage(idx, 'rejectionAction', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="back_to_creator">{isAr ? 'إرجاع للمنشئ' : 'Back to Creator'}</SelectItem>
                                <SelectItem value="previous_stage">{isAr ? 'المرحلة السابقة' : 'Previous Stage'}</SelectItem>
                                <SelectItem value="specific_stage">{isAr ? 'مرحلة محددة' : 'Specific Stage'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[11px]">{isAr ? 'التصعيد إلى' : 'Escalation To'}</Label>
                            <Select value={stage.escalationRole} onValueChange={v => updateStage(idx, 'escalationRole', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'اختياري' : 'Optional'} /></SelectTrigger>
                              <SelectContent>{approverRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Visual Preview */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">{isAr ? 'معاينة سير العمل' : 'Workflow Preview'}</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{isAr ? 'المنشئ' : 'Creator'}</span>
                  </div>
                  {editingWorkflow.stages.map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-2 shrink-0">
                      <ArrowDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</div>
                        <span className="text-[9px] text-muted-foreground max-w-[80px] text-center truncate mt-0.5">{stage.stageName || stage.approverRole || `Stage ${idx + 1}`}</span>
                        <span className="text-[8px] text-muted-foreground">{stage.slaHours}h SLA</span>
                      </div>
                    </div>
                  ))}
                  <ArrowDown className="h-4 w-4 text-green-600 rotate-[-90deg] shrink-0" />
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                    <span className="text-[9px] text-green-700 mt-0.5">{isAr ? 'معتمد' : 'Approved'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowWorkflowDialog(false); setEditingWorkflow(null); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={saveWorkflow} disabled={!editingWorkflow?.name || !editingWorkflow?.documentType}>{isAr ? 'حفظ القالب' : 'Save Template'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
