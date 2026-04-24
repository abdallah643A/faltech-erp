import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { HardHat, FolderOpen, FileText, BarChart3, Hammer, Shield } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';

export function ConstructionWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['const-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const [activeProjects, tenders] = await Promise.all([
        (supabase.from('cpms_projects').select('id', { count: 'exact', head: true }) as any).in('status', ['active', 'in_progress']).eq('company_id', cid),
        (supabase.from('cpms_tenders').select('id', { count: 'exact', head: true }) as any).in('status', ['open', 'submitted']).eq('company_id', cid),
      ]);
      return { activeProjects: activeProjects.count || 0, openTenders: tenders.count || 0 };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['const-ws-pending', activeCompanyId],
    queryFn: async () => {
      const { data: reports } = await (supabase.from('cpms_daily_reports').select('id, report_date, created_at') as any)
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(5);
      return (reports || []).map((r: any) => ({
        id: r.id, title: `Daily Report - ${r.report_date}`,
        priority: 'medium' as const, href: '/cpms/daily-reports', age: `${differenceInDays(new Date(), new Date(r.created_at))}d`,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const shortcuts = [
    { label: 'Projects', icon: FolderOpen, href: '/cpms', color: 'hsl(var(--primary))' },
    { label: 'Daily Reports', icon: FileText, href: '/cpms/daily-reports', color: '#10b981' },
    { label: 'Tenders', icon: Hammer, href: '/cpms/tenders', color: '#f59e0b' },
    { label: 'HSE', icon: Shield, href: '/cpms/hse', color: '#3b82f6' },
    { label: 'BOQ', icon: HardHat, href: '/boq', color: '#8b5cf6' },
    { label: 'Executive', icon: BarChart3, href: '/pmo/executive', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة المقاولات' : 'Construction Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'المشاريع والمناقصات' : 'Projects & tenders at a glance'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WorkspaceKPICard title="Active Projects" value={kpis?.activeProjects ?? 0} icon={FolderOpen} color="hsl(var(--primary))" href="/cpms" />
        <WorkspaceKPICard title="Open Tenders" value={kpis?.openTenders ?? 0} icon={Hammer} color="#f59e0b" href="/cpms/tenders" />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <CopilotPanel
        module="cpms"
        title={isAr ? 'مساعد الذكاء للمشاريع' : 'CPMS AI Copilot'}
        canRequest canApprove
        context={{
          active_projects: kpis?.activeProjects ?? 0,
          open_tenders: kpis?.openTenders ?? 0,
          recent_reports: pendingActions.slice(0, 5).map(a => ({ title: a.title, age: a.age })),
        }}
      />
      <WorkspacePendingActions title={isAr ? 'التقارير الأخيرة' : 'Recent Reports'} actions={pendingActions} />
    </div>
  );
}
