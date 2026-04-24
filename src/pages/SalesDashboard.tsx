import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, FileText, TrendingUp, TrendingDown, ShoppingCart,
  CreditCard, Truck, BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import ModuleWorkflowDiagram, { SALES_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { CommissionCalculator } from '@/components/sales/CommissionCalculator';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { PipelineKanbanWidget } from '@/components/dashboard/PipelineKanbanWidget';
import { FunnelChartWidget } from '@/components/dashboard/FunnelChartWidget';
import { DonutChartWidget } from '@/components/dashboard/DonutChartWidget';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export default function SalesDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['sales-dash-orders', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('sales_orders').select('id, doc_num, customer_name, total, status, doc_date, created_at').order('doc_date', { ascending: false }).limit(500);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['sales-dash-invoices', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('ar_invoices').select('id, total, status, doc_date, balance_due, paid_amount').limit(500);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: deliveryNotes = [] } = useQuery({
    queryKey: ['sales-dash-dn', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('delivery_notes').select('id, status, doc_date, total').limit(500);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['sales-dash-payments', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('incoming_payments').select('id, total_amount, doc_date, status').limit(500);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  // KPI Calculations - exclude cancelled orders
  const activeOrders = salesOrders.filter(o => o.status !== 'cancelled');
  const totalSales = activeOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalInvoiced = arInvoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
  // Payments received (includes down-payments against SOs, not just invoice payments)
  const totalPaymentsReceived = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
  // Outstanding = invoice balance_due (what's still owed on invoices)
  const totalOutstanding = arInvoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.balance_due || 0), 0);
  // Uninvoiced = sales orders total - invoiced total (what hasn't been billed yet)
  const uninvoiced = Math.max(0, totalSales - totalInvoiced);
  const openOrders = activeOrders.filter(o => o.status === 'open' || o.status === 'approved').length;
  const pendingDeliveries = deliveryNotes.filter(d => d.status === 'open' || d.status === 'draft').length;

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  // Monthly revenue chart - use latest data date as reference instead of system clock
  const monthlyData = useMemo(() => {
    // Find the latest date from orders or payments to anchor the chart
    const allDates = [
      ...salesOrders.map(o => o.doc_date),
      ...payments.map(p => p.doc_date),
    ].filter(Boolean).sort();
    const latestDate = allDates.length > 0 ? new Date(allDates[allDates.length - 1] + 'T00:00:00') : new Date();

    const months: { month: string; sales: number; collected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(latestDate, i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const label = format(d, 'MMM yyyy');
      const sales = salesOrders.filter(o => o.doc_date >= start && o.doc_date <= end).reduce((s, o) => s + (o.total || 0), 0);
      const collected = payments.filter(p => p.doc_date >= start && p.doc_date <= end && p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
      months.push({ month: label, sales, collected });
    }
    return months;
  }, [salesOrders, payments]);

  const salesSpark = monthlyData.map(m => m.sales);
  const collectedSpark = monthlyData.map(m => m.collected);

  // Order status for pipeline
  const statusMap = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    salesOrders.forEach(o => {
      const s = o.status || 'unknown';
      if (!map[s]) map[s] = { count: 0, value: 0 };
      map[s].count++;
      map[s].value += o.total || 0;
    });
    return map;
  }, [salesOrders]);

  const pipelineStages = [
    { name: 'Draft', color: '#94a3b8', ...statusMap['draft'] || { count: 0, value: 0 } },
    { name: 'Open', color: 'hsl(217, 91%, 60%)', ...statusMap['open'] || { count: 0, value: 0 } },
    { name: 'Approved', color: '#10b981', ...statusMap['approved'] || { count: 0, value: 0 } },
    { name: 'Delivered', color: '#8b5cf6', ...statusMap['delivered'] || { count: 0, value: 0 } },
    { name: 'Closed', color: '#64748b', ...statusMap['closed'] || { count: 0, value: 0 } },
  ];

  // Status donut
  const statusDonut = useMemo(() => {
    const map: Record<string, number> = {};
    salesOrders.forEach(o => { map[o.status || 'unknown'] = (map[o.status || 'unknown'] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [salesOrders]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map: Record<string, number> = {};
    salesOrders.forEach(o => { if (o.customer_name) map[o.customer_name] = (map[o.customer_name] || 0) + (o.total || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, actual: value }));
  }, [salesOrders]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isAr ? 'لوحة تحكم المبيعات' : 'Sales Dashboard'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'نظرة عامة على أداء المبيعات' : 'Sales performance overview'}</p>
        </div>
        {(() => { const m = getModuleById('sales'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <DashboardMetricCard
          title={isAr ? 'إجمالي المبيعات' : 'Total Sales'}
          value={`SAR ${fmt(totalSales)}`}
          icon={DollarSign}
          sparkData={salesSpark}
          chartType="bar"
          color="hsl(var(--primary))"
          onClick={() => navigate('/sales-orders')}
        />
        <DashboardMetricCard
          title={isAr ? 'إجمالي الفواتير' : 'Invoiced'}
          value={`SAR ${fmt(totalInvoiced)}`}
          icon={FileText}
          color="#3b82f6"
          onClick={() => navigate('/ar-invoices')}
        />
        <DashboardMetricCard
          title={isAr ? 'المدفوعات المستلمة' : 'Payments Received'}
          value={`SAR ${fmt(totalPaymentsReceived)}`}
          icon={CreditCard}
          sparkData={collectedSpark}
          chartType="area"
          color="#10b981"
          onClick={() => navigate('/incoming-payments')}
        />
        <DashboardMetricCard
          title={isAr ? 'المستحق' : 'Outstanding'}
          value={`SAR ${fmt(totalOutstanding)}`}
          icon={TrendingDown}
          color="#ef4444"
          onClick={() => navigate('/ar-invoices')}
        />
        <DashboardMetricCard
          title={isAr ? 'طلبات مفتوحة' : 'Open Orders'}
          value={openOrders}
          icon={ShoppingCart}
          color="#f59e0b"
          onClick={() => navigate('/sales-orders')}
        />
        <DashboardMetricCard
          title={isAr ? 'تسليمات معلقة' : 'Pending Delivery'}
          value={pendingDeliveries}
          icon={Truck}
          color="#8b5cf6"
          onClick={() => navigate('/delivery-notes')}
        />
      </div>

      {/* Pipeline Kanban */}
      <PipelineKanbanWidget
        title={isAr ? 'خط أنابيب المبيعات' : 'Sales Order Pipeline'}
        stages={pipelineStages}
      />

      {/* Sales Process Flow */}
      <ModuleWorkflowDiagram
        moduleName="Sales"
        moduleNameAr="المبيعات"
        steps={SALES_WORKFLOW}
        tips={[
          'The standard flow is: Quotation → Sales Order → Delivery → Invoice → Payment.',
          'You can create credit memos and returns from the Returns page.',
        ]}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChartWidget
          title={isAr ? 'المبيعات والمدفوعات الشهرية' : 'Monthly Sales vs Payments'}
          stages={monthlyData.map(m => ({ name: m.month, actual: m.sales, target: m.collected }))}
          actualLabel={isAr ? 'المبيعات' : 'Sales'}
          targetLabel={isAr ? 'المدفوعات' : 'Payments'}
        />
        <DonutChartWidget
          title={isAr ? 'حالة الطلبات' : 'Order Status Distribution'}
          data={statusDonut}
          centerValue={salesOrders.length}
          centerLabel={isAr ? 'الإجمالي' : 'Total'}
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChartWidget
          title={isAr ? 'أعلى العملاء' : 'Top Customers by Revenue'}
          stages={topCustomers}
          actualLabel={isAr ? 'الإيراد' : 'Revenue'}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{isAr ? 'آخر الطلبات' : 'Recent Orders'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-right p-2">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="text-center p-2">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {salesOrders.slice(0, 10).map(o => (
                    <tr key={o.id} className="border-t hover:bg-accent/30">
                      <td className="p-2 font-mono">SO-{o.doc_num}</td>
                      <td className="p-2 truncate max-w-[150px]">{o.customer_name}</td>
                      <td className="p-2 text-right font-mono">{fmt(o.total || 0)}</td>
                      <td className="p-2 text-center"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CommissionCalculator />
    </div>
  );
}
