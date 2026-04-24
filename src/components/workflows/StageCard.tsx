import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown, ChevronUp, Trash2, Save, Users, Clock, Bell,
  Shield, GitBranch, AlertTriangle, GripVertical,
} from 'lucide-react';
import { APPROVAL_LOGIC_OPTIONS, REJECTION_ACTIONS, APPROVER_TYPES } from './workflowConstants';
import { cn } from '@/lib/utils';

interface StageCardProps {
  stage: any;
  index: number;
  total: number;
  users: any[];
  expanded: boolean;
  onToggle: () => void;
  onSave: (stage: any) => void;
  onDelete: () => void;
  isAr: boolean;
}

export default function StageCard({ stage, index, total, users, expanded, onToggle, onSave, onDelete, isAr }: StageCardProps) {
  const [form, setForm] = useState({
    stage_name: stage.stage_name || '',
    description: stage.description || '',
    approver_type: stage.approver_type || 'role',
    approver_role: stage.approver_role || '',
    approver_user_id: stage.approver_user_id || '',
    approval_logic: stage.approval_logic || 'all',
    approval_percentage: stage.approval_percentage || '',
    required_approvals: stage.required_approvals || '',
    time_limit_hours: stage.time_limit_hours || '',
    escalation_role: stage.escalation_role || '',
    rejection_action: stage.rejection_action || 'return_creator',
    rejection_target_stage: stage.rejection_target_stage || '',
    auto_approve_below: stage.auto_approve_below || '',
    can_reject: stage.can_reject ?? true,
    is_parallel: stage.is_parallel ?? false,
    allow_delegation: stage.allow_delegation ?? true,
    backup_approver_role: stage.backup_approver_role || '',
    notification_settings: stage.notification_settings || { email: true, push: true, reminder_hours: 24 },
  });

  useEffect(() => {
    setForm({
      stage_name: stage.stage_name || '',
      description: stage.description || '',
      approver_type: stage.approver_type || 'role',
      approver_role: stage.approver_role || '',
      approver_user_id: stage.approver_user_id || '',
      approval_logic: stage.approval_logic || 'all',
      approval_percentage: stage.approval_percentage || '',
      required_approvals: stage.required_approvals || '',
      time_limit_hours: stage.time_limit_hours || '',
      escalation_role: stage.escalation_role || '',
      rejection_action: stage.rejection_action || 'return_creator',
      rejection_target_stage: stage.rejection_target_stage || '',
      auto_approve_below: stage.auto_approve_below || '',
      can_reject: stage.can_reject ?? true,
      is_parallel: stage.is_parallel ?? false,
      allow_delegation: stage.allow_delegation ?? true,
      backup_approver_role: stage.backup_approver_role || '',
      notification_settings: stage.notification_settings || { email: true, push: true, reminder_hours: 24 },
    });
  }, [stage]);

  const handleSave = () => {
    onSave({
      id: stage.id,
      template_id: stage.template_id,
      stage_order: stage.stage_order,
      stage_name: form.stage_name,
      description: form.description || null,
      approver_type: form.approver_type,
      approver_role: form.approver_role || null,
      approver_user_id: form.approver_user_id || null,
      approval_logic: form.approval_logic,
      approval_percentage: form.approval_percentage ? Number(form.approval_percentage) : null,
      required_approvals: form.required_approvals ? Number(form.required_approvals) : null,
      time_limit_hours: form.time_limit_hours ? Number(form.time_limit_hours) : null,
      escalation_role: form.escalation_role || null,
      rejection_action: form.rejection_action,
      rejection_target_stage: form.rejection_target_stage ? Number(form.rejection_target_stage) : null,
      auto_approve_below: form.auto_approve_below ? Number(form.auto_approve_below) : null,
      can_reject: form.can_reject,
      is_parallel: form.is_parallel,
      allow_delegation: form.allow_delegation,
      backup_approver_role: form.backup_approver_role || null,
      notification_settings: form.notification_settings,
    });
  };

  const logicLabel = APPROVAL_LOGIC_OPTIONS.find(l => l.value === form.approval_logic);

  return (
    <Card className={cn('transition-all', expanded && 'ring-1 ring-primary/30')}>
      <CardContent className="p-3">
        {/* Collapsed Header */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {index + 1}/{total}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{form.stage_name || `Stage ${index + 1}`}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="secondary" className="text-[9px]">{isAr ? logicLabel?.labelAr : logicLabel?.label}</Badge>
              <Badge variant="secondary" className="text-[9px]">
                {APPROVER_TYPES.find(t => t.value === form.approver_type)?.[isAr ? 'labelAr' : 'label']}
              </Badge>
              {form.is_parallel && <Badge variant="secondary" className="text-[9px]">⇉ Parallel</Badge>}
              {form.time_limit_hours && <Badge variant="secondary" className="text-[9px]"><Clock className="h-2 w-2 mr-0.5" />{form.time_limit_hours}h</Badge>}
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>

        {/* Expanded Form */}
        {expanded && (
          <div className="mt-3 space-y-3 pt-3 border-t">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">{isAr ? 'اسم المرحلة' : 'Stage Name'} *</Label>
                <Input value={form.stage_name} onChange={e => setForm(p => ({ ...p, stage_name: e.target.value }))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">{isAr ? 'نوع الموافق' : 'Approver Type'}</Label>
                <Select value={form.approver_type} onValueChange={v => setForm(p => ({ ...p, approver_type: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPROVER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{isAr ? t.labelAr : t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[10px]">{isAr ? 'الوصف' : 'Description'}</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="text-xs min-h-[40px]" />
            </div>

            {/* Approver Config */}
            {form.approver_type === 'role' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">{isAr ? 'الدور' : 'Role'}</Label>
                  <Input value={form.approver_role} onChange={e => setForm(p => ({ ...p, approver_role: e.target.value }))} className="h-7 text-xs" placeholder="e.g. Finance Manager" />
                </div>
                <div>
                  <Label className="text-[10px]">{isAr ? 'دور احتياطي' : 'Backup Role'}</Label>
                  <Input value={form.backup_approver_role} onChange={e => setForm(p => ({ ...p, backup_approver_role: e.target.value }))} className="h-7 text-xs" placeholder="e.g. CFO" />
                </div>
              </div>
            )}
            {form.approver_type === 'user' && (
              <div>
                <Label className="text-[10px]">{isAr ? 'المستخدم' : 'User'}</Label>
                <Select value={form.approver_user_id} onValueChange={v => setForm(p => ({ ...p, approver_user_id: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={isAr ? 'اختر مستخدم' : 'Select user'} /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.user_id || u.id} value={u.user_id || u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Approval Logic */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">{isAr ? 'منطق الموافقة' : 'Approval Logic'}</Label>
                <Select value={form.approval_logic} onValueChange={v => setForm(p => ({ ...p, approval_logic: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPROVAL_LOGIC_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{isAr ? l.labelAr : l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.approval_logic === 'custom_percentage' && (
                <div>
                  <Label className="text-[10px]">{isAr ? 'النسبة المطلوبة' : 'Required %'}</Label>
                  <Input type="number" min="1" max="100" value={form.approval_percentage} onChange={e => setForm(p => ({ ...p, approval_percentage: e.target.value }))} className="h-7 text-xs" placeholder="e.g. 75" />
                </div>
              )}
            </div>

            {/* Time & Escalation */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">{isAr ? 'الحد الزمني (ساعات)' : 'Time Limit (Hours)'}</Label>
                <Input type="number" value={form.time_limit_hours} onChange={e => setForm(p => ({ ...p, time_limit_hours: e.target.value }))} className="h-7 text-xs" placeholder="e.g. 24" />
              </div>
              <div>
                <Label className="text-[10px]">{isAr ? 'التصعيد إلى' : 'Escalate To'}</Label>
                <Input value={form.escalation_role} onChange={e => setForm(p => ({ ...p, escalation_role: e.target.value }))} className="h-7 text-xs" placeholder="e.g. Director" />
              </div>
            </div>

            {/* Rejection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">{isAr ? 'إجراء الرفض' : 'Rejection Action'}</Label>
                <Select value={form.rejection_action} onValueChange={v => setForm(p => ({ ...p, rejection_action: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REJECTION_ACTIONS.map(r => <SelectItem key={r.value} value={r.value}>{isAr ? r.labelAr : r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">{isAr ? 'الموافقة التلقائية أقل من' : 'Auto-approve Below'}</Label>
                <Input type="number" value={form.auto_approve_below} onChange={e => setForm(p => ({ ...p, auto_approve_below: e.target.value }))} className="h-7 text-xs" placeholder="Amount" />
              </div>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">{isAr ? 'يمكن الرفض' : 'Can Reject'}</Label>
                <Switch checked={form.can_reject} onCheckedChange={v => setForm(p => ({ ...p, can_reject: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">{isAr ? 'متوازي' : 'Parallel'}</Label>
                <Switch checked={form.is_parallel} onCheckedChange={v => setForm(p => ({ ...p, is_parallel: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">{isAr ? 'السماح بالتفويض' : 'Allow Delegation'}</Label>
                <Switch checked={form.allow_delegation} onCheckedChange={v => setForm(p => ({ ...p, allow_delegation: v }))} />
              </div>
            </div>

            {/* Notifications */}
            <div className="p-2 bg-muted/50 rounded-md space-y-2">
              <Label className="text-[10px] flex items-center gap-1"><Bell className="h-3 w-3" />{isAr ? 'الإشعارات' : 'Notifications'}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1">
                  <Switch checked={form.notification_settings.email} onCheckedChange={v => setForm(p => ({ ...p, notification_settings: { ...p.notification_settings, email: v } }))} />
                  <span className="text-[10px]">Email</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={form.notification_settings.push} onCheckedChange={v => setForm(p => ({ ...p, notification_settings: { ...p.notification_settings, push: v } }))} />
                  <span className="text-[10px]">Push</span>
                </div>
                <div>
                  <Input type="number" value={form.notification_settings.reminder_hours} onChange={e => setForm(p => ({ ...p, notification_settings: { ...p.notification_settings, reminder_hours: Number(e.target.value) } }))} className="h-6 text-[10px]" placeholder="Reminder hrs" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onDelete}>
                <Trash2 className="h-3 w-3 mr-1" />{isAr ? 'حذف' : 'Delete'}
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" />{isAr ? 'حفظ المرحلة' : 'Save Stage'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
