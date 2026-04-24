import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, TrendingUp, Target, BarChart3, Clock, DollarSign, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SalesRepPerformance {
  id: string;
  name: string;
  totalRevenue: number;
  orderCount: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  avgDealSize: number;
  avgCycleDays: number;
  monthlyTrend: number[];
  pipelineValue: number;
  conversionRate: number;
}

export default function SalesPerformanceAnalytics() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();

  const { data: profiles = [] } = useQuery({
    queryKey: ['perf-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name').limit(100);
      return data || [];
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['perf-sales-orders', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('id, total, status, doc_date, sales_rep_id, customer_name, created_at').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['perf-opportunities', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('opportunities').select('id, value, stage, owner_id, created_at, updated_at').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['perf-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, total, sales_rep_id, doc_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const fmt = (v: number) => `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v)}`;

  const salesReps: SalesRepPerformance[] = useMemo(() => {
    const repIds = new Set<string>();
    salesOrders.forEach(o => { if (o.sales_rep_id) repIds.add(o.sales_rep_id); });
    opportunities.forEach(o => { if (o.owner_id) repIds.add(o.owner_id); });

    return Array.from(repIds).map(repId => {
      const profile = profiles.find(p => p.user_id === repId);
      const name = profile?.full_name || `Rep ${repId.slice(0, 6)}`;
      const repOrders = salesOrders.filter(o => o.sales_rep_id === repId);
      const repOpps = opportunities.filter(o => o.owner_id === repId);
      const repInvoices = invoices.filter(i => i.sales_rep_id === repId);

      const totalRevenue = repInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const orderCount = repOrders.length;
      const wonDeals = repOpps.filter(o => o.stage === 'Closed Won').length;
      const lostDeals = repOpps.filter(o => o.stage === 'Closed Lost').length;
      const totalClosed = wonDeals + lostDeals;
      const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;
      const avgDealSize = orderCount > 0 ? repOrders.reduce((s, o) => s + (o.total || 0), 0) / orderCount : 0;

      // Avg cycle days (created to close)
      const closedOpps = repOpps.filter(o => ['Closed Won', 'Closed Lost'].includes(o.stage || ''));
      const avgCycleDays = closedOpps.length > 0
        ? Math.round(closedOpps.reduce((s, o) => s + Math.max(1, (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 86400000), 0) / closedOpps.length)
        : 0;

      // Monthly trend (last 6 months)
      const monthlyTrend: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = format(startOfMonth(d), 'yyyy-MM-dd');
        const end = format(endOfMonth(d), 'yyyy-MM-dd');
        const rev = repInvoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end).reduce((s, inv) => s + (inv.total || 0), 0);
        monthlyTrend.push(rev);
      }

      const pipelineValue = repOpps.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage || '')).reduce((s, o) => s + (o.value || 0), 0);
      const conversionRate = repOrders.length > 0 && repOpps.length > 0 ? Math.round((wonDeals / Math.max(1, repOpps.length)) * 100) : 0;

      return { id: repId, name, totalRevenue, orderCount, wonDeals, lostDeals, winRate, avgDealSize, avgCycleDays, monthlyTrend, pipelineValue, conversionRate };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [profiles, salesOrders, opportunities, invoices]);

  // Team averages
  const teamAvg = useMemo(() => {
    if (salesReps.length === 0) return { revenue: 0, winRate: 0, dealSize: 0, cycleDays: 0 };
    return {
      revenue: salesReps.reduce((s, r) => s + r.totalRevenue, 0) / salesReps.length,
      winRate: salesReps.reduce((s, r) => s + r.winRate, 0) / salesReps.length,
      dealSize: salesReps.reduce((s, r) => s + r.avgDealSize, 0) / salesReps.length,
      cycleDays: salesReps.filter(r => r.avgCycleDays > 0).reduce((s, r) => s + r.avgCycleDays, 0) / Math.max(1, salesReps.filter(r => r.avgCycleDays > 0).length),
    };
  }, [salesReps]);

  // Radar data for top 5
  const radarData = useMemo(() => {
    const top = salesReps.slice(0, 5);
    const metrics = [
      { key: 'Revenue', max: Math.max(...top.map(r => r.totalRevenue), 1) },
      { key: 'Win Rate', max: 100 },
      { key: 'Deal Size', max: Math.max(...top.map(r => r.avgDealSize), 1) },
      { key: 'Pipeline', max: Math.max(...top.map(r => r.pipelineValue), 1) },
      { key: 'Orders', max: Math.max(...top.map(r => r.orderCount), 1) },
    ];
    return metrics.map(m => {
      const entry: Record<string, string | number> = { metric: m.key };
      top.forEach(r => {
        const raw = m.key === 'Revenue' ? r.totalRevenue : m.key === 'Win Rate' ? r.winRate : m.key === 'Deal Size' ? r.avgDealSize : m.key === 'Pipeline' ? r.pipelineValue : r.orderCount;
        entry[r.name] = Math.round((raw / m.max) * 100);
      });
      return entry;
    });
  }, [salesReps]);

  // Monthly comparison chart
  const monthlyComparison = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) months.push(format(subMonths(new Date(), i), 'MMM yy'));
    return months.map((label, idx) => {
      const entry: Record<string, string | number> = { month: label };
      salesReps.slice(0, 5).forEach(r => { entry[r.name] = r.monthlyTrend[idx] || 0; });
      return entry;
    });
  }, [salesReps]);

  const topRep = salesReps[0];
  const colors = ['hsl(var(--primary))', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {isAr ? 'تحليلات أداء المبيعات' : 'Sales Performance Analytics'}
        </h1>
        <p className="text-xs text-muted-foreground">{isAr ? 'مؤشرات الأداء الفردية ومقارنة الفريق' : 'Individual KPIs, win rates & performance trends vs targets'}</p>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{isAr ? 'فريق المبيعات' : 'Sales Team'}</span></div>
          <p className="text-lg font-bold">{salesReps.length}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">{isAr ? 'متوسط الإيراد' : 'Avg Revenue'}</span></div>
          <p className="text-sm font-bold">{fmt(teamAvg.revenue)}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Trophy className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">{isAr ? 'متوسط الفوز' : 'Avg Win Rate'}</span></div>
          <p className="text-lg font-bold">{Math.round(teamAvg.winRate)}%</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">{isAr ? 'متوسط الصفقة' : 'Avg Deal Size'}</span></div>
          <p className="text-sm font-bold">{fmt(teamAvg.dealSize)}</p>
        </CardContent></Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-violet-600" /><span className="text-xs text-muted-foreground">{isAr ? 'متوسط الدورة' : 'Avg Cycle'}</span></div>
          <p className="text-lg font-bold">{Math.round(teamAvg.cycleDays)} {isAr ? 'يوم' : 'days'}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Comparison */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'مقارنة الإيرادات الشهرية' : 'Monthly Revenue Comparison (Top 5)'}</CardTitle></CardHeader>
          <CardContent>
            {salesReps.length === 0 ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات مبيعات' : 'No sales rep data available'} height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  {salesReps.slice(0, 5).map((r, i) => (
                    <Line key={r.id} type="monotone" dataKey={r.name} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Radar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'مقارنة الأداء' : 'Performance Comparison (Top 5)'}</CardTitle></CardHeader>
          <CardContent>
            {salesReps.length === 0 ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات أداء' : 'No performance data available'} height={280} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  {salesReps.slice(0, 5).map((r, i) => (
                    <Radar key={r.id} name={r.name} dataKey={r.name} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4" />
            {isAr ? 'لوحة المتصدرين' : 'Sales Leaderboard'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">{isAr ? 'مندوب المبيعات' : 'Sales Rep'}</th>
                  <th className="text-right p-2">{isAr ? 'الإيراد' : 'Revenue'}</th>
                  <th className="text-center p-2">{isAr ? 'الطلبات' : 'Orders'}</th>
                  <th className="text-center p-2">{isAr ? 'نسبة الفوز' : 'Win Rate'}</th>
                  <th className="text-right p-2">{isAr ? 'متوسط الصفقة' : 'Avg Deal'}</th>
                  <th className="text-center p-2">{isAr ? 'الدورة' : 'Cycle'}</th>
                  <th className="text-right p-2">{isAr ? 'الأنبوب' : 'Pipeline'}</th>
                  <th className="text-center p-2">{isAr ? 'مقابل المتوسط' : 'vs Avg'}</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep, idx) => {
                  const vsAvg = teamAvg.revenue > 0 ? ((rep.totalRevenue - teamAvg.revenue) / teamAvg.revenue * 100) : 0;
                  return (
                    <tr key={rep.id} className="border-t hover:bg-accent/30">
                      <td className="p-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                      <td className="p-2 font-medium">{rep.name}</td>
                      <td className="p-2 text-right font-mono">{fmt(rep.totalRevenue)}</td>
                      <td className="p-2 text-center">{rep.orderCount}</td>
                      <td className="p-2 text-center">
                        <Badge variant={rep.winRate >= 50 ? 'default' : 'secondary'} className="text-[10px]">{rep.winRate}%</Badge>
                      </td>
                      <td className="p-2 text-right font-mono">{fmt(rep.avgDealSize)}</td>
                      <td className="p-2 text-center">{rep.avgCycleDays}d</td>
                      <td className="p-2 text-right font-mono">{fmt(rep.pipelineValue)}</td>
                      <td className="p-2 text-center">
                        <span className={vsAvg >= 0 ? 'text-green-600' : 'text-destructive'}>{vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
