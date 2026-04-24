import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useIndustryAI } from '@/hooks/useIndustryAI';
import { Users, Crown, TrendingUp, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomerSegment {
  id: string;
  code: string;
  name: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderDays: number;
  segment: 'platinum' | 'gold' | 'silver' | 'bronze' | 'dormant';
  growthPotential: 'high' | 'medium' | 'low';
}

const SEGMENT_COLORS: Record<string, string> = {
  platinum: '#6366f1', gold: '#f59e0b', silver: '#94a3b8', bronze: '#d97706', dormant: '#ef4444',
};

export default function SalesSegmentation() {
  const { t } = useLanguage();

  const { activeCompanyId } = useActiveCompany();
  const { analyze, isLoading: aiLoading, result: aiResult } = useIndustryAI();

  const { data: partners = [] } = useQuery({
    queryKey: ['bp-seg', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name').eq('card_type', 'customer');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['inv-seg', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('customer_code, doc_date, total');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const segments = useMemo<CustomerSegment[]>(() => {
    const now = Date.now();
    return partners.map((bp: any) => {
      const custInv = invoices.filter((i: any) => i.customer_code === bp.card_code);
      const totalRevenue = custInv.reduce((s: number, i: any) => s + (i.total || 0), 0);
      const orderCount = custInv.length;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
      const lastOrder = custInv.sort((a: any, b: any) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime())[0];
      const lastOrderDays = lastOrder ? Math.floor((now - new Date(lastOrder.doc_date).getTime()) / 86400000) : 999;

      let segment: 'platinum' | 'gold' | 'silver' | 'bronze' | 'dormant';
      if (lastOrderDays > 180) segment = 'dormant';
      else if (totalRevenue > 100000 && orderCount > 10) segment = 'platinum';
      else if (totalRevenue > 50000 && orderCount > 5) segment = 'gold';
      else if (totalRevenue > 10000) segment = 'silver';
      else segment = 'bronze';

      const growthPotential: 'high' | 'medium' | 'low' = segment === 'dormant' ? 'low' : avgOrderValue > 5000 && lastOrderDays < 60 ? 'high' : 'medium';

      return { id: bp.id, code: bp.card_code, name: bp.card_name, totalRevenue, orderCount, avgOrderValue, lastOrderDays, segment, growthPotential };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [partners, invoices]);

  const segmentSummary = useMemo(() => {
    const groups: Record<string, { count: number; revenue: number }> = {};
    segments.forEach(s => {
      if (!groups[s.segment]) groups[s.segment] = { count: 0, revenue: 0 };
      groups[s.segment].count++;
      groups[s.segment].revenue += s.totalRevenue;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
  }, [segments]);

  const runAI = () => {
    analyze('customer_segmentation', {
      totalCustomers: segments.length,
      segments: segmentSummary,
      topCustomers: segments.slice(0, 10).map(s => ({ name: s.name, revenue: s.totalRevenue, orders: s.orderCount, segment: s.segment })),
    });
  };

  const segBadge = (s: string) => {
    const map: Record<string, string> = {
      platinum: 'bg-indigo-500/10 text-indigo-600', gold: 'bg-amber-500/10 text-amber-600',
      silver: 'bg-slate-400/10 text-slate-600', bronze: 'bg-orange-500/10 text-orange-600', dormant: 'bg-red-500/10 text-red-600',
    };
    return map[s] || '';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Segmentation & Targeting</h1>
          <p className="text-muted-foreground">Group customers by profitability, growth & behavior</p>
        </div>
        <Button onClick={runAI} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI Strategy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['platinum', 'gold', 'silver', 'bronze', 'dormant'].map(seg => {
          const data = segmentSummary.find(s => s.name === seg);
          const icons: Record<string, any> = { platinum: Crown, gold: TrendingUp, silver: Users, bronze: Users, dormant: AlertTriangle };
          const Icon = icons[seg] || Users;
          return (
            <Card key={seg} className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <Icon className="h-7 w-7 mx-auto mb-2" style={{ color: SEGMENT_COLORS[seg] }} />
              <div className="text-2xl font-bold text-foreground">{data?.count || 0}</div>
              <p className="text-sm text-muted-foreground capitalize">{seg}</p>
              <p className="text-xs text-muted-foreground mt-1">{(data?.revenue || 0).toLocaleString()} SAR</p>
            </CardContent></Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue by Segment</CardTitle></CardHeader>
          <CardContent className="h-64">
            {segmentSummary.length === 0 ? (
              <EmptyChartState message="No customer segments available" height={240} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segmentSummary} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {segmentSummary.map((s, i) => <Cell key={i} fill={SEGMENT_COLORS[s.name] || '#888'} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer Count by Segment</CardTitle></CardHeader>
          <CardContent className="h-64">
            {segmentSummary.length === 0 ? (
              <EmptyChartState message="No customer count data" height={240} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))">
                    {segmentSummary.map((s, i) => <Cell key={i} fill={SEGMENT_COLORS[s.name] || '#888'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {aiResult && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Engagement Strategy</CardTitle></CardHeader>
          <CardContent><div className="prose prose-sm max-w-none text-foreground"><ReactMarkdown>{aiResult}</ReactMarkdown></div></CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Customer List</h2>
        {segments.slice(0, 50).map(s => (
          <Card key={s.id}>
            <CardContent className="py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{s.name}</span>
                  <Badge variant="outline" className="text-xs">{s.code}</Badge>
                  <Badge className={segBadge(s.segment)}>{s.segment}</Badge>
                  {s.growthPotential === 'high' && <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">High Growth</Badge>}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium text-foreground">{s.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{s.orderCount} orders</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground">{s.avgOrderValue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Avg Order</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
