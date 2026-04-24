import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { WorkspaceRecentDocs, type RecentDoc } from '@/components/workspace/WorkspaceRecentDocs';
import { QuickActionsWidget } from '@/components/favorites/QuickActionsWidget';
import { TrendingUp, FileText, ShoppingCart, Receipt, Users, Target, Handshake, BarChart3 } from 'lucide-react';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopOpportunities } from '@/components/dashboard/TopOpportunities';
import { differenceInDays } from 'date-fns';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';

export function SalesWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['sales-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId;
      const [leads, opps, quotes, orders] = await Promise.all([
        supabase.from('business_partners').select('id', { count: 'exact', head: true }).eq('card_type', 'lead').eq('company_id', cid!),
        (supabase.from('opportunities').select('id', { count: 'exact', head: true }) as any).neq('status', 'closed').eq('company_id', cid!),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('company_id', cid!),
        supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('company_id', cid!),
      ]);
      return {
        leads: leads.count || 0,
        opportunities: opps.count || 0,
        openQuotes: quotes.count || 0,
        openOrders: orders.count || 0,
      };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['sales-ws-pending', activeCompanyId],
    queryFn: async () => {
      const actions: PendingAction[] = [];
      // Quotes needing follow-up
      const { data: quotes } = await supabase.from('quotes').select('id, quote_number, customer_name, created_at')
        .eq('status', 'open').eq('company_id', activeCompanyId!).order('created_at', { ascending: true }).limit(5);
      (quotes || []).forEach((q: any) => {
        const age = differenceInDays(new Date(), new Date(q.created_at));
        actions.push({
          id: q.id, title: `Quote #${q.quote_number}`, subtitle: q.customer_name,
          priority: age > 7 ? 'high' : age > 3 ? 'medium' : 'low',
          href: '/quotes', age: `${age}d`,
        });
      });
      // Pending approval orders
      const { data: orders } = await supabase.from('sales_orders').select('id, doc_num, customer_name, workflow_status, created_at')
        .in('workflow_status', ['pending_finance', 'cost_variance_pending']).eq('company_id', activeCompanyId!).limit(5);
      (orders || []).forEach((o: any) => {
        const age = differenceInDays(new Date(), new Date(o.created_at));
        actions.push({
          id: o.id, title: `SO #${o.doc_num} - ${o.workflow_status}`, subtitle: o.customer_name,
          priority: 'high', href: '/sales-orders', age: `${age}d`,
        });
      });
      return actions;
    },
    enabled: !!activeCompanyId,
  });

  const { data: recentDocs = [] } = useQuery<RecentDoc[]>({
    queryKey: ['sales-ws-recent', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('sales_orders').select('id, doc_num, customer_name, status, created_at, total')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(6);
      return (data || []).map(d => ({
        id: d.id, docNum: `SO-${d.doc_num}`, type: 'Sales Order', partner: d.customer_name,
        status: d.status || 'open', date: d.created_at, href: '/sales-orders', amount: d.total || 0,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const shortcuts = [
    { label: 'New Lead', icon: Users, href: '/leads', color: 'hsl(var(--primary))' },
    { label: 'Opportunities', icon: Target, href: '/opportunities', color: '#10b981' },
    { label: 'Quotes', icon: FileText, href: '/quotes', color: '#f59e0b' },
    { label: 'Orders', icon: ShoppingCart, href: '/sales-orders', color: '#3b82f6' },
    { label: 'Invoices', icon: Receipt, href: '/ar-invoices', color: '#ef4444' },
    { label: 'Pipeline', icon: BarChart3, href: '/sales-pipeline', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة المبيعات' : 'Sales Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'نظرة سريعة على المبيعات' : 'Your sales overview at a glance'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <WorkspaceKPICard title="Active Leads" value={kpis?.leads ?? 0} icon={Users} color="hsl(var(--primary))" href="/leads" />
        <WorkspaceKPICard title="Open Opportunities" value={kpis?.opportunities ?? 0} icon={TrendingUp} color="#10b981" href="/opportunities" />
        <WorkspaceKPICard title="Open Quotes" value={kpis?.openQuotes ?? 0} icon={FileText} color="#f59e0b" href="/quotes" />
        <WorkspaceKPICard title="Open Orders" value={kpis?.openOrders ?? 0} icon={ShoppingCart} color="#3b82f6" href="/sales-orders" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceShortcuts shortcuts={shortcuts} />
        <QuickActionsWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspacePendingActions title={isAr ? 'إجراءات معلقة' : 'Pending Actions'} actions={pendingActions} />
        <WorkspaceRecentDocs docs={recentDocs} />
      </div>

      <CopilotPanel
        module="crm"
        title={isAr ? 'مساعد الذكاء للمبيعات' : 'CRM AI Copilot'}
        canRequest canApprove
        context={{
          active_leads: kpis?.leads ?? 0,
          open_opportunities: kpis?.opportunities ?? 0,
          open_quotes: kpis?.openQuotes ?? 0,
          open_orders: kpis?.openOrders ?? 0,
          pending_actions: pendingActions.slice(0, 5).map(a => ({ title: a.title, priority: a.priority, age: a.age })),
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <TopOpportunities />
      </div>
    </div>
  );
}
