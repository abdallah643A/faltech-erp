import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Save, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const MODULE_TREE = [
  { path: 'administration', label: 'Administration', children: [
    { path: 'administration.system_init', label: 'System Initialization' },
    { path: 'administration.setup', label: 'Setup' },
    { path: 'administration.utilities', label: 'Utilities' },
    { path: 'administration.approvals', label: 'Approval Procedures' },
  ]},
  { path: 'financials', label: 'Financials', children: [
    { path: 'financials.chart_of_accounts', label: 'Chart of Accounts' },
    { path: 'financials.journal_entries', label: 'Journal Entries' },
    { path: 'financials.reports', label: 'Financial Reports' },
  ]},
  { path: 'sales', label: 'Sales', children: [
    { path: 'sales.quotations', label: 'Sales Quotations' },
    { path: 'sales.orders', label: 'Sales Orders' },
    { path: 'sales.invoices', label: 'AR Invoices' },
    { path: 'sales.deliveries', label: 'Deliveries' },
  ]},
  { path: 'purchasing', label: 'Purchasing', children: [
    { path: 'purchasing.requests', label: 'Purchase Requests' },
    { path: 'purchasing.orders', label: 'Purchase Orders' },
    { path: 'purchasing.invoices', label: 'AP Invoices' },
    { path: 'purchasing.receipts', label: 'Goods Receipts' },
  ]},
  { path: 'inventory', label: 'Inventory', children: [
    { path: 'inventory.items', label: 'Item Master' },
    { path: 'inventory.warehouses', label: 'Warehouses' },
    { path: 'inventory.transfers', label: 'Inventory Transfers' },
  ]},
  { path: 'hr', label: 'Human Resources', children: [
    { path: 'hr.employees', label: 'Employees' },
    { path: 'hr.attendance', label: 'Attendance' },
    { path: 'hr.payroll', label: 'Payroll' },
    { path: 'hr.leaves', label: 'Leave Management' },
  ]},
  { path: 'bp', label: 'Business Partners', children: [
    { path: 'bp.customers', label: 'Customers' },
    { path: 'bp.vendors', label: 'Vendors' },
  ]},
];

const PERMISSION_LEVELS = ['full', 'read_only', 'no_access'] as const;

export default function Authorizations() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { users } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(MODULE_TREE.map(m => m.path)));
  const [localPerms, setLocalPerms] = useState<Record<string, string>>({});

  const { data: perms = [] } = useQuery({
    queryKey: ['user-auth-detail', selectedUserId, activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_authorizations_detail')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('company_id', activeCompanyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId && !!activeCompanyId,
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    perms.forEach(p => { map[p.module_path] = p.permission_level; });
    setLocalPerms(map);
  }, [perms]);

  const toggleGroup = (path: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const setPermission = (modulePath: string, level: string) => {
    setLocalPerms(prev => ({ ...prev, [modulePath]: level }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(localPerms);
      for (const [module_path, permission_level] of entries) {
        const { error } = await (supabase as any).from('user_authorizations_detail').upsert({
          user_id: selectedUserId,
          module_path,
          permission_level,
          company_id: activeCompanyId!,
        }, { onConflict: 'user_id,module_path,company_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-auth-detail'] });
      toast.success(language === 'ar' ? 'تم حفظ الصلاحيات' : 'Authorizations saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {language === 'ar' ? 'الصلاحيات' : 'Authorizations'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة صلاحيات المستخدمين لكل وحدة' : 'Manage per-module user permissions'}</p>
        </div>
        {selectedUserId && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
            <Save className="h-4 w-4 mr-1" /> {language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">{language === 'ar' ? 'المستخدم:' : 'User:'}</label>
        <select className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-64"
          value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          <option value="">{language === 'ar' ? '— اختر مستخدم —' : '— Select User —'}</option>
          {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {selectedUserId && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">{language === 'ar' ? 'الوحدة / الشاشة' : 'Module / Screen'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'صلاحية كاملة' : 'Full Access'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'قراءة فقط' : 'Read Only'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'بدون صلاحية' : 'No Access'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULE_TREE.map(group => (
                <>
                  <TableRow key={group.path} className="bg-muted/30 cursor-pointer" onClick={() => toggleGroup(group.path)}>
                    <TableCell className="font-semibold flex items-center gap-1">
                      {expandedGroups.has(group.path) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {group.label}
                    </TableCell>
                    {PERMISSION_LEVELS.map(level => (
                      <TableCell key={level} className="text-center">
                        <input type="radio" name={`perm-${group.path}`}
                          checked={localPerms[group.path] === level}
                          onChange={() => {
                            setPermission(group.path, level);
                            group.children?.forEach(c => setPermission(c.path, level));
                          }} />
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedGroups.has(group.path) && group.children?.map(child => (
                    <TableRow key={child.path}>
                      <TableCell className="pl-10 text-sm">{child.label}</TableCell>
                      {PERMISSION_LEVELS.map(level => (
                        <TableCell key={level} className="text-center">
                          <input type="radio" name={`perm-${child.path}`}
                            checked={localPerms[child.path] === level}
                            onChange={() => setPermission(child.path, level)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
