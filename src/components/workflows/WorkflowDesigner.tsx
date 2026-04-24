import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, GripVertical, ArrowDown, ArrowRight, Settings2,
  Users, Clock, Bell, Shield, GitBranch, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Save, X, Layers, Zap,
} from 'lucide-react';
import { DOCUMENT_TYPES, APPROVAL_LOGIC_OPTIONS, REJECTION_ACTIONS, PRIORITY_OPTIONS, APPROVER_TYPES, CONDITION_FIELDS, CONDITION_OPERATORS } from './workflowConstants';
import StageCard from './StageCard';
import ConditionBuilder from './ConditionBuilder';

interface WorkflowDesignerProps {
  template: any;
  stages: any[];
  users: any[];
  onSaveTemplate: (data: any) => void;
  onSaveStage: (stage: any) => void;
  onDeleteStage: (id: string) => void;
  onClose: () => void;
  isAr: boolean;
}

export default function WorkflowDesigner({
  template, stages, users, onSaveTemplate, onSaveStage, onDeleteStage, onClose, isAr,
}: WorkflowDesignerProps) {
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    document_type: template?.document_type || 'purchase_order',
    priority: template?.priority || 'medium',
    sla_hours: template?.sla_hours || '',
    effective_from: template?.effective_from || '',
    effective_to: template?.effective_to || '',
    allow_edit_during_approval: template?.allow_edit_during_approval ?? false,
    enable_comments: template?.enable_comments ?? true,
    lock_after_approval: template?.lock_after_approval ?? true,
    min_amount: template?.min_amount || '',
    max_amount: template?.max_amount || '',
    category: template?.category || '',
    conditions: template?.conditions || [],
  });
  const [activeTab, setActiveTab] = useState('general');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const handleSave = () => {
    onSaveTemplate({
      ...(template?.id ? { id: template.id } : {}),
      name: form.name,
      description: form.description,
      document_type: form.document_type,
      priority: form.priority,
      sla_hours: form.sla_hours ? Number(form.sla_hours) : null,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      allow_edit_during_approval: form.allow_edit_during_approval,
      enable_comments: form.enable_comments,
      lock_after_approval: form.lock_after_approval,
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_amount: form.max_amount ? Number(form.max_amount) : null,
      category: form.category || null,
      conditions: form.conditions,
      status: 'draft',
    });
  };

  const addStage = () => {
    if (!template?.id) return;
    const nextOrder = (stages?.length || 0) + 1;
    onSaveStage({
      template_id: template.id,
      stage_order: nextOrder,
      stage_name: `Stage ${nextOrder}`,
      approver_type: 'role',
      approval_logic: 'all',
      can_reject: true,
      allow_delegation: true,
      is_parallel: false,
      notification_settings: { email: true, push: true, reminder_hours: 24 },
    });
  };

  const sortedStages = [...(stages || [])].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {template?.id ? (isAr ? 'تعديل سير العمل' : 'Edit Workflow') : (isAr ? 'إنشاء سير عمل جديد' : 'Create New Workflow')}
          </h2>
          <p className="text-xs text-muted-foreground">{form.name || (isAr ? 'سير عمل جديد' : 'New workflow')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}><X className="h-3.5 w-3.5 mr-1" />{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button size="sm" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" />{isAr ? 'حفظ' : 'Save'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Panel - Workflow Settings */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {isAr ? 'إعدادات سير العمل' : 'Workflow Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3 h-7">
                  <TabsTrigger value="general" className="text-[10px]">{isAr ? 'عام' : 'General'}</TabsTrigger>
                  <TabsTrigger value="conditions" className="text-[10px]">{isAr ? 'شروط' : 'Conditions'}</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-[10px]">{isAr ? 'متقدم' : 'Advanced'}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs">{isAr ? 'اسم سير العمل' : 'Workflow Name'} *</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" placeholder="e.g. High Value PO Approval" />
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                    <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="text-xs min-h-[60px]" />
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'نوع المستند' : 'Document Type'} *</Label>
                    <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{isAr ? d.labelAr : d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الأولوية' : 'Priority'}</Label>
                    <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{isAr ? p.labelAr : p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'التصنيف' : 'Category'}</Label>
                    <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="h-8 text-xs" placeholder="e.g. Finance, Operations" />
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'SLA (ساعات)' : 'SLA (Hours)'}</Label>
                    <Input type="number" value={form.sla_hours} onChange={e => setForm(p => ({ ...p, sla_hours: e.target.value }))} className="h-8 text-xs" placeholder="e.g. 48" />
                  </div>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{isAr ? 'الحد الأدنى' : 'Min Amount'}</Label>
                      <Input type="number" value={form.min_amount} onChange={e => setForm(p => ({ ...p, min_amount: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'الحد الأقصى' : 'Max Amount'}</Label>
                      <Input type="number" value={form.max_amount} onChange={e => setForm(p => ({ ...p, max_amount: e.target.value }))} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{isAr ? 'فعال من' : 'Effective From'}</Label>
                      <Input type="date" value={form.effective_from} onChange={e => setForm(p => ({ ...p, effective_from: e.target.value }))} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'فعال إلى' : 'Effective To'}</Label>
                      <Input type="date" value={form.effective_to} onChange={e => setForm(p => ({ ...p, effective_to: e.target.value }))} className="h-8 text-xs" />
                    </div>
                  </div>
                  <Separator />
                  <ConditionBuilder conditions={form.conditions} onChange={c => setForm(p => ({ ...p, conditions: c }))} isAr={isAr} />
                </TabsContent>

                <TabsContent value="advanced" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">{isAr ? 'السماح بالتعديل أثناء الموافقة' : 'Allow Edit During Approval'}</Label>
                      <p className="text-[10px] text-muted-foreground">{isAr ? 'يمكن تعديل المستند أثناء الموافقة' : 'Document can be edited while in approval'}</p>
                    </div>
                    <Switch checked={form.allow_edit_during_approval} onCheckedChange={v => setForm(p => ({ ...p, allow_edit_during_approval: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">{isAr ? 'تفعيل التعليقات' : 'Enable Comments'}</Label>
                      <p className="text-[10px] text-muted-foreground">{isAr ? 'السماح للموافقين بالتعليق' : 'Allow approvers to add comments'}</p>
                    </div>
                    <Switch checked={form.enable_comments} onCheckedChange={v => setForm(p => ({ ...p, enable_comments: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">{isAr ? 'قفل بعد الموافقة' : 'Lock After Approval'}</Label>
                      <p className="text-[10px] text-muted-foreground">{isAr ? 'منع التعديل بعد الموافقة' : 'Prevent editing after approval'}</p>
                    </div>
                    <Switch checked={form.lock_after_approval} onCheckedChange={v => setForm(p => ({ ...p, lock_after_approval: v }))} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Stages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  {isAr ? 'مراحل الموافقة' : 'Approval Stages'} ({sortedStages.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addStage} disabled={!template?.id} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> {isAr ? 'إضافة مرحلة' : 'Add Stage'}
                </Button>
              </div>
              {!template?.id && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {isAr ? 'احفظ سير العمل أولاً لإضافة مراحل' : 'Save the workflow first to add stages'}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh]">
                {sortedStages.length > 0 ? (
                  <div className="space-y-2">
                    {sortedStages.map((stage, index) => (
                      <div key={stage.id}>
                        <StageCard
                          stage={stage}
                          index={index}
                          total={sortedStages.length}
                          users={users}
                          expanded={expandedStage === stage.id}
                          onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                          onSave={onSaveStage}
                          onDelete={() => onDeleteStage(stage.id)}
                          isAr={isAr}
                        />
                        {index < sortedStages.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{isAr ? 'لا توجد مراحل. أضف مرحلة للبدء.' : 'No stages yet. Add a stage to get started.'}</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
