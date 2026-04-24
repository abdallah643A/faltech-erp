import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseRequests, usePurchaseOrders, usePurchaseQuotations, useGoodsReceipts, useAPInvoices } from '@/hooks/useProcurement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart, ClipboardList, FileText, Package, Receipt,
  BarChart3, TrendingUp, DollarSign, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ProcurementAnalytics() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const { purchaseRequests = [] } = usePurchaseRequests();
  const { purchaseOrders = [] } = usePurchaseOrders();
  const { quotations = [] } = usePurchaseQuotations();
  const { goodsReceipts = [] } = useGoodsReceipts();
  const { apInvoices = [] } = useAPInvoices();

  const openPRs = purchaseRequests.filter((pr: any) => pr.status === 'open' || pr.status === 'approved').length;
  const totalPOs = purchaseOrders.length;
  const totalPOValue = purchaseOrders.reduce((s: number, po: any) => s + (po.total || 0), 0);
  const pendingApproval = purchaseOrders.filter((po: any) => po.status === 'pending_approval').length;
  const openQuotations = quotations.filter((q: any) => q.status === 'open').length;
  const draftReceipts = goodsReceipts.filter((gr: any) => gr.status === 'draft').length;

  // PO status distribution
  const poStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    purchaseOrders.forEach((po: any) => { map[po.status || 'unknown'] = (map[po.status || 'unknown'] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [purchaseOrders]);

  // Top vendors by PO value
  const topVendors = useMemo(() => {
    const map: Record<string, number> = {};
    purchaseOrders.forEach((po: any) => { if (po.vendor_name) map[po.vendor_name] = (map[po.vendor_name] || 0) + (po.total || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value }));
  }, [purchaseOrders]);

  // Pipeline funnel
  const funnelData = useMemo(() => [
    { stage: isAr ? 'طلبات الشراء' : 'PRs', count: purchaseRequests.length },
    { stage: isAr ? 'عروض الأسعار' : 'Quotations', count: quotations.length },
    { stage: isAr ? 'أوامر الشراء' : 'POs', count: purchaseOrders.length },
    { stage: isAr ? 'استلام البضائع' : 'Receipts', count: goodsReceipts.length },
    { stage: isAr ? 'فواتير الموردين' : 'AP Invoices', count: apInvoices.length },
  ], [purchaseRequests, quotations, purchaseOrders, goodsReceipts, apInvoices]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {isAr ? 'لوحة تحكم المشتريات' : 'Procurement Dashboard'}
        </h1>
        <p className="text-xs text-muted-foreground">{isAr ? 'تحليلات وأداء دورة المشتريات' : 'Procurement cycle analytics and performance'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: isAr ? 'طلبات مفتوحة' : 'Open PRs', value: openPRs, icon: ClipboardList, color: 'text-blue-500', href: '/procurement?tab=pr' },
          { label: isAr ? 'عروض أسعار' : 'Open Quotations', value: openQuotations, icon: FileText, color: 'text-purple-500', href: '/procurement?tab=pq' },
          { label: isAr ? 'إجمالي الأوامر' : 'Total POs', value: totalPOs, icon: ShoppingCart, color: 'text-primary', href: '/procurement?tab=po' },
          { label: isAr ? 'قيمة الأوامر' : 'PO Value', value: `SAR ${fmt(totalPOValue)}`, icon: DollarSign, color: 'text-green-500', href: '/procurement?tab=po' },
          { label: isAr ? 'بانتظار الموافقة' : 'Pending Approval', value: pendingApproval, icon: Clock, color: 'text-orange-500', href: '/procurement?tab=po' },
          { label: isAr ? 'استلام مسودة' : 'Draft Receipts', value: draftReceipts, icon: Package, color: 'text-red-500', href: '/procurement?tab=grpo' },
        ].map((kpi, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(kpi.href)}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'مسار المشتريات' : 'Procurement Pipeline'}</CardTitle></CardHeader>
          <CardContent>
            {funnelData.every(d => d.count === 0) ? (
              <EmptyChartState message="No procurement data available" height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'حالة أوامر الشراء' : 'PO Status'}</CardTitle></CardHeader>
          <CardContent>
            {poStatusData.length === 0 ? (
              <EmptyChartState message="No purchase orders to display" height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={poStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {poStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'أعلى الموردين حسب القيمة' : 'Top Vendors by PO Value'}</CardTitle></CardHeader>
        <CardContent>
          {topVendors.length === 0 ? (
            <EmptyChartState message="No vendor purchase data available" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topVendors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Bar dataKey="value" name={isAr ? 'القيمة' : 'Value'} fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
