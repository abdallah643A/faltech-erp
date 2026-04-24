import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { WorkspaceRecentDocs, type RecentDoc } from '@/components/workspace/WorkspaceRecentDocs';
import { DollarSign, Receipt, Landmark, CreditCard, FileText, BarChart3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';

export function FinanceWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['fin-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [arOpen, apOpen, payments, alerts] = await Promise.all([
        supabase.from('ar_invoices').select('total').in('status', ['open', 'overdue']).eq('company_id', cid),
        supabase.from('ap_invoices').select('total').eq('status', 'open').eq('company_id', cid),
        supabase.from('incoming_payments').select('total_amount').gte('doc_date', startOfMonth).neq('status', 'cancelled').eq('company_id', cid),
        supabase.from('finance_alerts').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('company_id', cid),
      ]);
      return {
        arReceivable: (arOpen.data || []).reduce((s, i) => s + (i.total || 0), 0),
        apPayable: (apOpen.data || []).reduce((s, i) => s + (i.total || 0), 0),
        monthlyCollections: (payments.data || []).reduce((s, p) => s + (p.total_amount || 0), 0),
        pendingAlerts: alerts.count || 0,
      };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['fin-ws-pending', activeCompanyId],
    queryFn: async () => {
      const { data: alerts } = await supabase.from('finance_alerts').select('id, title, priority, created_at, alert_type')
        .eq('status', 'pending').eq('company_id', activeCompanyId!).order('created_at').limit(8);
      return (alerts || []).map(a => {
        const age = differenceInDays(new Date(), new Date(a.created_at));
        return { id: a.id, title: a.title, subtitle: a.alert_type, priority: (a.priority || 'medium') as any, href: '/finance-gates', age: `${age}d` };
      });
    },
    enabled: !!activeCompanyId,
  });

  const { data: recentDocs = [] } = useQuery<RecentDoc[]>({
    queryKey: ['fin-ws-recent', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('id, doc_num, customer_name, status, created_at, total')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(6);
      return (data || []).map(d => ({
        id: d.id, docNum: `INV-${d.doc_num}`, type: 'AR Invoice', partner: d.customer_name,
        status: d.status || 'open', date: d.created_at, href: '/ar-invoices', amount: d.total || 0,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);

  const shortcuts = [
    { label: 'AR Invoices', icon: Receipt, href: '/ar-invoices', color: 'hsl(var(--primary))' },
    { label: 'AP Invoices', icon: FileText, href: '/banking/outgoing-payments', color: '#10b981' },
    { label: 'Payments', icon: CreditCard, href: '/incoming-payments', color: '#f59e0b' },
    { label: 'Finance Gates', icon: Landmark, href: '/finance-gates', color: '#3b82f6' },
    { label: 'Journal Entries', icon: DollarSign, href: '/journal-entries', color: '#8b5cf6' },
    { label: 'Reports', icon: BarChart3, href: '/financial-reports', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة المالية' : 'Finance Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'نظرة مالية شاملة' : 'Financial overview at a glance'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <WorkspaceKPICard title="AR Receivable" value={fmt(kpis?.arReceivable ?? 0)} icon={Receipt} color="hsl(var(--primary))" href="/ar-invoices" />
        <WorkspaceKPICard title="AP Payable" value={fmt(kpis?.apPayable ?? 0)} icon={FileText} color="#ef4444" href="/banking/outgoing-payments" />
        <WorkspaceKPICard title="Monthly Collections" value={fmt(kpis?.monthlyCollections ?? 0)} icon={DollarSign} color="#10b981" href="/incoming-payments" />
        <WorkspaceKPICard title="Pending Alerts" value={kpis?.pendingAlerts ?? 0} icon={Landmark} color="#f59e0b" href="/finance-gates" />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <CopilotPanel
        module="finance"
        title={isAr ? 'مساعد الذكاء المالي' : 'Finance AI Copilot'}
        canRequest canApprove
        context={{
          ar_receivable: kpis?.arReceivable ?? 0,
          ap_payable: kpis?.apPayable ?? 0,
          monthly_collections: kpis?.monthlyCollections ?? 0,
          pending_alerts: kpis?.pendingAlerts ?? 0,
          pending_finance_alerts: pendingActions.slice(0, 5).map(a => ({ title: a.title, priority: a.priority, age: a.age })),
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspacePendingActions title={isAr ? 'تنبيهات مالية' : 'Finance Alerts'} actions={pendingActions} />
        <WorkspaceRecentDocs title={isAr ? 'آخر الفواتير' : 'Recent Invoices'} docs={recentDocs} />
      </div>
    </div>
  );
}
