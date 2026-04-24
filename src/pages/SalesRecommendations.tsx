import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, TrendingUp, Users, Lightbulb, Search, Package, ArrowRight, Sparkles, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useActiveCompany } from '@/hooks/useActiveCompany';

interface Recommendation {
  customerId: string;
  customerName: string;
  type: 'cross-sell' | 'upsell' | 'replenish';
  itemCode: string;
  itemDescription: string;
  reason: string;
  confidence: number;
  estimatedValue: number;
}

export default function SalesRecommendations() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const { activeCompanyId } = useActiveCompany();

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['rec-invoice-lines', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoice_lines').select('invoice_id, item_code, description, quantity, unit_price, line_total').limit(1000);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['rec-invoices', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('ar_invoices').select('id, customer_id, customer_name, customer_code, doc_date').order('doc_date', { ascending: false }).limit(1000);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['rec-items', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('items').select('item_code, description, unit_price, item_group').limit(500);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return (data || []).map((d: any) => ({ ...d, item_name: d.description }));
    },
  });

  const fmt = (v: number) => `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v)}`;

  const recommendations: Recommendation[] = useMemo(() => {
    const results: Recommendation[] = [];

    // Build customer purchase history
    const customerPurchases: Record<string, { name: string; items: Set<string>; totalSpend: number; lastDate: string }> = {};
    invoices.forEach(inv => {
      const key = inv.customer_code || inv.customer_id || '';
      if (!key) return;
      if (!customerPurchases[key]) customerPurchases[key] = { name: inv.customer_name, items: new Set(), totalSpend: 0, lastDate: inv.doc_date };
      const lines = invoiceLines.filter(l => l.invoice_id === inv.id);
      lines.forEach(l => {
        customerPurchases[key].items.add(l.item_code);
        customerPurchases[key].totalSpend += l.line_total || 0;
      });
      if (inv.doc_date > customerPurchases[key].lastDate) customerPurchases[key].lastDate = inv.doc_date;
    });

    // Build item affinity: items frequently bought together
    const pairCount: Record<string, number> = {};
    invoices.forEach(inv => {
      const lines = invoiceLines.filter(l => l.invoice_id === inv.id);
      const codes = [...new Set(lines.map(l => l.item_code))];
      for (let i = 0; i < codes.length; i++) {
        for (let j = i + 1; j < codes.length; j++) {
          const pair = [codes[i], codes[j]].sort().join('|');
          pairCount[pair] = (pairCount[pair] || 0) + 1;
        }
      }
    });

    // Generate cross-sell recommendations
    Object.entries(customerPurchases).forEach(([custId, cust]) => {
      const purchasedItems = Array.from(cust.items);

      // Find items commonly bought with their purchased items but not yet purchased
      purchasedItems.forEach(itemCode => {
        Object.entries(pairCount).forEach(([pair, count]) => {
          if (count < 2) return;
          const [a, b] = pair.split('|');
          let suggestedItem: string | null = null;
          if (a === itemCode && !cust.items.has(b)) suggestedItem = b;
          if (b === itemCode && !cust.items.has(a)) suggestedItem = a;
          if (!suggestedItem) return;

          // Avoid duplicates
          if (results.some(r => r.customerId === custId && r.itemCode === suggestedItem)) return;

          const itemInfo = items.find(i => i.item_code === suggestedItem);
          const lineInfo = invoiceLines.find(l => l.item_code === suggestedItem);

          results.push({
            customerId: custId,
            customerName: cust.name,
            type: 'cross-sell',
            itemCode: suggestedItem,
            itemDescription: itemInfo?.item_name || lineInfo?.description || suggestedItem,
            reason: isAr ? `يُشترى عادة مع ${itemCode}` : `Frequently bought with ${itemCode}`,
            confidence: Math.min(95, 50 + count * 10),
            estimatedValue: itemInfo?.unit_price || lineInfo?.unit_price || 0,
          });
        });
      });

      // Replenishment recommendations (customer hasn't ordered in 90+ days)
      const daysSinceLast = (Date.now() - new Date(cust.lastDate).getTime()) / 86400000;
      if (daysSinceLast > 90 && purchasedItems.length > 0) {
        const topItem = purchasedItems[0];
        const itemInfo = items.find(i => i.item_code === topItem);
        const lineInfo = invoiceLines.find(l => l.item_code === topItem);
        if (!results.some(r => r.customerId === custId && r.type === 'replenish')) {
          results.push({
            customerId: custId,
            customerName: cust.name,
            type: 'replenish',
            itemCode: topItem,
            itemDescription: itemInfo?.item_name || lineInfo?.description || topItem,
            reason: isAr ? `لم يطلب منذ ${Math.round(daysSinceLast)} يوماً` : `No orders in ${Math.round(daysSinceLast)} days`,
            confidence: Math.min(85, 40 + Math.round(daysSinceLast / 10)),
            estimatedValue: cust.totalSpend / Math.max(1, purchasedItems.length),
          });
        }
      }
    });

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, 100);
  }, [invoices, invoiceLines, items, isAr]);

  const filtered = search ? recommendations.filter(r => r.customerName.toLowerCase().includes(search.toLowerCase()) || r.itemDescription.toLowerCase().includes(search.toLowerCase())) : recommendations;

  const typeDistribution = useMemo(() => [
    { name: isAr ? 'بيع متقاطع' : 'Cross-sell', value: recommendations.filter(r => r.type === 'cross-sell').length, fill: 'hsl(var(--primary))' },
    { name: isAr ? 'بيع أعلى' : 'Upsell', value: recommendations.filter(r => r.type === 'upsell').length, fill: '#3b82f6' },
    { name: isAr ? 'إعادة طلب' : 'Replenish', value: recommendations.filter(r => r.type === 'replenish').length, fill: '#10b981' },
  ], [recommendations, isAr]);

  const totalEstValue = recommendations.reduce((s, r) => s + r.estimatedValue, 0);

  const typeColor = (t: string) => t === 'cross-sell' ? 'bg-primary/10 text-primary' : t === 'upsell' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600';

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {isAr ? 'محرك توصيات الطلبات' : 'Order Recommendation Engine'}
        </h1>
        <p className="text-xs text-muted-foreground">{isAr ? 'اقتراحات البيع المتقاطع والأعلى بناءً على سجل المشتريات' : 'Cross-sell & upsell suggestions based on purchase history & product affinity'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Lightbulb className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{isAr ? 'التوصيات' : 'Recommendations'}</span></div>
          <p className="text-lg font-bold">{recommendations.length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingCart className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">{isAr ? 'بيع متقاطع' : 'Cross-sell'}</span></div>
          <p className="text-lg font-bold">{recommendations.filter(r => r.type === 'cross-sell').length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">{isAr ? 'إعادة الطلب' : 'Replenishment'}</span></div>
          <p className="text-lg font-bold">{recommendations.filter(r => r.type === 'replenish').length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">{isAr ? 'القيمة التقديرية' : 'Est. Value'}</span></div>
          <p className="text-sm font-bold">{fmt(totalEstValue)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'حسب النوع' : 'By Type'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeDistribution.map((d, i) => <Bar key={i} dataKey="value" fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{isAr ? 'قائمة التوصيات' : 'Recommendation List'}</CardTitle>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-center p-2">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="text-left p-2">{isAr ? 'المنتج المقترح' : 'Suggested Product'}</th>
                    <th className="text-left p-2">{isAr ? 'السبب' : 'Reason'}</th>
                    <th className="text-center p-2">{isAr ? 'الثقة' : 'Conf.'}</th>
                    <th className="text-right p-2">{isAr ? 'القيمة' : 'Value'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((rec, i) => (
                    <tr key={i} className="border-t hover:bg-accent/30">
                      <td className="p-2 font-medium max-w-[120px] truncate">{rec.customerName}</td>
                      <td className="p-2 text-center"><Badge className={`text-[10px] ${typeColor(rec.type)}`}>{rec.type}</Badge></td>
                      <td className="p-2 max-w-[150px] truncate">{rec.itemDescription}</td>
                      <td className="p-2 text-muted-foreground max-w-[180px] truncate">{rec.reason}</td>
                      <td className="p-2 text-center"><Badge variant={rec.confidence >= 70 ? 'default' : 'secondary'} className="text-[10px]">{rec.confidence}%</Badge></td>
                      <td className="p-2 text-right font-mono">{fmt(rec.estimatedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {isAr ? 'لا توجد توصيات - أضف المزيد من بيانات الفواتير لتوليد اقتراحات' : 'No recommendations yet — add more invoice data to generate suggestions'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
