import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Package, Search, ArrowUp, ArrowDown, Minus, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricingRecommendation {
  itemCode: string;
  itemName: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  direction: 'increase' | 'decrease' | 'maintain';
  reason: string;
  demandScore: number;
  profitabilityScore: number;
  competitiveScore: number;
  totalSold: number;
  avgDiscount: number;
  stockLevel: number;
}

export default function SalesPricingOptimization() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const { activeCompanyId } = useActiveCompany();

  const { data: items = [] } = useQuery({
    queryKey: ['pricing-items', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('item_code, description, unit_price, item_group, in_stock').limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []).map((d: any) => ({ ...d, item_name: d.description, on_hand: d.in_stock }));
    },
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['pricing-invoice-lines', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoice_lines').select('item_code, quantity, unit_price, discount_percent, line_total, created_at').limit(1000);
      return data || [];
    },
  });

  const fmt = (v: number) => `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v)}`;

  const recommendations: PricingRecommendation[] = useMemo(() => {
    return items.map(item => {
      const lines = invoiceLines.filter(l => l.item_code === item.item_code);
      const totalSold = lines.reduce((s, l) => s + (l.quantity || 0), 0);
      const avgSellingPrice = lines.length > 0 ? lines.reduce((s, l) => s + (l.unit_price || 0), 0) / lines.length : item.unit_price || 0;
      const avgDiscount = lines.length > 0 ? lines.reduce((s, l) => s + (l.discount_percent || 0), 0) / lines.length : 0;
      const currentPrice = item.unit_price || 0;
      const stockLevel = (item as any).on_hand || 0;

      // Demand score (0-100): based on quantity sold
      const demandScore = Math.min(100, totalSold * 5);

      // Profitability score (0-100): based on if selling price is above list price
      const priceRatio = currentPrice > 0 ? avgSellingPrice / currentPrice : 1;
      const profitabilityScore = Math.min(100, Math.round(priceRatio * 70 + (100 - avgDiscount)));

      // Competitive score (0-100): simulated based on discount trends
      const competitiveScore = Math.min(100, Math.round(80 - avgDiscount * 2 + (totalSold > 10 ? 20 : 0)));

      // Calculate suggested price
      let suggestedPrice = currentPrice;
      let reason = '';

      if (demandScore > 70 && stockLevel < totalSold * 0.3) {
        // High demand, low stock → increase price
        const increase = 1 + Math.min(0.15, (demandScore - 70) / 300);
        suggestedPrice = Math.round(currentPrice * increase * 100) / 100;
        reason = isAr ? 'طلب مرتفع ومخزون منخفض' : 'High demand + low inventory';
      } else if (avgDiscount > 15) {
        // High discounts → reduce list price slightly and standardize
        suggestedPrice = Math.round(currentPrice * (1 - avgDiscount / 200) * 100) / 100;
        reason = isAr ? 'خصومات عالية متكررة' : 'Frequent high discounts suggest lower price point';
      } else if (totalSold === 0 && stockLevel > 0) {
        // No sales with stock → decrease price
        suggestedPrice = Math.round(currentPrice * 0.9 * 100) / 100;
        reason = isAr ? 'لا مبيعات - تخفيض لتحفيز الطلب' : 'No sales — reduce to stimulate demand';
      } else if (demandScore > 50 && avgDiscount < 5) {
        // Good demand, low discounts → slight increase
        suggestedPrice = Math.round(currentPrice * 1.05 * 100) / 100;
        reason = isAr ? 'طلب مستقر مع خصومات قليلة' : 'Stable demand with minimal discounts';
      } else {
        suggestedPrice = currentPrice;
        reason = isAr ? 'السعر الحالي مناسب' : 'Current pricing is optimal';
      }

      const changePercent = currentPrice > 0 ? ((suggestedPrice - currentPrice) / currentPrice) * 100 : 0;
      const direction: 'increase' | 'decrease' | 'maintain' = changePercent > 0.5 ? 'increase' : changePercent < -0.5 ? 'decrease' : 'maintain';

      return {
        itemCode: item.item_code,
        itemName: item.item_name,
        currentPrice,
        suggestedPrice,
        changePercent: Math.round(changePercent * 10) / 10,
        direction,
        reason,
        demandScore,
        profitabilityScore,
        competitiveScore,
        totalSold,
        avgDiscount: Math.round(avgDiscount * 10) / 10,
        stockLevel,
      };
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [items, invoiceLines, isAr]);

  const filtered = search
    ? recommendations.filter(r => r.itemName.toLowerCase().includes(search.toLowerCase()) || r.itemCode.toLowerCase().includes(search.toLowerCase()))
    : recommendations;

  const summaryData = useMemo(() => [
    { name: isAr ? 'زيادة' : 'Increase', value: recommendations.filter(r => r.direction === 'increase').length, fill: '#10b981' },
    { name: isAr ? 'تخفيض' : 'Decrease', value: recommendations.filter(r => r.direction === 'decrease').length, fill: '#ef4444' },
    { name: isAr ? 'الحفاظ' : 'Maintain', value: recommendations.filter(r => r.direction === 'maintain').length, fill: '#3b82f6' },
  ], [recommendations, isAr]);

  const potentialRevenue = recommendations.filter(r => r.direction === 'increase').reduce((s, r) => s + (r.suggestedPrice - r.currentPrice) * r.totalSold, 0);

  const dirIcon = (d: string) => d === 'increase' ? <ArrowUp className="h-3 w-3 text-green-600" /> : d === 'decrease' ? <ArrowDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />;
  const dirColor = (d: string) => d === 'increase' ? 'text-green-600' : d === 'decrease' ? 'text-destructive' : 'text-muted-foreground';

  // Demand vs Price scatter
  const scatterData = recommendations.filter(r => r.totalSold > 0).map(r => ({
    x: r.currentPrice,
    y: r.totalSold,
    z: r.demandScore,
    name: r.itemName,
  }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {isAr ? 'تحسين التسعير الديناميكي' : 'Dynamic Pricing Optimization'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'توصيات تسعير بناءً على الطلب والمخزون وربحية العملاء' : 'Pricing recommendations based on demand, inventory & customer profitability'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{isAr ? 'المنتجات' : 'Products Analyzed'}</span></div>
          <p className="text-lg font-bold">{recommendations.length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">{isAr ? 'اقتراح زيادة' : 'Price Increase'}</span></div>
          <p className="text-lg font-bold">{recommendations.filter(r => r.direction === 'increase').length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">{isAr ? 'اقتراح تخفيض' : 'Price Decrease'}</span></div>
          <p className="text-lg font-bold">{recommendations.filter(r => r.direction === 'decrease').length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">{isAr ? 'إيراد إضافي محتمل' : 'Potential Revenue'}</span></div>
          <p className="text-sm font-bold">{fmt(potentialRevenue)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'ملخص التوصيات' : 'Recommendation Summary'}</CardTitle></CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات' : 'No pricing data available'} height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summaryData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {summaryData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'السعر مقابل الطلب' : 'Price vs Demand'}</CardTitle></CardHeader>
          <CardContent>
            {scatterData.length === 0 ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات مبيعات' : 'No sales data for price analysis'} height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="x" name={isAr ? 'السعر' : 'Price'} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="y" name={isAr ? 'الكمية' : 'Quantity'} tick={{ fontSize: 10 }} />
                  <ZAxis dataKey="z" range={[20, 200]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{isAr ? 'توصيات التسعير' : 'Pricing Recommendations'}</CardTitle>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">{isAr ? 'المنتج' : 'Product'}</th>
                  <th className="text-right p-2">{isAr ? 'السعر الحالي' : 'Current'}</th>
                  <th className="text-right p-2">{isAr ? 'المقترح' : 'Suggested'}</th>
                  <th className="text-center p-2">{isAr ? 'التغيير' : 'Change'}</th>
                  <th className="text-center p-2">{isAr ? 'الطلب' : 'Demand'}</th>
                  <th className="text-center p-2">{isAr ? 'المخزون' : 'Stock'}</th>
                  <th className="text-center p-2">{isAr ? 'متوسط الخصم' : 'Avg Disc.'}</th>
                  <th className="text-left p-2">{isAr ? 'السبب' : 'Reason'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(rec => (
                  <tr key={rec.itemCode} className="border-t hover:bg-accent/30">
                    <td className="p-2">
                      <div className="font-medium max-w-[140px] truncate">{rec.itemName}</div>
                      <div className="text-muted-foreground">{rec.itemCode}</div>
                    </td>
                    <td className="p-2 text-right font-mono">{fmt(rec.currentPrice)}</td>
                    <td className="p-2 text-right font-mono font-bold">{fmt(rec.suggestedPrice)}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-flex items-center gap-0.5 ${dirColor(rec.direction)}`}>
                        {dirIcon(rec.direction)}
                        {Math.abs(rec.changePercent)}%
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${rec.demandScore}%` }} />
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono">{rec.stockLevel}</td>
                    <td className="p-2 text-center">{rec.avgDiscount}%</td>
                    <td className="p-2 text-muted-foreground max-w-[180px] truncate">{rec.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {isAr ? 'لا توجد منتجات - أضف منتجات وفواتير لتوليد توصيات' : 'No products found — add items and invoices to generate pricing recommendations'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
