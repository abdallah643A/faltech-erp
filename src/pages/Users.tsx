import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserBranchAssignment } from '@/components/users/UserBranchAssignment';
import { UserCompanyAssignment } from '@/components/users/UserCompanyAssignment';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Search,
  Loader2,
  Trash2,
  Lock,
  Minus,
  Maximize2,
  X,
} from 'lucide-react';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  status: string | null;
  avatar_url: string | null;
  created_at: string;
  phone?: string | null;
  mobile?: string | null;
  user_code?: string | null;
  default_series_id?: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'user';
}

interface UserDepartment {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
  sort_order: number;
}

interface SystemRole {
  id: string;
  role_key: string;
  description: string | null;
  description_ar: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

export default function Users() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([]);
  const [addCompanyIds, setAddCompanyIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const { assignCompanies, getUserCompanyAssignments } = useSAPCompanies();
  const [activeTab, setActiveTab] = useState('general');

  const [form, setForm] = useState({
    user_code: '',
    full_name: '',
    email: '',
    phone: '',
    mobile: '',
    fax: '',
    department: '',
    role: 'user',
    status: 'active',
    default_series_id: '',
    default_branch_id: '',
    password_never_expires: true,
    change_password_next_logon: false,
    locked: false,
    superuser: false,
    mobile_user: false,
  });

  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    full_name: '',
    user_code: '',
    department: '',
    role: 'user',
    phone: '',
    mobile: '',
    default_series_id: '',
  });
  const [addBranchIds, setAddBranchIds] = useState<string[]>([]);

  // Queries
  const { data: numberingSeries = [] } = useQuery({
    queryKey: ['numbering-series-bp-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('numbering_series')
        .select('id, series_name, prefix, document_sub_type, series')
        .eq('object_code', '2')
        .order('series');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['user-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as UserDepartment[];
    },
  });

  const { data: systemRoles = [] } = useQuery({
    queryKey: ['system-roles-active'],
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

  // Employees query removed - not used in current form layout

  const getUserRole = (userId: string): string => {
    const userRole = allRoles.find(r => r.user_id === userId);
    return userRole?.role || 'user';
  };

  // Load current user into form
  const currentUser = users[currentIndex];

  useEffect(() => {
    if (currentUser) {
      setForm({
        user_code: (currentUser as any).user_code || '',
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        phone: (currentUser as any).phone || '',
        mobile: (currentUser as any).mobile || '',
        fax: '',
        department: currentUser.department || '',
        role: getUserRole(currentUser.user_id),
        status: currentUser.status || 'active',
        default_series_id: (currentUser as any).default_series_id || '',
        default_branch_id: (currentUser as any).default_branch_id || '',
        password_never_expires: true,
        change_password_next_logon: false,
        locked: currentUser.status === 'inactive',
        superuser: getUserRole(currentUser.user_id) === 'admin',
        mobile_user: false,
      });
      setIsDirty(false);
      // Load branch assignments
      supabase
        .from('user_branch_assignments')
        .select('branch_id')
        .eq('user_id', currentUser.user_id)
        .then(({ data }) => {
          setEditBranchIds(data?.map(d => d.branch_id) || []);
        });
      // Load company assignments
      getUserCompanyAssignments(currentUser.user_id).then(ids => {
        setEditCompanyIds(ids);
      }).catch(() => setEditCompanyIds([]));
    }
  }, [currentIndex, currentUser?.id, allRoles]);

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Mutations
  const saveBranchAssignments = async (userId: string, branchIds: string[]) => {
    await supabase.from('user_branch_assignments').delete().eq('user_id', userId);
    if (branchIds.length > 0) {
      await supabase.from('user_branch_assignments').insert(
        branchIds.map(branch_id => ({ user_id: userId, branch_id }))
      );
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          department: form.department,
          status: form.locked ? 'inactive' : 'active',
          phone: form.phone || null,
          mobile: form.mobile || null,
          user_code: form.user_code || null,
          default_series_id: form.default_series_id || null,
          default_branch_id: form.default_branch_id || null,
        })
        .eq('id', currentUser.id);
      if (error) throw error;

      // Update role
      const currentRole = getUserRole(currentUser.user_id);
      if (form.role !== currentRole) {
        await supabase.from('user_roles').delete().eq('user_id', currentUser.user_id);
        if (form.role && form.role !== 'none') {
          await supabase.from('user_roles').insert({ user_id: currentUser.user_id, role: form.role as any });
        }
      }

      await saveBranchAssignments(currentUser.user_id, editBranchIds);
      await assignCompanies(currentUser.user_id, editCompanyIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      setIsDirty(false);
      toast({ title: language === 'ar' ? 'تم الحفظ' : 'Saved', description: language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof addForm & { branchIds: string[]; companyIds: string[] }) => {
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          department: data.department,
          role: data.role,
          phone: data.phone,
          mobile: data.mobile,
          user_code: data.user_code,
          default_series_id: data.default_series_id || null,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      if (result?.user_id) {
        if (data.branchIds.length > 0) {
          await saveBranchAssignments(result.user_id, data.branchIds);
        }
        if (data.companyIds.length > 0) {
          await assignCompanies(result.user_id, data.companyIds);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      setIsAddDialogOpen(false);
      setAddForm({ email: '', password: '', full_name: '', user_code: '', department: '', role: 'user', phone: '', mobile: '', default_series_id: '' });
      setAddBranchIds([]);
      setAddCompanyIds([]);
      toast({ title: language === 'ar' ? 'تم بنجاح' : 'Success', description: language === 'ar' ? 'تم إضافة المستخدم بنجاح' : 'User created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Navigation
  const goFirst = () => setCurrentIndex(0);
  const goPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goNext = () => setCurrentIndex(Math.min(users.length - 1, currentIndex + 1));
  const goLast = () => setCurrentIndex(users.length - 1);

  // Search
  const filteredSearch = users
    .map((u, i) => ({ ...u, _idx: i }))
    .filter(u =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u as any).user_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const userColumns: ColumnDef[] = [
    { key: 'user_code', header: 'User Code' },
    { key: 'email', header: 'Email' },
    { key: 'full_name', header: 'User Name' },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status' },
  ];

  const exportUsers = users.map(u => ({
    user_code: (u as any).user_code || '',
    email: u.email,
    full_name: u.full_name,
    department: u.department,
    status: u.status,
  }));

  // SAP B1 style field row
  const FieldRow = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`grid grid-cols-[200px_1fr] items-center gap-2 ${className}`}>
      <Label className="text-sm font-normal text-foreground truncate">{label}</Label>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-0 page-enter">
      {/* SAP B1 Title Bar */}
      <div className="flex items-center justify-between bg-[hsl(var(--sidebar-background))] border border-border rounded-t-md px-3 py-1.5">
        <span className="text-sm font-semibold text-foreground">
          {language === 'ar' ? 'المستخدمين - الإعداد' : 'Users - Setup'}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"><Minus className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"><Maximize2 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-muted/50 border-x border-border px-2 py-1">
        <div className="flex items-center gap-0.5 mr-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goFirst} disabled={currentIndex === 0}>
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2 min-w-[60px] text-center">
            {users.length > 0 ? `${currentIndex + 1} / ${users.length}` : '0 / 0'}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext} disabled={currentIndex >= users.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goLast} disabled={currentIndex >= users.length - 1}>
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {language === 'ar' ? 'جديد' : 'Add'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => updateProfileMutation.mutate()}
          disabled={!isDirty || updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {language === 'ar' ? 'حفظ' : 'Update'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsSearchOpen(!isSearchOpen)}>
          <Search className="h-3.5 w-3.5" />
          {language === 'ar' ? 'بحث' : 'Find'}
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <ExportImportButtons data={exportUsers} columns={userColumns} filename="users" title="Users" />
          <SAPSyncButton entity="sap_user" />
          <ClearAllButton tableName="profiles" displayName="Users" queryKeys={['users-profiles-all']} />
        </div>
      </div>

      {/* Search dropdown */}
      {isSearchOpen && (
        <div className="border-x border-border bg-background px-3 py-2">
          <Input
            placeholder={language === 'ar' ? 'ابحث بالاسم أو البريد أو الكود...' : 'Search by name, email, or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm mb-2"
            autoFocus
          />
          {searchQuery && (
            <div className="max-h-[200px] overflow-y-auto border rounded-md">
              {filteredSearch.map(u => (
                <button
                  key={u.id}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-3 border-b last:border-b-0"
                  onClick={() => {
                    setCurrentIndex(u._idx);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="font-medium min-w-[80px]">{(u as any).user_code || '-'}</span>
                  <span>{u.full_name || u.email}</span>
                  <span className="text-muted-foreground ml-auto">{u.email}</span>
                </button>
              ))}
              {filteredSearch.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      {currentUser ? (
        <div className="border border-t-0 border-border rounded-b-md bg-background p-4 space-y-4">
          {/* Superuser & Mobile User checkboxes */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.superuser}
                onCheckedChange={(v) => {
                  updateField('superuser', !!v);
                  if (v) updateField('role', 'admin');
                }}
              />
              <Label className="text-sm">{language === 'ar' ? 'مستخدم متميز' : 'Superuser'}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.mobile_user} onCheckedChange={(v) => updateField('mobile_user', !!v)} />
              <Label className="text-sm">{language === 'ar' ? 'مستخدم جوال' : 'Mobile User'}</Label>
            </div>
          </div>

          {/* Top fields - User Code, User Name, Defaults */}
          <div className="space-y-2 border border-border rounded-md p-3 bg-muted/20">
            <FieldRow label={language === 'ar' ? 'رمز المستخدم' : 'User Code'}>
              <Input
                value={form.user_code}
                onChange={(e) => updateField('user_code', e.target.value)}
                className="h-7 text-sm bg-[hsl(var(--primary)/0.05)] font-medium"
              />
            </FieldRow>
            <FieldRow label={language === 'ar' ? 'اسم المستخدم' : 'User Name'}>
              <Input
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="h-7 text-sm bg-[hsl(var(--primary)/0.05)] font-medium"
              />
            </FieldRow>
            <FieldRow label={language === 'ar' ? 'الافتراضيات' : 'Defaults'}>
              <Select
                value={form.default_series_id || 'none'}
                onValueChange={(v) => updateField('default_series_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {numberingSeries.map(ns => (
                    <SelectItem key={ns.id} value={ns.id}>
                      {ns.prefix ? `${ns.prefix} (${ns.series_name})` : ns.series_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8 bg-muted/50 rounded-none border-b">
              <TabsTrigger value="general" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-none rounded-t-sm">
                {language === 'ar' ? 'عام' : 'General'}
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-none rounded-t-sm">
                {language === 'ar' ? 'الخدمات' : 'Services'}
              </TabsTrigger>
              <TabsTrigger value="display" className="text-xs h-7 px-4 data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-b-0 rounded-none rounded-t-sm">
                {language === 'ar' ? 'العرض' : 'Display'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 border border-t-0 border-border rounded-b-md p-4 space-y-2">
              <FieldRow label={language === 'ar' ? 'الموظف' : 'Employee'}>
                <Select value={form.role} onValueChange={(v) => updateField('role', v)}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {systemRoles.map(sr => (
                      <SelectItem key={sr.id} value={sr.role_key}>
                        {language === 'ar' && sr.description_ar ? sr.description_ar : (sr.description || sr.role_key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'البريد الإلكتروني' : 'E-Mail'}>
                <Input value={form.email} disabled className="h-7 text-sm bg-muted" />
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'هاتف الجوال' : 'Mobile Phone'}>
                <Input
                  value={form.mobile}
                  onChange={(e) => updateField('mobile', e.target.value)}
                  className="h-7 text-sm"
                  placeholder="05xxxxxxxx"
                />
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'الهاتف' : 'Phone'}>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="h-7 text-sm"
                />
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'الفاكس' : 'Fax'}>
                <Input
                  value={form.fax}
                  onChange={(e) => updateField('fax', e.target.value)}
                  className="h-7 text-sm"
                />
              </FieldRow>

              <div className="border-t border-border my-3" />

              <FieldRow label={language === 'ar' ? 'الفرع' : 'Branch'}>
                <div className="w-full">
                  <UserBranchAssignment selectedBranchIds={editBranchIds} onBranchIdsChange={(ids) => { setEditBranchIds(ids); setIsDirty(true); }} />
                </div>
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'الفرع الافتراضي' : 'Default Branch'}>
                <Select value={form.default_branch_id || 'none'} onValueChange={(v) => updateField('default_branch_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select Branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {allBranches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'الشركات' : 'Companies'}>
                <div className="w-full">
                  <UserCompanyAssignment selectedCompanyIds={editCompanyIds} onCompanyIdsChange={(ids) => { setEditCompanyIds(ids); setIsDirty(true); }} />
                </div>
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'القسم' : 'Department'}>
                <Select value={form.department || 'none'} onValueChange={(v) => updateField('department', v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر القسم' : 'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {language === 'ar' && dept.name_ar ? dept.name_ar : dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label={language === 'ar' ? 'المجموعات' : 'Groups'}>
                <Input
                  value={getUserRole(currentUser.user_id) === 'admin' ? 'ALL Users UI;' : getRoleDisplay(getUserRole(currentUser.user_id), systemRoles, language)}
                  disabled
                  className="h-7 text-sm bg-[hsl(var(--primary)/0.05)]"
                />
              </FieldRow>

              <div className="border-t border-border my-3" />

              <FieldRow label={language === 'ar' ? 'كلمة المرور' : 'Password'}>
                <Input value="••••" type="password" disabled className="h-7 text-sm bg-[hsl(var(--primary)/0.05)]" />
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0">
                  <Lock className="h-3 w-3" />
                </Button>
              </FieldRow>

              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.password_never_expires} onCheckedChange={(v) => updateField('password_never_expires', !!v)} />
                  <Label className="text-sm font-normal">{language === 'ar' ? 'كلمة المرور لا تنتهي' : 'Password Never Expires'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.change_password_next_logon} onCheckedChange={(v) => updateField('change_password_next_logon', !!v)} />
                  <Label className="text-sm font-normal">{language === 'ar' ? 'تغيير كلمة المرور عند الدخول القادم' : 'Change Password at Next Logon'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.locked} onCheckedChange={(v) => updateField('locked', !!v)} />
                  <Label className="text-sm font-normal">{language === 'ar' ? 'مقفل' : 'Locked'}</Label>
                </div>
              </div>

              <div className="border-t border-border my-3" />

              {/* Personal Data Protection */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold underline">{language === 'ar' ? 'حماية البيانات الشخصية' : 'Personal Data Protection'}</h4>
                <div className="flex items-center gap-2">
                  <Checkbox disabled />
                  <Label className="text-sm font-normal text-muted-foreground">{language === 'ar' ? 'شخص طبيعي' : 'Natural Person'}</Label>
                </div>
                <FieldRow label={language === 'ar' ? 'الحالة' : 'Status'}>
                  <Badge variant={form.locked ? 'destructive' : 'outline'} className="text-xs">
                    {form.locked ? (language === 'ar' ? 'مقفل' : 'Locked') : (language === 'ar' ? 'بدون' : 'None')}
                  </Badge>
                </FieldRow>
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-0 border border-t-0 border-border rounded-b-md p-4">
              <div className="text-sm text-muted-foreground space-y-3">
                <FieldRow label={language === 'ar' ? 'الدور' : 'Role'}>
                  <Select value={form.role} onValueChange={(v) => updateField('role', v)}>
                    <SelectTrigger className="h-7 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {systemRoles.map(sr => (
                        <SelectItem key={sr.id} value={sr.role_key}>
                          {language === 'ar' && sr.description_ar ? sr.description_ar : (sr.description || sr.role_key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}>
                  <Input value={currentUser ? new Date(currentUser.created_at).toLocaleDateString() : ''} disabled className="h-7 text-sm bg-muted" />
                </FieldRow>
              </div>
            </TabsContent>

            <TabsContent value="display" className="mt-0 border border-t-0 border-border rounded-b-md p-4">
              <div className="text-sm text-muted-foreground space-y-3">
                <FieldRow label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}>
                  <Input value={currentUser?.email || ''} disabled className="h-7 text-sm bg-muted" />
                </FieldRow>
                <FieldRow label={language === 'ar' ? 'رقم المعرف' : 'User ID'}>
                  <Input value={currentUser?.user_id || ''} disabled className="h-7 text-sm bg-muted font-mono text-xs" />
                </FieldRow>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom status bar */}
          <div className="flex items-center justify-between bg-muted/30 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground">
            <span>{language === 'ar' ? 'السجل' : 'Record'}: {currentIndex + 1} / {users.length}</span>
            {isDirty && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                {language === 'ar' ? 'غير محفوظ' : 'Unsaved Changes'}
              </Badge>
            )}
            <span>{currentUser?.email}</span>
          </div>
        </div>
      ) : (
        <div className="border border-t-0 border-border rounded-b-md bg-background p-8 text-center text-muted-foreground">
          {language === 'ar' ? 'لا يوجد مستخدمين. اضغط إضافة لإنشاء مستخدم جديد.' : 'No users found. Click Add to create a new user.'}
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</DialogTitle>
            <DialogDescription>{language === 'ar' ? 'إنشاء حساب مستخدم جديد' : 'Create a new user account'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { id: 'email', label: language === 'ar' ? 'البريد' : 'Email', type: 'email', placeholder: 'user@example.com' },
              { id: 'password', label: language === 'ar' ? 'كلمة المرور' : 'Password', type: 'password', placeholder: '••••••••' },
              { id: 'full_name', label: language === 'ar' ? 'الاسم' : 'User Name', type: 'text' },
              { id: 'user_code', label: language === 'ar' ? 'رمز المستخدم' : 'User Code', type: 'text', placeholder: 'e.g. SC' },
              { id: 'phone', label: language === 'ar' ? 'الهاتف' : 'Phone', type: 'tel' },
              { id: 'mobile', label: language === 'ar' ? 'الجوال' : 'Mobile', type: 'tel' },
            ].map(f => (
              <div key={f.id} className="grid grid-cols-[140px_1fr] items-center gap-2">
                <Label className="text-sm">{f.label}</Label>
                <Input
                  type={f.type}
                  value={(addForm as any)[f.id]}
                  onChange={(e) => setAddForm({ ...addForm, [f.id]: e.target.value })}
                  className="h-8 text-sm"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm">{language === 'ar' ? 'القسم' : 'Department'}</Label>
              <Select value={addForm.department || 'none'} onValueChange={(v) => setAddForm({ ...addForm, department: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {language === 'ar' && dept.name_ar ? dept.name_ar : dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <Label className="text-sm">{language === 'ar' ? 'الدور' : 'Role'}</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {systemRoles.map(sr => (
                    <SelectItem key={sr.id} value={sr.role_key}>
                      {language === 'ar' && sr.description_ar ? sr.description_ar : (sr.description || sr.role_key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <UserCompanyAssignment selectedCompanyIds={addCompanyIds} onCompanyIdsChange={setAddCompanyIds} />
            <UserBranchAssignment selectedBranchIds={addBranchIds} onBranchIdsChange={setAddBranchIds} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                createUserMutation.mutate({ ...addForm, branchIds: addBranchIds, companyIds: addCompanyIds });
                // Save company assignments after user creation is handled in onSuccess
              }}
              disabled={createUserMutation.isPending || !addForm.email || !addForm.password}
            >
              {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'إضافة' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getRoleDisplay(role: string, systemRoles: any[], language: string): string {
  const sr = systemRoles.find((r: any) => r.role_key === role);
  if (sr) return language === 'ar' && sr.description_ar ? sr.description_ar : (sr.description || sr.role_key);
  return role;
}
