import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { Crown, BarChart3, AlertTriangle, CheckCircle, Activity, TrendingUp, Landmark, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import { CrossCompanyKPIDrilldown } from '@/components/executive/CrossCompanyKPIDrilldown';
import { ExecutiveWidgetConfigurator } from '@/components/executive/ExecutiveWidgetConfigurator';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';

export function ExecutiveWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['exec-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const revenue = await (supabase.from('incoming_payments').select('total_amount') as any).gte('doc_date', startOfMonth).neq('status', 'cancelled').eq('company_id', cid);
      const pendingApprovals = await (supabase.from('approval_requests').select('id', { count: 'exact', head: true }) as any).eq('status', 'pending');
      const activeProjects = await (supabase.from('projects').select('id', { count: 'exact', head: true }) as any).eq('status', 'in_progress').eq('company_id', cid);
      const employees = await (supabase.from('employees').select('id', { count: 'exact', head: true }) as any).eq('status', 'active').eq('company_id', cid);
      return {
        monthlyRevenue: (revenue.data || []).reduce((s: number, p: any) => s + (p.total_amount || 0), 0),
        pendingApprovals: pendingApprovals.count || 0,
        activeProjects: activeProjects.count || 0,
        totalEmployees: employees.count || 0,
      };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['exec-ws-pending', activeCompanyId],
    queryFn: async () => {
      const { data: approvals } = await supabase.from('approval_requests')
        .select('id, document_type, document_number, amount, created_at, status')
        .eq('status', 'pending').order('created_at').limit(8);
      return (approvals || []).map(a => {
        const age = differenceInDays(new Date(), new Date(a.created_at!));
        return {
          id: a.id, title: `${a.document_type} #${a.document_number || 'N/A'}`,
          subtitle: a.amount ? `${a.amount.toLocaleString()} SAR` : undefined,
          priority: age > 3 ? 'high' as const : 'medium' as const,
          href: '/approval-inbox', age: `${age}d`,
        };
      });
    },
    enabled: !!activeCompanyId,
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  const shortcuts = [
    { label: 'Approvals', icon: CheckCircle, href: '/approval-inbox', color: 'hsl(var(--primary))' },
    { label: 'Process Health', icon: Activity, href: '/process-health', color: '#10b981' },
    { label: 'Finance', icon: Landmark, href: '/finance', color: '#f59e0b' },
    { label: 'Sales', icon: TrendingUp, href: '/sales-dashboard', color: '#3b82f6' },
    { label: 'HR', icon: Users, href: '/hr', color: '#8b5cf6' },
    { label: 'Reports', icon: BarChart3, href: '/reports', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'لوحة تنفيذية' : 'Executive Dashboard'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'نظرة شاملة للإدارة العليا' : 'Strategic overview for leadership'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <WorkspaceKPICard title="Monthly Revenue" value={fmt(kpis?.monthlyRevenue ?? 0)} icon={TrendingUp} color="#10b981" href="/incoming-payments" filter={{ period: 'mtd' }} />
        <WorkspaceKPICard title="Pending Approvals" value={kpis?.pendingApprovals ?? 0} icon={AlertTriangle} color="#f59e0b" href="/approval-inbox" filter={{ status: 'pending' }} />
        <WorkspaceKPICard title="Active Projects" value={kpis?.activeProjects ?? 0} icon={Crown} color="hsl(var(--primary))" href="/projects" filter={{ status: 'in_progress' }} />
        <WorkspaceKPICard title="Total Employees" value={kpis?.totalEmployees ?? 0} icon={Users} color="#3b82f6" href="/hr/employees" filter={{ status: 'active' }} />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <CrossCompanyKPIDrilldown />
      <CopilotPanel
        module="executive"
        title={isAr ? 'مساعد الذكاء الاصطناعي التنفيذي' : 'Executive AI Copilot'}
        canRequest canApprove canExecute
        context={{
          monthly_revenue: kpis?.monthlyRevenue ?? 0,
          pending_approvals: kpis?.pendingApprovals ?? 0,
          active_projects: kpis?.activeProjects ?? 0,
          total_employees: kpis?.totalEmployees ?? 0,
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WorkspacePendingActions title={isAr ? 'موافقات معلقة' : 'Pending Approvals'} actions={pendingActions} />
        <ExecutiveWidgetConfigurator />
      </div>
    </div>
  );
}
