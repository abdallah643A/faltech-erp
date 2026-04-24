import { useState } from 'react';
import SecuritySettings from '@/components/settings/SecuritySettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Building2, Shield, ShieldCheck } from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

interface UserDepartment {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function UserConfig() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Department state
  const [deptOpen, setDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<UserDepartment | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', name_ar: '', sort_order: '0' });

  // System role state
  const [sysRoleOpen, setSysRoleOpen] = useState(false);
  const [editingSysRole, setEditingSysRole] = useState<{ id: string; role_key: string; description: string | null; description_ar: string | null; is_active: boolean; is_system: boolean; sort_order: number } | null>(null);
  const [sysRoleForm, setSysRoleForm] = useState({ role_key: '', description: '', description_ar: '', sort_order: '0' });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['user-departments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_departments')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as UserDepartment[];
    },
  });

  // Fetch all system roles (including inactive for management)
  const { data: systemRoles = [] } = useQuery({
    queryKey: ['system-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as { id: string; role_key: string; description: string | null; description_ar: string | null; is_active: boolean; is_system: boolean; sort_order: number }[];
    },
  });

  // Department mutations
  const createDept = useMutation({
    mutationFn: async (d: { name: string; name_ar: string | null; sort_order: number }) => {
      const { error } = await supabase.from('user_departments').insert([d]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-departments-all'] }); queryClient.invalidateQueries({ queryKey: ['user-departments'] }); setDeptOpen(false); toast({ title: isAr ? 'تم الإنشاء' : 'Department created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDept = useMutation({
    mutationFn: async ({ id, ...d }: { id: string; name?: string; name_ar?: string | null; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('user_departments').update(d).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-departments-all'] }); queryClient.invalidateQueries({ queryKey: ['user-departments'] }); setDeptOpen(false); toast({ title: isAr ? 'تم التحديث' : 'Department updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteDept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-departments-all'] }); queryClient.invalidateQueries({ queryKey: ['user-departments'] }); toast({ title: isAr ? 'تم الحذف' : 'Department deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // System role mutations
  const createSysRole = useMutation({
    mutationFn: async (d: { role_key: string; description: string | null; description_ar: string | null; sort_order: number }) => {
      const { error } = await supabase.from('system_roles').insert([d]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-roles'] }); setSysRoleOpen(false); toast({ title: isAr ? 'تم الإنشاء' : 'Role created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSysRole = useMutation({
    mutationFn: async ({ id, ...d }: { id: string; role_key?: string; description?: string | null; description_ar?: string | null; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('system_roles').update(d).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-roles'] }); setSysRoleOpen(false); toast({ title: isAr ? 'تم التحديث' : 'Role updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteSysRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-roles'] }); toast({ title: isAr ? 'تم الحذف' : 'Role deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openDeptDialog = (dept?: UserDepartment) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ name: dept.name, name_ar: dept.name_ar || '', sort_order: String(dept.sort_order) });
    } else {
      setEditingDept(null);
      setDeptForm({ name: '', name_ar: '', sort_order: '0' });
    }
    setDeptOpen(true);
  };

  const openSysRoleDialog = (sr?: typeof editingSysRole) => {
    if (sr) {
      setEditingSysRole(sr);
      setSysRoleForm({ role_key: sr.role_key, description: sr.description || '', description_ar: sr.description_ar || '', sort_order: String(sr.sort_order) });
    } else {
      setEditingSysRole(null);
      setSysRoleForm({ role_key: '', description: '', description_ar: '', sort_order: '0' });
    }
    setSysRoleOpen(true);
  };

  const handleSaveDept = () => {
    if (!deptForm.name) return;
    const payload = { name: deptForm.name, name_ar: deptForm.name_ar || null, sort_order: parseInt(deptForm.sort_order) || 0 };
    if (editingDept) {
      updateDept.mutate({ id: editingDept.id, ...payload });
    } else {
      createDept.mutate(payload);
    }
  };

  const handleSaveSysRole = () => {
    if (!sysRoleForm.role_key) return;
    const payload = { role_key: sysRoleForm.role_key, description: sysRoleForm.description || null, description_ar: sysRoleForm.description_ar || null, sort_order: parseInt(sysRoleForm.sort_order) || 0 };
    if (editingSysRole) {
      updateSysRole.mutate({ id: editingSysRole.id, ...payload });
    } else {
      createSysRole.mutate(payload);
    }
  };

  const deptColumns: ColumnDef[] = [
    { key: 'name', header: 'Name' },
    { key: 'name_ar', header: 'Name (AR)' },
    { key: 'is_active', header: 'Active' },
    { key: 'sort_order', header: 'Sort Order' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isAr ? 'إعداد المستخدمين' : 'User Configuration'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'إدارة الأقسام والأدوار المتاحة للمستخدمين' : 'Manage departments and roles available for users'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={departments} columns={deptColumns} filename="user-config" title="User Configuration" />
          <SAPSyncButton entity="business_partner" />
        </div>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            {isAr ? 'الأقسام' : 'Departments'}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            {isAr ? 'الأدوار' : 'Roles'}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            {isAr ? 'الأمان' : 'Security'}
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? 'الأقسام' : 'Departments'}</CardTitle>
              <Button onClick={() => openDeptDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {isAr ? 'قسم جديد' : 'New Department'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
                    <TableHead>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
                    <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.name_ar || '-'}</TableCell>
                      <TableCell>{dept.sort_order}</TableCell>
                      <TableCell>
                        <Switch checked={dept.is_active} onCheckedChange={checked => updateDept.mutate({ id: dept.id, is_active: checked })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDeptDialog(dept)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDept.mutate(dept.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAr ? 'الأدوار' : 'Roles'}</CardTitle>
              <Button onClick={() => openSysRoleDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {isAr ? 'دور جديد' : 'New Role'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'مفتاح الدور' : 'Role Key'}</TableHead>
                    <TableHead>{isAr ? 'الوصف (EN)' : 'Description (EN)'}</TableHead>
                    <TableHead>{isAr ? 'الوصف (AR)' : 'Description (AR)'}</TableHead>
                    <TableHead>{isAr ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead>{isAr ? 'نشط' : 'Active'}</TableHead>
                    <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemRoles.map(sr => (
                    <TableRow key={sr.id}>
                      <TableCell className="font-mono text-sm">{sr.role_key}</TableCell>
                      <TableCell>{sr.description || '-'}</TableCell>
                      <TableCell>{sr.description_ar || '-'}</TableCell>
                      <TableCell>{sr.sort_order}</TableCell>
                      <TableCell>
                        <Switch checked={sr.is_active} onCheckedChange={checked => updateSysRole.mutate({ id: sr.id, is_active: checked })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openSysRoleDialog(sr)}><Pencil className="h-4 w-4" /></Button>
                          {!sr.is_system && (
                            <Button variant="ghost" size="icon" onClick={() => deleteSysRole.mutate(sr.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? (isAr ? 'تعديل القسم' : 'Edit Department') : (isAr ? 'قسم جديد' : 'New Department')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (English)' : 'Name (English)'}</Label>
              <Input value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label>
              <Input value={deptForm.name_ar} onChange={e => setDeptForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label>
              <Input type="number" value={deptForm.sort_order} onChange={e => setDeptForm(p => ({ ...p, sort_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveDept}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={sysRoleOpen} onOpenChange={setSysRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSysRole ? (isAr ? 'تعديل الدور' : 'Edit Role') : (isAr ? 'دور جديد' : 'New Role')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'مفتاح الدور' : 'Role Key'}</Label>
              <Input
                value={sysRoleForm.role_key}
                onChange={e => setSysRoleForm(p => ({ ...p, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. finance_manager"
                disabled={!!editingSysRole?.is_system}
              />
              <p className="text-xs text-muted-foreground">
                {isAr ? 'معرف فريد للدور (أحرف صغيرة وشرطة سفلية)' : 'Unique role identifier (lowercase with underscores)'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الوصف (English)' : 'Description (English)'}</Label>
              <Input value={sysRoleForm.description} onChange={e => setSysRoleForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الوصف (العربية)' : 'Description (Arabic)'}</Label>
              <Input value={sysRoleForm.description_ar} onChange={e => setSysRoleForm(p => ({ ...p, description_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الترتيب' : 'Sort Order'}</Label>
              <Input type="number" value={sysRoleForm.sort_order} onChange={e => setSysRoleForm(p => ({ ...p, sort_order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSysRoleOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveSysRole}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
