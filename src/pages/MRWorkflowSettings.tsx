import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Settings, UserPlus, Trash2, ArrowLeft } from 'lucide-react';
import { useMRWorkflowSettings, useMRApprovers, MRWorkflowSetting } from '@/hooks/useMRWorkflow';
import { useUsers } from '@/hooks/useUsers';
import { useNavigate } from 'react-router-dom';

export default function MRWorkflowSettings() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { settings, isLoading, updateSetting } = useMRWorkflowSettings();
  const { approvers, addApprover, removeApprover } = useMRApprovers();
  const { users } = useUsers();

  const [editingSetting, setEditingSetting] = useState<MRWorkflowSetting | null>(null);
  const [isAddApproverOpen, setIsAddApproverOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleUpdateSetting = (setting: MRWorkflowSetting) => {
    updateSetting.mutate(setting);
    setEditingSetting(null);
  };

  const handleAddApprover = () => {
    const selectedUser = users?.find(u => u.id === selectedUserId);
    if (selectedUser) {
      addApprover.mutate({
        approval_level: selectedLevel,
        user_id: selectedUser.id,
        user_name: selectedUser.full_name || selectedUser.email,
        user_email: selectedUser.email,
      });
      setIsAddApproverOpen(false);
      setSelectedUserId('');
    }
  };

  const levelLabels: Record<number, { en: string; ar: string }> = {
    1: { en: 'Level 1 - Department Manager', ar: 'المستوى 1 - مدير القسم' },
    2: { en: 'Level 2 - Finance Manager', ar: 'المستوى 2 - المدير المالي' },
    3: { en: 'Level 3 - General Manager', ar: 'المستوى 3 - المدير العام' },
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'إعدادات سير عمل طلبات المواد' : 'Material Request Workflow Settings'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تكوين مستويات الموافقة والمعتمدين' : 'Configure approval levels and approvers'}
          </p>
        </div>
      </div>

      {/* Approval Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {language === 'ar' ? 'مستويات الموافقة' : 'Approval Levels'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'تكوين متطلبات كل مستوى موافقة' : 'Configure requirements for each approval level'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : (
            <div className="space-y-4">
              {settings?.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{setting.approval_level}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {levelLabels[setting.approval_level]?.[language === 'ar' ? 'ar' : 'en'] || `Level ${setting.approval_level}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {setting.position_title || setting.role_required || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                      {setting.is_active 
                        ? (language === 'ar' ? 'نشط' : 'Active') 
                        : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </Badge>
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={(checked) => 
                        updateSetting.mutate({ ...setting, is_active: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSetting(setting)}
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Designated Approvers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {language === 'ar' ? 'المعتمدون المعينون' : 'Designated Approvers'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'المستخدمون المصرح لهم بالموافقة على كل مستوى' : 'Users authorized to approve at each level'}
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddApproverOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة معتمد' : 'Add Approver'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'المستوى' : 'Level'}</TableHead>
                <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا يوجد معتمدون' : 'No approvers configured'}
                  </TableCell>
                </TableRow>
              ) : (
                approvers?.map((approver) => (
                  <TableRow key={approver.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {language === 'ar' ? `المستوى ${approver.approval_level}` : `Level ${approver.approval_level}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{approver.user_name}</TableCell>
                    <TableCell>{approver.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={approver.is_active ? 'default' : 'secondary'}>
                        {approver.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeApprover.mutate(approver.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Setting Dialog */}
      <Dialog open={!!editingSetting} onOpenChange={() => setEditingSetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تعديل مستوى الموافقة' : 'Edit Approval Level'}
            </DialogTitle>
          </DialogHeader>
          {editingSetting && (
            <div className="space-y-4">
              <div>
                <Label>{language === 'ar' ? 'الدور المطلوب' : 'Required Role'}</Label>
                <Select
                  value={editingSetting.role_required || 'none'}
                  onValueChange={(v) => setEditingSetting({ 
                    ...editingSetting, 
                    role_required: v === 'none' ? null : v as any 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'أي دور' : 'Any Role'}</SelectItem>
                    <SelectItem value="admin">{language === 'ar' ? 'مدير النظام' : 'Admin'}</SelectItem>
                    <SelectItem value="manager">{language === 'ar' ? 'مدير' : 'Manager'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'المسمى الوظيفي' : 'Position Title'}</Label>
                <Input
                  value={editingSetting.position_title || ''}
                  onChange={(e) => setEditingSetting({ ...editingSetting, position_title: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: مدير القسم' : 'e.g., Department Manager'}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
                <Input
                  value={editingSetting.department || ''}
                  onChange={(e) => setEditingSetting({ ...editingSetting, department: e.target.value })}
                  placeholder={language === 'ar' ? 'مثال: المالية' : 'e.g., Finance'}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingSetting.is_active}
                  onCheckedChange={(checked) => setEditingSetting({ ...editingSetting, is_active: checked })}
                />
                <Label>{language === 'ar' ? 'نشط' : 'Active'}</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSetting(null)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={() => handleUpdateSetting(editingSetting)}>
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Approver Dialog */}
      <Dialog open={isAddApproverOpen} onOpenChange={setIsAddApproverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إضافة معتمد' : 'Add Approver'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'مستوى الموافقة' : 'Approval Level'}</Label>
              <Select
                value={selectedLevel.toString()}
                onValueChange={(v) => setSelectedLevel(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{language === 'ar' ? 'المستوى 1' : 'Level 1'}</SelectItem>
                  <SelectItem value="2">{language === 'ar' ? 'المستوى 2' : 'Level 2'}</SelectItem>
                  <SelectItem value="3">{language === 'ar' ? 'المستوى 3' : 'Level 3'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'المستخدم' : 'User'}</Label>
              <Select
                value={selectedUserId || 'none'}
                onValueChange={(v) => setSelectedUserId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر مستخدم' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'اختر...' : 'Select...'}</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddApproverOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleAddApprover} disabled={!selectedUserId}>
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
