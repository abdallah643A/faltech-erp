import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopOpportunities } from '@/components/dashboard/TopOpportunities';
import { ContractStatusChart } from '@/components/dashboard/ContractStatusChart';
import { Users, TrendingUp, CheckSquare, DollarSign, FileText, ShoppingCart, Package, Receipt, Briefcase, Building2, Landmark } from 'lucide-react';
import ModuleWorkflowDiagram, { CRM_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadSourceROI } from '@/components/crm/LeadSourceROI';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { GlobalActivityFeed } from '@/components/shared/GlobalActivityFeed';
import { useNavigate } from 'react-router-dom';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { PipelineKanbanWidget } from '@/components/dashboard/PipelineKanbanWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCustomizer, DEFAULT_PREFERENCES, type DashboardPreferences } from '@/components/dashboard/DashboardCustomizer';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  extraActions?: React.ReactNode;
}

export function GeneralDashboard({ extraActions }: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dashPrefs = DEFAULT_PREFERENCES } = useQuery({
    queryKey: ['dashboard-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PREFERENCES;
      const { data } = await supabase.from('profiles').select('dashboard_preferences').eq('user_id', user.id).single();
      return (data?.dashboard_preferences as unknown as DashboardPreferences) || DEFAULT_PREFERENCES;
    },
    enabled: !!user?.id,
  });

  const savePrefs = useMutation({
    mutationFn: async (prefs: DashboardPreferences) => {
      if (!user?.id) return;
      await supabase.from('profiles').update({ dashboard_preferences: prefs as any }).eq('user_id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] }),
  });

  const isWidgetVisible = useCallback((id: string) => {
    const w = dashPrefs.widgets.find(w => w.id === id);
    return w ? w.visible : true;
  }, [dashPrefs]);

  const widgetOrder = useMemo(() => dashPrefs.widgets.map(w => w.id), [dashPrefs]);

  const relativeFormatter = useMemo(() => {
    const locale = language === 'ar' ? 'ar-SA' : language === 'ur' ? 'ur-PK' : language === 'hi' ? 'hi-IN' : 'en-US';
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  }, [language]);

  const { data: lastSyncTime } = useQuery({
    queryKey: ['last-sap-sync'],
    queryFn: async () => {
      const { data } = await supabase.from('sync_logs').select('completed_at, created_at').eq('status', 'synced').order('completed_at', { ascending: false }).limit(1).maybeSingle();
      return data?.completed_at || data?.created_at || null;
    },
    refetchInterval: 60000,
  });

  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  const formatRelativeTime = useCallback((iso: string | null) => {
    if (!iso) {
      if (language === 'ar') return 'لم يحدث أبدًا';
      if (language === 'ur') return 'کبھی نہیں';
      if (language === 'hi') return 'कभी नहीं';
      return 'Never';
    }
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      if (language === 'ar') return 'الآن';
      if (language === 'ur') return 'ابھی';
      if (language === 'hi') return 'अभी';
      return 'Just now';
    }
    if (mins < 60) return relativeFormatter.format(-mins, 'minute');
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return relativeFormatter.format(-hrs, 'hour');
    const days = Math.floor(hrs / 24);
    return relativeFormatter.format(-days, 'day');
  }, [language, relativeFormatter]);

  const { data: leadsCount = 0 } = useQuery({
    queryKey: ['dashboard-leads-count', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('business_partners').select('id', { count: 'exact', head: true }).eq('card_type', 'lead');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: opportunitiesCount = 0 } = useQuery({
    queryKey: ['dashboard-opportunities-count', activeCompanyId],
    queryFn: async () => {
      let query = (supabase.from('opportunities').select('id', { count: 'exact', head: true }) as any).neq('status', 'closed');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: pendingTasksCount = 0 } = useQuery({
    queryKey: ['dashboard-tasks-count', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('activities').select('id', { count: 'exact', head: true }).neq('status', 'completed' as any);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ['dashboard-monthly-revenue', activeCompanyId],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      let query = supabase.from('incoming_payments').select('total_amount').gte('doc_date', startOfMonth).neq('status', 'cancelled');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return (data || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);
    },
  });

  const { data: quotesCount = 0 } = useQuery({
    queryKey: ['dashboard-quotes-count', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'open');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { count } = await query;
      return count || 0;
    },
  });

  const { data: salesOrdersCount = 0 } = useQuery({
    queryKey: ['dashboard-so-count', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('status', 'open');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { count } = await query;
      return count || 0;
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const quickLinks = [
    { label: t('nav.leads'), icon: Users, href: '/leads', color: 'hsl(var(--primary))' },
    { label: t('nav.quotes'), icon: FileText, href: '/quotes', color: '#10b981' },
    { label: t('nav.salesOrders'), icon: ShoppingCart, href: '/sales-orders', color: '#f59e0b' },
    { label: t('nav.arInvoices'), icon: Receipt, href: '/ar-invoices', color: '#3b82f6' },
    { label: t('nav.procurement'), icon: Package, href: '/procurement', color: '#ef4444' },
    { label: t('nav.hr'), icon: Briefcase, href: '/hr', color: 'hsl(var(--primary))' },
    { label: t('nav.projects'), icon: Building2, href: '/projects', color: '#10b981' },
    { label: t('nav.finance'), icon: Landmark, href: '/finance', color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{t('dashboard.welcome')}, {t('dashboard.admin')}</p>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <DashboardCustomizer preferences={dashPrefs} onSave={(p) => savePrefs.mutate(p)} />
          {(() => { const m = getModuleById('dashboard'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('dashboard.lastSyncedWithSAP')}: {formatRelativeTime(lastSyncTime ?? null)}</span>
          <span className={`h-2 w-2 rounded-full ${lastSyncTime ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
        </div>
      </div>

      {widgetOrder.map(wId => {
        if (!isWidgetVisible(wId)) return null;
        switch (wId) {
          case 'kpi-cards':
            return (
              <div key={wId} className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <DashboardMetricCard title={t('dashboard.totalLeads')} value={leadsCount} icon={Users} color="hsl(var(--primary))" subtitle={t('dashboard.clickToViewAllLeads')} onClick={() => navigate('/leads')} />
                <DashboardMetricCard title={t('dashboard.openOpportunities')} value={opportunitiesCount} icon={TrendingUp} color="#10b981" subtitle={t('dashboard.clickToViewPipeline')} onClick={() => navigate('/opportunities')} />
                <DashboardMetricCard title={t('dashboard.pendingTasks')} value={pendingTasksCount} icon={CheckSquare} color="#f59e0b" subtitle={t('dashboard.clickToManageTasks')} onClick={() => navigate('/activities')} />
                <DashboardMetricCard title={t('dashboard.monthlyRevenue')} value={formatCurrency(monthlyRevenue)} icon={DollarSign} color="#3b82f6" subtitle={t('dashboard.clickToViewPayments')} onClick={() => navigate('/incoming-payments')} />
              </div>
            );
          case 'quick-overview':
            return (
              <PipelineKanbanWidget key={wId} title={t('dashboard.quickOverview')} stages={[
                { name: t('dashboard.openQuotes'), count: quotesCount, color: 'hsl(var(--primary))', href: '/quotes' },
                { name: t('dashboard.openOrders'), count: salesOrdersCount, color: '#10b981', href: '/sales-orders' },
                { name: t('nav.leads'), count: leadsCount, color: '#3b82f6', href: '/leads' },
                { name: t('nav.opportunities'), count: opportunitiesCount, color: '#f59e0b', href: '/opportunities' },
                { name: t('nav.tasks'), count: pendingTasksCount, color: '#8b5cf6', href: '/activities' },
              ]} />
            );
          case 'quick-access':
            return (
              <Card key={wId}>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.quickAccess')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {quickLinks.map((link) => (
                      <button key={link.href} onClick={() => navigate(link.href)} className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors group">
                        <div className="h-10 w-10 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center transition-colors">
                          <link.icon className="h-5 w-5" style={{ color: link.color }} />
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          case 'crm-workflow':
            return <ModuleWorkflowDiagram key={wId} moduleName="CRM" moduleNameAr="إدارة علاقات العملاء" steps={CRM_WORKFLOW} tips={['Start by capturing leads, then convert to opportunities when qualified.', 'Follow the full cycle: Lead → Opportunity → Quote → Order → Delivery → Invoice → Payment.', 'Use activities to track follow-ups at every stage.']} />;
          case 'sales-chart':
            return <div key={wId} className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><SalesChart /></div>{isWidgetVisible('recent-activities') ? null : <div><RecentActivities /></div>}</div>;
          case 'recent-activities':
            return isWidgetVisible('sales-chart') ? (
              <div key={wId} className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><SalesChart /></div><div><RecentActivities /></div></div>
            ) : <div key={wId}><RecentActivities /></div>;
          case 'contract-status':
            return <ContractStatusChart key={wId} />;
          case 'lead-source-roi':
            return <LeadSourceROI key={wId} />;
          case 'top-opportunities':
            return isWidgetVisible('global-activity') ? null : <TopOpportunities key={wId} />;
          case 'global-activity':
            return (
              <div key={wId} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isWidgetVisible('top-opportunities') && <TopOpportunities />}
                <GlobalActivityFeed />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
