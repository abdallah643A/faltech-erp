import { useMemo, Suspense, lazy } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Landmark,
  ArrowUpRight, ArrowDownRight, Loader2,
} from 'lucide-react';
import { Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Legend, Line } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import ModuleWorkflowDiagram, { FINANCE_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { BudgetVarianceAlerts } from '@/components/finance/BudgetVarianceAlerts';
import { CriticalFinanceAlerts } from '@/components/finance/CriticalFinanceAlerts';
import { ReceivablesAgingDrillDown } from '@/components/finance/ReceivablesAgingDrillDown';
import { BudgetVsActualComparison } from '@/components/finance/BudgetVsActualComparison';
import { EnhancedCashFlowForecast } from '@/components/finance/EnhancedCashFlowForecast';
import { PaymentReconciliationEngine } from '@/components/finance/PaymentReconciliationEngine';
import { DashboardCustomizer } from '@/components/finance/DashboardCustomizer';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DonutChartWidget } from '@/components/dashboard/DonutChartWidget';
import { useFinanceDashboardPrefs } from '@/hooks/useFinanceDashboardPrefs';

const WidgetLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export default function FinanceDashboard() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const {
    widgets, visibleWidgets, activeView, setActiveView,
    toggleWidget, moveWidget, resetLayout,
    refreshInterval, updateRefreshInterval,
  } = useFinanceDashboardPrefs();

  const refetchConfig = { refetchInterval: refreshInterval * 1000, staleTime: (refreshInterval * 1000) / 2 };

  const { data: arInvoices = [], isLoading: arLoading } = useQuery({
    queryKey: ['fin-dash-ar', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, total, balance_due, status, doc_date, customer_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
    ...refetchConfig,
  });

  const { data: apInvoices = [], isLoading: apLoading } = useQuery({
    queryKey: ['fin-dash-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('id, total, status, doc_date, vendor_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
    ...refetchConfig,
  });

  const { data: payments = [], isLoading: payLoading } = useQuery({
    queryKey: ['fin-dash-payments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('id, total_amount, doc_date, status, payment_type');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
    ...refetchConfig,
  });

  const isLoading = arLoading || apLoading || payLoading;

  const totalReceivable = arInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPayable = apInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalRevenue = arInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalExpenses = apInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const netPosition = totalRevenue - totalExpenses;

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const cashFlowData = useMemo(() => {
    const months: { month: string; inflow: number; outflow: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const inflow = payments.filter(p => p.doc_date >= start && p.doc_date <= end && p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
      const outflow = apInvoices.filter(i => i.doc_date >= start && i.doc_date <= end).reduce((s, i) => s + (i.total || 0), 0);
      months.push({ month: format(d, 'MMM'), inflow, outflow, net: inflow - outflow });
    }
    return months;
  }, [payments, apInvoices]);

  const inflowSpark = cashFlowData.map(m => m.inflow);

  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter(p => p.status !== 'cancelled').forEach(p => {
      const m = p.payment_type || 'Other';
      map[m] = (map[m] || 0) + (p.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const isWidgetVisible = (id: string) => visibleWidgets.some(w => w.id === id);

  const renderWidget = (id: string) => {
    switch (id) {
      case 'critical-alerts':
        return <CriticalFinanceAlerts />;

      case 'kpi-cards':
        return (
          <TooltipProvider>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'} value={`SAR ${fmt(totalRevenue)}`} icon={TrendingUp} color="#10b981" sparkData={inflowSpark} chartType="area" onClick={() => navigate('/finance-drilldown?metric=revenue')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Sum of all AR invoice totals</p></TooltipContent></UITooltip>
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'إجمالي المصروفات' : 'Total Expenses'} value={`SAR ${fmt(totalExpenses)}`} icon={TrendingDown} color="#ef4444" onClick={() => navigate('/finance-drilldown?metric=expenses')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Sum of all AP invoice totals</p></TooltipContent></UITooltip>
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'صافي الوضع' : 'Net Position'} value={`SAR ${fmt(netPosition)}`} icon={DollarSign} color={netPosition >= 0 ? '#10b981' : '#ef4444'} onClick={() => navigate('/finance-drilldown?metric=net')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Revenue minus Expenses</p></TooltipContent></UITooltip>
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'الذمم المدينة' : 'Receivables'} value={`SAR ${fmt(totalReceivable)}`} icon={ArrowUpRight} color="#3b82f6" onClick={() => navigate('/finance-drilldown?metric=receivables')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Outstanding customer balances</p></TooltipContent></UITooltip>
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'الذمم الدائنة' : 'Payables'} value={`SAR ${fmt(totalPayable)}`} icon={ArrowDownRight} color="#f59e0b" onClick={() => navigate('/finance-drilldown?metric=payables')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Unpaid vendor invoices</p></TooltipContent></UITooltip>
              <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'المحصّل' : 'Collected'} value={`SAR ${fmt(totalCollected)}`} icon={CreditCard} color="#8b5cf6" onClick={() => navigate('/finance-drilldown?metric=collected')} /></div></TooltipTrigger><TooltipContent><p className="text-xs">Total incoming payments received</p></TooltipContent></UITooltip>
            </div>
          </TooltipProvider>
        );

      case 'cash-flow-trend':
        return (
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'التدفق النقدي' : 'Cash Flow Trend'}</CardTitle></CardHeader>
            <CardContent>
              {cashFlowData.every(d => d.inflow === 0 && d.outflow === 0) ? (
                <EmptyChartState message="No cash flow data available" height={280} />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="inflow" name={isAr ? 'الواردات' : 'Inflow'} fill="hsl(var(--chart-2))" fillOpacity={0.3} stroke="hsl(var(--chart-2))" />
                    <Area type="monotone" dataKey="outflow" name={isAr ? 'الصادرات' : 'Outflow'} fill="hsl(var(--chart-4))" fillOpacity={0.3} stroke="hsl(var(--chart-4))" />
                    <Line type="monotone" dataKey="net" name={isAr ? 'الصافي' : 'Net'} stroke="hsl(var(--primary))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case 'aging-drilldown':
        return <ReceivablesAgingDrillDown />;

      case 'budget-vs-actual':
        return <BudgetVsActualComparison />;

      case 'payment-methods':
        return (
          <DonutChartWidget
            title={isAr ? 'طرق الدفع' : 'Payment Methods'}
            data={paymentMethodData}
            centerValue={payments.length}
            centerLabel={isAr ? 'المعاملات' : 'Transactions'}
            formatValue={(v) => `SAR ${fmt(v)}`}
          />
        );

      case 'top-customers':
        return (
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'أعلى العملاء المدينين' : 'Top Outstanding Customers'}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-right p-2">{isAr ? 'المستحق' : 'Outstanding'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const map: Record<string, number> = {};
                    arInvoices.filter(i => (i.balance_due || 0) > 0).forEach(i => { map[i.customer_name] = (map[i.customer_name] || 0) + (i.balance_due || 0); });
                    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, val]) => (
                      <tr key={name} className="border-t hover:bg-accent/30 cursor-pointer" onClick={() => navigate(`/finance-drilldown?metric=receivables`)}>
                        <td className="p-2 truncate max-w-[200px]">{name}</td>
                        <td className="p-2 text-right font-mono font-bold text-destructive">SAR {fmt(val)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );

      case 'budget-variance':
        return <BudgetVarianceAlerts />;

      case 'enhanced-forecast':
        return <EnhancedCashFlowForecast />;

      case 'reconciliation':
        return <PaymentReconciliationEngine />;

      default:
        return null;
    }
  };

  // Group visible widgets by layout for grid rendering
  const fullWidgets = visibleWidgets.filter(w => w.size === 'full');
  const halfWidgets = visibleWidgets.filter(w => w.size === 'half');

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            {isAr ? 'لوحة التحكم المالية' : 'Finance Dashboard'}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'نظرة شاملة على الوضع المالي' : 'Financial health overview'}</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardCustomizer
            widgets={widgets}
            activeView={activeView}
            refreshInterval={refreshInterval}
            onSetView={setActiveView}
            onToggle={toggleWidget}
            onMove={moveWidget}
            onReset={resetLayout}
            onSetRefresh={updateRefreshInterval}
          />
          {(() => { const m = getModuleById('finance'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
        </div>
      </div>

      <ModuleWorkflowDiagram moduleName="Finance" moduleNameAr="المالية" steps={FINANCE_WORKFLOW} tips={['Set up Chart of Accounts first, then post journal entries.', 'AR/AP invoices auto-generate GL entries. Reconcile payments regularly.']} />

      {/* Render widgets in order */}
      {visibleWidgets.map(w => {
        if (w.size !== 'full') return null;
        return (
          <Suspense key={w.id} fallback={<WidgetLoader />}>
            {renderWidget(w.id)}
          </Suspense>
        );
      })}

      {/* Pair half-width widgets */}
      {(() => {
        const halves = visibleWidgets.filter(w => w.size === 'half');
        const pairs: [typeof halves[0], typeof halves[0] | undefined][] = [];
        for (let i = 0; i < halves.length; i += 2) {
          pairs.push([halves[i], halves[i + 1]]);
        }
        return pairs.map(([a, b], idx) => (
          <div key={`pair-${idx}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<WidgetLoader />}>{renderWidget(a.id)}</Suspense>
            {b && <Suspense fallback={<WidgetLoader />}>{renderWidget(b.id)}</Suspense>}
          </div>
        ));
      })()}
    </div>
  );
}
