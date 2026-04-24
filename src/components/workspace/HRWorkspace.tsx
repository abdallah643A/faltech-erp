import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { Users, Calendar, UserCheck, Briefcase, Award, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export function HRWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['hr-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const emps = await (supabase.from('employees').select('id', { count: 'exact', head: true }) as any).eq('status', 'active').eq('company_id', cid);
      const leaves = await (supabase.from('leave_requests').select('id', { count: 'exact', head: true }) as any).eq('status', 'pending').eq('company_id', cid);
      return { activeEmployees: emps.count || 0, pendingLeaves: leaves.count || 0, todayAttendance: 0 };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['hr-ws-pending', activeCompanyId],
    queryFn: async () => {
      const actions: PendingAction[] = [];
      const { data: leaves } = await supabase.from('leave_requests').select('id, employee_id, leave_type_id, start_date, created_at')
        .eq('status', 'pending').eq('company_id', activeCompanyId!).order('created_at').limit(6);
      (leaves || []).forEach((l: any) => {
        const age = differenceInDays(new Date(), new Date(l.created_at));
        actions.push({ id: l.id, title: `Leave Request`, subtitle: `From ${l.start_date}`, priority: age > 3 ? 'high' : 'medium', href: '/hr/leave', age: `${age}d` });
      });
      return actions;
    },
    enabled: !!activeCompanyId,
  });

  const shortcuts = [
    { label: 'Employees', icon: Users, href: '/hr/employees', color: 'hsl(var(--primary))' },
    { label: 'Leave', icon: Calendar, href: '/hr/leave', color: '#10b981' },
    { label: 'Attendance', icon: UserCheck, href: '/hr/attendance', color: '#f59e0b' },
    { label: 'Payroll', icon: Briefcase, href: '/hr/payroll', color: '#3b82f6' },
    { label: 'Performance', icon: Award, href: '/hr/performance', color: '#8b5cf6' },
    { label: 'Departments', icon: Clock, href: '/hr/departments', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة الموارد البشرية' : 'HR Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'إدارة الموارد البشرية' : 'People management at a glance'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <WorkspaceKPICard title="Active Employees" value={kpis?.activeEmployees ?? 0} icon={Users} color="hsl(var(--primary))" href="/hr/employees" />
        <WorkspaceKPICard title="Pending Leave" value={kpis?.pendingLeaves ?? 0} icon={Calendar} color="#f59e0b" href="/hr/leave" />
        <WorkspaceKPICard title="Today's Attendance" value={kpis?.todayAttendance ?? 0} icon={UserCheck} color="#10b981" href="/hr/attendance" />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <WorkspacePendingActions title={isAr ? 'إجراءات معلقة' : 'Pending Leave Requests'} actions={pendingActions} />
    </div>
  );
}
