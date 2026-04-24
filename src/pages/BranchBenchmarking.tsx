import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranchBenchmarking } from '@/hooks/useBranchBenchmarking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Percent, Clock } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Branch Performance Benchmarking', ar: 'قياس أداء الفروع' },
  overview: { en: 'Overview', ar: 'نظرة عامة' },
  comparison: { en: 'Comparison', ar: 'المقارنة' },
  itemMix: { en: 'Item Mix', ar: 'مزيج المنتجات' },
  totalSales: { en: 'Total Sales', ar: 'إجمالي المبيعات' },
  avgBasket: { en: 'Avg Basket Size', ar: 'متوسط حجم السلة' },
  avgTxn: { en: 'Avg Transaction', ar: 'متوسط المعاملة' },
  margin: { en: 'Gross Margin', ar: 'هامش الربح' },
  refundRate: { en: 'Refund Rate', ar: 'معدل الاسترجاع' },
  discountRate: { en: 'Discount Rate', ar: 'معدل الخصم' },
  salesPerCashier: { en: 'Sales/Cashier', ar: 'مبيعات/كاشير' },
  idleTime: { en: 'Idle Minutes', ar: 'دقائق الخمول' },
  conversion: { en: 'Conversion', ar: 'التحويل' },
  transactions: { en: 'Transactions', ar: 'المعاملات' },
  period: { en: 'Period', ar: 'الفترة' },
  noData: { en: 'No benchmark data yet. Data will populate as POS transactions are processed.', ar: 'لا توجد بيانات بعد. ستظهر البيانات عند معالجة معاملات نقاط البيع.' },
  itemCode: { en: 'Item', ar: 'المنتج' },
  category: { en: 'Category', ar: 'الفئة' },
  qtySold: { en: 'Qty Sold', ar: 'الكمية المباعة' },
  revenue: { en: 'Revenue', ar: 'الإيرادات' },
  pctRevenue: { en: '% Revenue', ar: '% الإيرادات' },
};

export default function BranchBenchmarkingPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const { metrics, itemMix, isLoading } = useBranchBenchmarking();
  const [periodFilter, setPeriodFilter] = useState('daily');

  const filtered = (metrics || []).filter((m: any) => m.period_type === periodFilter);

  // Aggregate by branch
  const branchMap = new Map<string, any>();
  filtered.forEach((m: any) => {
    const key = m.branch_id || 'unknown';
    if (!branchMap.has(key)) branchMap.set(key, { ...m, count: 1 });
    else {
      const existing = branchMap.get(key);
      existing.total_sales += m.total_sales;
      existing.total_transactions += m.total_transactions;
      existing.refund_count += m.refund_count;
      existing.discount_count += m.discount_count;
      existing.count++;
    }
  });
  const branches = Array.from(branchMap.values());

  const totals = {
    sales: branches.reduce((s, b) => s + (b.total_sales || 0), 0),
    txns: branches.reduce((s, b) => s + (b.total_transactions || 0), 0),
    avgBasket: branches.length ? branches.reduce((s, b) => s + (b.avg_basket_size || 0), 0) / branches.length : 0,
    avgTxn: branches.length ? branches.reduce((s, b) => s + (b.avg_transaction_value || 0), 0) / branches.length : 0,
    margin: branches.length ? branches.reduce((s, b) => s + (b.gross_margin_pct || 0), 0) / branches.length : 0,
    refundRate: branches.length ? branches.reduce((s, b) => s + (b.refund_rate || 0), 0) / branches.length : 0,
    discountRate: branches.length ? branches.reduce((s, b) => s + (b.discount_rate || 0), 0) / branches.length : 0,
  };

  const kpis = [
    { label: t.totalSales[lang], value: totals.sales.toLocaleString(), icon: DollarSign, color: 'text-green-500' },
    { label: t.transactions[lang], value: totals.txns.toLocaleString(), icon: ShoppingCart, color: 'text-blue-500' },
    { label: t.avgBasket[lang], value: totals.avgBasket.toFixed(1), icon: TrendingUp, color: 'text-purple-500' },
    { label: t.avgTxn[lang], value: totals.avgTxn.toFixed(2), icon: BarChart3, color: 'text-orange-500' },
    { label: t.margin[lang], value: `${totals.margin.toFixed(1)}%`, icon: Percent, color: 'text-emerald-500' },
    { label: t.refundRate[lang], value: `${totals.refundRate.toFixed(2)}%`, icon: TrendingDown, color: 'text-red-500' },
    { label: t.discountRate[lang], value: `${totals.discountRate.toFixed(2)}%`, icon: Percent, color: 'text-amber-500' },
  ];

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title[lang]}</h1>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">{t.comparison[lang]}</TabsTrigger>
          <TabsTrigger value="itemMix">{t.itemMix[lang]}</TabsTrigger>
        </TabsList>
        <TabsContent value="comparison">
          {branches.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noData[lang]}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left">Branch</th>
                        <th className="p-3 text-right">{t.totalSales[lang]}</th>
                        <th className="p-3 text-right">{t.transactions[lang]}</th>
                        <th className="p-3 text-right">{t.avgTxn[lang]}</th>
                        <th className="p-3 text-right">{t.margin[lang]}</th>
                        <th className="p-3 text-right">{t.refundRate[lang]}</th>
                        <th className="p-3 text-right">{t.discountRate[lang]}</th>
                        <th className="p-3 text-right">{t.salesPerCashier[lang]}</th>
                        <th className="p-3 text-right">{t.idleTime[lang]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b: any) => (
                        <tr key={b.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{b.branch_id?.slice(0, 8) || '-'}</td>
                          <td className="p-3 text-right">{(b.total_sales || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">{b.total_transactions || 0}</td>
                          <td className="p-3 text-right">{(b.avg_transaction_value || 0).toFixed(2)}</td>
                          <td className="p-3 text-right">{(b.gross_margin_pct || 0).toFixed(1)}%</td>
                          <td className="p-3 text-right">
                            <Badge variant={(b.refund_rate || 0) > 5 ? 'destructive' : 'secondary'}>
                              {(b.refund_rate || 0).toFixed(2)}%
                            </Badge>
                          </td>
                          <td className="p-3 text-right">{(b.discount_rate || 0).toFixed(2)}%</td>
                          <td className="p-3 text-right">{(b.sales_per_cashier || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">{(b.idle_minutes || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="itemMix">
          {!(itemMix?.length) ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noData[lang]}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left">{t.itemCode[lang]}</th>
                        <th className="p-3 text-left">{t.category[lang]}</th>
                        <th className="p-3 text-right">{t.qtySold[lang]}</th>
                        <th className="p-3 text-right">{t.revenue[lang]}</th>
                        <th className="p-3 text-right">{t.pctRevenue[lang]}</th>
                        <th className="p-3 text-right">{t.margin[lang]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(itemMix || []).slice(0, 50).map((item: any) => (
                        <tr key={item.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{item.item_name || item.item_code}</td>
                          <td className="p-3">{item.category || '-'}</td>
                          <td className="p-3 text-right">{item.quantity_sold}</td>
                          <td className="p-3 text-right">{(item.revenue || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">{(item.pct_of_total_revenue || 0).toFixed(1)}%</td>
                          <td className="p-3 text-right">{(item.margin || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
