import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Shield, Users, Lock, Eye, Edit, Plus, Check, X, Save, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemRole {
  id: string;
  role_key: string;
  description: string | null;
  description_ar: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

const roleColorMap: Record<string, string> = {
  'admin': 'bg-destructive/10 text-destructive',
  'manager': 'bg-primary/10 text-primary',
  'sales_rep': 'bg-info/10 text-info',
  'user': 'bg-muted text-muted-foreground',
};

const modules = [
  { key: 'dashboard', name: 'Dashboard', nameAr: 'لوحة التحكم', group: 'Main' },
  { key: 'leads', name: 'Leads', nameAr: 'العملاء المحتملون', group: 'CRM' },
  { key: 'opportunities', name: 'Opportunities', nameAr: 'الفرص', group: 'CRM' },
  { key: 'activities', name: 'Activities', nameAr: 'الأنشطة', group: 'CRM' },
  { key: 'tasks', name: 'Tasks', nameAr: 'المهام', group: 'CRM' },
  { key: 'visits', name: 'Visits', nameAr: 'الزيارات', group: 'CRM' },
  { key: 'visitAnalytics', name: 'Visit Analytics', nameAr: 'تحليلات الزيارات', group: 'CRM' },
  { key: 'businessPartners', name: 'Business Partners', nameAr: 'الشركاء التجاريون', group: 'Master Data' },
  { key: 'items', name: 'Items', nameAr: 'الأصناف', group: 'Master Data' },
  { key: 'quotes', name: 'Quotes', nameAr: 'عروض الأسعار', group: 'Transactions' },
  { key: 'salesOrders', name: 'Sales Orders', nameAr: 'أوامر البيع', group: 'Transactions' },
  { key: 'arInvoices', name: 'AR Invoices', nameAr: 'فواتير العملاء', group: 'Transactions' },
  { key: 'incomingPayments', name: 'Incoming Payments', nameAr: 'المدفوعات الواردة', group: 'Transactions' },
  { key: 'materialRequests', name: 'Material Requests', nameAr: 'طلبات المواد', group: 'Transactions' },
  { key: 'financeOverview', name: 'Finance Overview', nameAr: 'نظرة عامة المالية', group: 'Finance' },
  { key: 'financeGates', name: 'Finance Gates', nameAr: 'البوابات المالية', group: 'Finance' },
  { key: 'hrDashboard', name: 'HR Dashboard', nameAr: 'لوحة الموارد البشرية', group: 'HR' },
  { key: 'employees', name: 'Employees', nameAr: 'الموظفون', group: 'HR' },
  { key: 'departments', name: 'Departments', nameAr: 'الأقسام', group: 'HR' },
  { key: 'positions', name: 'Positions', nameAr: 'المناصب', group: 'HR' },
  { key: 'leaveManagement', name: 'Leave Management', nameAr: 'إدارة الإجازات', group: 'HR' },
  { key: 'attendance', name: 'Attendance', nameAr: 'الحضور', group: 'HR' },
  { key: 'payroll', name: 'Payroll', nameAr: 'الرواتب', group: 'HR' },
  { key: 'performance', name: 'Performance', nameAr: 'الأداء', group: 'HR' },
  { key: 'technicalAssessment', name: 'Technical Assessment', nameAr: 'التقييم الفني', group: 'Industry' },
  { key: 'designCosting', name: 'Design & Costing', nameAr: 'التصميم والتكلفة', group: 'Industry' },
  { key: 'manufacturing', name: 'Manufacturing', nameAr: 'التصنيع', group: 'Industry' },
  { key: 'deliveryInstallation', name: 'Delivery & Installation', nameAr: 'التسليم والتركيب', group: 'Industry' },
  { key: 'projects', name: 'Projects', nameAr: 'المشاريع', group: 'Industry' },
  { key: 'targets', name: 'Targets', nameAr: 'الأهداف', group: 'Other' },
  { key: 'assets', name: 'Assets', nameAr: 'الأصول', group: 'Other' },
  { key: 'itService', name: 'IT Service', nameAr: 'خدمات تكنولوجيا المعلومات', group: 'Other' },
  { key: 'reports', name: 'Reports', nameAr: 'التقارير', group: 'Other' },
  { key: 'adminPanel', name: 'Admin Panel', nameAr: 'لوحة الإدارة', group: 'Settings' },
  { key: 'adminSettings', name: 'Admin Settings', nameAr: 'إعدادات الإدارة', group: 'Settings' },
  { key: 'users', name: 'Users', nameAr: 'المستخدمون', group: 'Settings' },
  { key: 'workflow', name: 'Workflow', nameAr: 'سير العمل', group: 'Settings' },
  { key: 'mrWorkflow', name: 'MR Workflow', nameAr: 'سير عمل طلبات المواد', group: 'Settings' },
  { key: 'authorization', name: 'Authorization', nameAr: 'التفويض', group: 'Settings' },
  { key: 'sapIntegration', name: 'SAP Integration', nameAr: 'تكامل SAP', group: 'Settings' },
  { key: 'whatsappSettings', name: 'WhatsApp Settings', nameAr: 'إعدادات واتساب', group: 'Settings' },
];

const allModuleKeys = modules.map(m => m.key);

type PermSet = { view: boolean; create: boolean; edit: boolean; delete: boolean };
type RolePerms = Record<string, PermSet>;

const makeAllTrue = (): RolePerms => Object.fromEntries(allModuleKeys.map(k => [k, { view: true, create: true, edit: true, delete: true }]));
const makeDefaultPerms = (): RolePerms => Object.fromEntries(allModuleKeys.map(k => [k, { view: false, create: false, edit: false, delete: false }]));

const groupNames: Record<string, string> = {
  Main: 'الرئيسية', CRM: 'إدارة العملاء', 'Master Data': 'البيانات الرئيسية',
  Transactions: 'المعاملات', Finance: 'المالية', HR: 'الموارد البشرية',
  Industry: 'الوحدة الصناعية', Other: 'أخرى', Settings: 'الإعدادات',
};

export default function Authorization() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, RolePerms>>({});
  const [selectedRole, setSelectedRole] = useState('');

  // Fetch roles
  const { data: systemRolesData = [] } = useQuery({
    queryKey: ['system-roles-auth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as SystemRole[];
    },
  });

  // Fetch user counts
  const { data: allUserRoles = [] } = useQuery({
    queryKey: ['all-user-roles-auth'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
  });

  // Fetch saved permissions from DB
  const { data: savedPermissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      return data;
    },
    refetchOnMount: 'always' as const,
  });

  const rolesData = useMemo(() => {
    return systemRolesData.map(sr => ({
      id: sr.id,
      name: sr.role_key,
      nameAr: sr.description_ar || sr.role_key,
      systemRole: sr.role_key,
      description: sr.description || sr.role_key,
      usersCount: allUserRoles.filter(ur => ur.role === sr.role_key).length,
      color: roleColorMap[sr.role_key] || 'bg-muted text-muted-foreground',
    }));
  }, [systemRolesData, allUserRoles]);

  // Build permissions from DB data
  useEffect(() => {
    if (!rolesData.length) return;
    const built: Record<string, RolePerms> = {};
    for (const role of rolesData) {
      if (role.systemRole === 'admin') {
        built[role.name] = makeAllTrue();
      } else {
        const base = makeDefaultPerms();
        const roleRows = savedPermissions.filter(r => r.role_key === role.name);
        for (const row of roleRows) {
          if (base[row.module_key]) {
            base[row.module_key] = {
              view: row.can_view,
              create: row.can_create,
              edit: row.can_edit,
              delete: row.can_delete,
            };
          }
        }
        built[role.name] = base;
      }
    }
    setPermissions(built);
    setHasChanges(false);
  }, [rolesData, savedPermissions]);

  const effectiveSelectedRole = selectedRole || (rolesData.length > 0 ? rolesData[0].name : '');
  const selectedRoleData = rolesData.find(r => r.name === effectiveSelectedRole);
  const isAdminRole = selectedRoleData?.systemRole === 'admin';

  const handlePermissionChange = (moduleKey: string, permType: keyof PermSet, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [effectiveSelectedRole]: {
        ...prev[effectiveSelectedRole],
        [moduleKey]: {
          ...prev[effectiveSelectedRole]?.[moduleKey],
          [permType]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSelectAll = (permType: keyof PermSet) => {
    const rolePerms = permissions[effectiveSelectedRole] || {};
    const allChecked = allModuleKeys.every(k => rolePerms[k]?.[permType]);
    const newValue = !allChecked;
    const updated = { ...rolePerms };
    for (const key of allModuleKeys) {
      updated[key] = {
        ...updated[key],
        [permType]: newValue,
        ...(permType === 'view' && !newValue ? { create: false, edit: false, delete: false } : {}),
        ...(permType !== 'view' && newValue ? { view: true } : {}),
      };
    }
    setPermissions(prev => ({ ...prev, [effectiveSelectedRole]: updated }));
    setHasChanges(true);
  };

  const isAllChecked = (permType: keyof PermSet) => {
    const rolePerms = permissions[effectiveSelectedRole] || {};
    return allModuleKeys.every(k => rolePerms[k]?.[permType]);
  };

  // Save mutation - upsert all permissions for the selected role
  const saveMutation = useMutation({
    mutationFn: async () => {
      const rolePerms = permissions[effectiveSelectedRole];
      if (!rolePerms || isAdminRole) return;

      const rows = allModuleKeys.map(moduleKey => ({
        role_key: effectiveSelectedRole,
        module_key: moduleKey,
        can_view: rolePerms[moduleKey]?.view ?? false,
        can_create: rolePerms[moduleKey]?.create ?? false,
        can_edit: rolePerms[moduleKey]?.edit ?? false,
        can_delete: rolePerms[moduleKey]?.delete ?? false,
      }));

      const { error } = await supabase
        .from('role_permissions')
        .upsert(rows, { onConflict: 'role_key,module_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully',
      });
      setHasChanges(false);
    },
    onError: (err: any) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'إدارة التفويض' : 'Authorization Management'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تكوين صلاحيات الأدوار والوصول للوحدات' : 'Configure role permissions and module access'}
          </p>
        </div>
        {hasChanges && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {rolesData.map((role) => (
          <Card
            key={role.id}
            className={`cursor-pointer transition-all ${effectiveSelectedRole === role.name ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedRole(role.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <Badge className={role.color}>{language === 'ar' ? role.nameAr : role.name}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{role.systemRole}</p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{role.usersCount} {language === 'ar' ? 'مستخدم' : 'users'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {language === 'ar' ? 'صلاحيات الدور:' : 'Role Permissions:'} {effectiveSelectedRole}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تحديد صلاحيات الوصول لكل وحدة' : 'Set access permissions for each module'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPerms ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{language === 'ar' ? 'الوحدة' : 'Module'}</TableHead>
                    {(['view', 'create', 'edit', 'delete'] as const).map(perm => {
                      const icons = { view: Eye, create: Plus, edit: Edit, delete: X };
                      const labels = {
                        view: language === 'ar' ? 'عرض' : 'View',
                        create: language === 'ar' ? 'إنشاء' : 'Create',
                        edit: language === 'ar' ? 'تعديل' : 'Edit',
                        delete: language === 'ar' ? 'حذف' : 'Delete',
                      };
                      const Icon = icons[perm];
                      return (
                        <TableHead key={perm} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <Icon className="h-4 w-4" />
                              {labels[perm]}
                            </div>
                            <Checkbox
                              checked={isAllChecked(perm)}
                              onCheckedChange={() => handleSelectAll(perm)}
                              disabled={isAdminRole}
                              aria-label={`Select all ${perm}`}
                            />
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let lastGroup = '';
                    return modules.map((module) => {
                      const modulePerms = permissions[effectiveSelectedRole]?.[module.key] || { view: false, create: false, edit: false, delete: false };
                      const showGroupHeader = module.group !== lastGroup;
                      if (showGroupHeader) lastGroup = module.group;
                      return (
                        <>
                          {showGroupHeader && (
                            <TableRow key={`group-${module.group}`} className="bg-muted/50">
                              <TableCell colSpan={5} className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-2">
                                {language === 'ar' ? groupNames[module.group] || module.group : module.group}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow key={module.key}>
                            <TableCell className="font-medium ltr:pl-6 rtl:pr-6">
                              {language === 'ar' ? module.nameAr : module.name}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={modulePerms.view} onCheckedChange={(c) => handlePermissionChange(module.key, 'view', c)} disabled={isAdminRole} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={modulePerms.create} onCheckedChange={(c) => handlePermissionChange(module.key, 'create', c)} disabled={isAdminRole || !modulePerms.view} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={modulePerms.edit} onCheckedChange={(c) => handlePermissionChange(module.key, 'edit', c)} disabled={isAdminRole || !modulePerms.view} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch checked={modulePerms.delete} onCheckedChange={(c) => handlePermissionChange(module.key, 'delete', c)} disabled={isAdminRole || !modulePerms.view} />
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span><strong>{language === 'ar' ? 'عرض:' : 'View:'}</strong> {language === 'ar' ? 'يمكن رؤية البيانات' : 'Can see the data'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span><strong>{language === 'ar' ? 'إنشاء:' : 'Create:'}</strong> {language === 'ar' ? 'يمكن إضافة سجلات جديدة' : 'Can add new records'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-muted-foreground" />
              <span><strong>{language === 'ar' ? 'تعديل:' : 'Edit:'}</strong> {language === 'ar' ? 'يمكن تعديل السجلات' : 'Can modify records'}</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground" />
              <span><strong>{language === 'ar' ? 'حذف:' : 'Delete:'}</strong> {language === 'ar' ? 'يمكن حذف السجلات' : 'Can remove records'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
