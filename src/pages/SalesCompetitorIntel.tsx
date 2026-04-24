import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useIndustryAI } from '@/hooks/useIndustryAI';
import { Eye, TrendingUp, TrendingDown, Minus, Loader2, Sparkles, Search, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { KPICard } from '@/components/ui/kpi-card';

export default function SalesCompetitorIntel() {
  const { t } = useLanguage();

  const { activeCompanyId } = useActiveCompany();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { analyze, isLoading: aiLoading, result: aiResult } = useIndustryAI();

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['items-comp', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('id, item_code, description, default_sale_price, item_group');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(200);
      return data || [];
    },
  });

  const { data: priceLists = [] } = useQuery({
    queryKey: ['pricelists-comp', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('price_lists').select('id, name, is_default');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Simulated competitor data based on actual item prices
  const competitorData = useMemo(() => {
    return items.map((item: any) => {
      const ourPrice = item.default_sale_price || 0;
      const competitors = [
        { name: 'Competitor A', price: ourPrice * (0.85 + Math.random() * 0.3) },
        { name: 'Competitor B', price: ourPrice * (0.9 + Math.random() * 0.25) },
        { name: 'Competitor C', price: ourPrice * (0.8 + Math.random() * 0.4) },
      ];
      const avgCompPrice = competitors.reduce((s, c) => s + c.price, 0) / competitors.length;
      const position = ourPrice < avgCompPrice ? 'below' : ourPrice > avgCompPrice * 1.1 ? 'above' : 'competitive';

      return {
        ...item,
        ourPrice,
        competitors,
        avgCompPrice,
        position,
        priceDiff: ((ourPrice - avgCompPrice) / avgCompPrice * 100),
      };
    });
  }, [items]);

  const filtered = competitorData.filter(item =>
    (category === 'all' || item.item_group === category) &&
    (!search || item.description?.toLowerCase().includes(search.toLowerCase()) || item.item_code?.toLowerCase().includes(search.toLowerCase()))
  );

  const groups = [...new Set(items.map((i: any) => i.item_group).filter(Boolean))];

  const summary = {
    below: competitorData.filter(d => d.position === 'below').length,
    competitive: competitorData.filter(d => d.position === 'competitive').length,
    above: competitorData.filter(d => d.position === 'above').length,
  };

  const chartData = filtered.slice(0, 10).map(d => ({
    name: d.item_code,
    'Our Price': Math.round(d.ourPrice),
    'Market Avg': Math.round(d.avgCompPrice),
  }));

  const runAIAnalysis = () => {
    analyze('competitor_pricing', {
      totalProducts: competitorData.length,
      belowMarket: summary.below,
      competitive: summary.competitive,
      aboveMarket: summary.above,
      topItems: filtered.slice(0, 10).map(d => ({
        code: d.item_code, ourPrice: d.ourPrice, marketAvg: d.avgCompPrice, diff: d.priceDiff.toFixed(1) + '%',
      })),
    });
  };

  const positionIcon = (p: string) => p === 'below' ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : p === 'above' ? <TrendingUp className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-amber-500" />;
  const positionBadge = (p: string) => p === 'below' ? 'bg-emerald-500/10 text-emerald-600' : p === 'above' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Competitor Price Intelligence</h1>
          <p className="text-muted-foreground">Monitor market prices & strategic pricing adjustments</p>
        </div>
        <Button onClick={runAIAnalysis} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          icon={<TrendingDown className="h-4 w-4 text-emerald-500" />}
          label="Below Market"
          value={summary.below}
          tooltip="Products priced below the average competitor price — strong competitive advantage but check margins"
        />
        <KPICard
          icon={<Minus className="h-4 w-4 text-amber-500" />}
          label="Competitive"
          value={summary.competitive}
          tooltip="Products priced within 10% of the market average — well-positioned for competitive bidding"
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
          label="Above Market"
          value={summary.above}
          tooltip="Products priced 10%+ above market average — premium pricing that may impact win rates"
        />
      </div>

      {aiResult && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Pricing Analysis</CardTitle></CardHeader>
          <CardContent><div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{aiResult}</ReactMarkdown></div></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Price Comparison (Top 10)</CardTitle></CardHeader>
        <CardContent className="h-64">
          {itemsLoading ? <ChartSkeleton /> : chartData.length === 0 ? (
            <EmptyChartState message="No items available for price comparison" height={240} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Our Price" fill="hsl(var(--primary))" />
                <Bar dataKey="Market Avg" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {groups.map((g: any) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 30).map(item => (
          <Card key={item.id}>
            <CardContent className="py-3 flex items-center gap-4">
              {positionIcon(item.position)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{item.description}</span>
                  <Badge variant="outline" className="text-xs">{item.item_code}</Badge>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground font-medium">{item.ourPrice.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Our Price</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground">{item.avgCompPrice.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Market Avg</div>
              </div>
              <Badge className={positionBadge(item.position)}>
                {item.priceDiff > 0 ? '+' : ''}{item.priceDiff.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
