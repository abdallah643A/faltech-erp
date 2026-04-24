import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { Factory, Cog, Package, ClipboardCheck, Layers, BarChart3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export function ManufacturingWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['mfg-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const [projects, boms] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('current_phase', 'production').eq('company_id', cid),
        supabase.from('bill_of_materials').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('company_id', cid),
      ]);
      return { inProduction: projects.count || 0, activeBOMs: boms.count || 0 };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['mfg-ws-pending', activeCompanyId],
    queryFn: async () => {
      const { data: alerts } = await supabase.from('finance_alerts').select('id, title, priority, created_at')
        .in('alert_type', ['manufacturing_start', 'procurement_start']).eq('status', 'pending').eq('company_id', activeCompanyId!).limit(6);
      return (alerts || []).map(a => {
        const age = differenceInDays(new Date(), new Date(a.created_at));
        return { id: a.id, title: a.title, priority: (a.priority || 'medium') as any, href: '/manufacturing', age: `${age}d` };
      });
    },
    enabled: !!activeCompanyId,
  });

  const shortcuts = [
    { label: 'Manufacturing', icon: Factory, href: '/manufacturing', color: 'hsl(var(--primary))' },
    { label: 'BOM', icon: Layers, href: '/bill-of-materials', color: '#10b981' },
    { label: 'MRP', icon: Cog, href: '/mrp-planning', color: '#f59e0b' },
    { label: 'Quality', icon: ClipboardCheck, href: '/quality-management', color: '#3b82f6' },
    { label: 'Items', icon: Package, href: '/items', color: '#ef4444' },
    { label: 'Reports', icon: BarChart3, href: '/reports', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة التصنيع' : 'Manufacturing Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'الإنتاج والجودة' : 'Production & quality at a glance'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <WorkspaceKPICard title="In Production" value={kpis?.inProduction ?? 0} icon={Factory} color="hsl(var(--primary))" href="/manufacturing" />
        <WorkspaceKPICard title="Active BOMs" value={kpis?.activeBOMs ?? 0} icon={Layers} color="#10b981" href="/bill-of-materials" />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <WorkspacePendingActions title={isAr ? 'إجراءات معلقة' : 'Production Alerts'} actions={pendingActions} />
    </div>
  );
}
