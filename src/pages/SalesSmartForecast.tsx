import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Brain, AlertTriangle, CheckCircle, Target, BarChart3, Calendar, Zap } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { useActiveCompany } from '@/hooks/useActiveCompany';

function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  data.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;
  return { slope, intercept: yMean - slope * xMean };
}

function calculateSeasonalIndex(monthlyData: { month: number; value: number }[]): Record<number, number> {
  const monthTotals: Record<number, number[]> = {};
  monthlyData.forEach(d => {
    if (!monthTotals[d.month]) monthTotals[d.month] = [];
    monthTotals[d.month].push(d.value);
  });
  const grandAvg = monthlyData.reduce((s, d) => s + d.value, 0) / (monthlyData.length || 1);
  const indices: Record<number, number> = {};
  for (let m = 0; m < 12; m++) {
    const vals = monthTotals[m] || [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : grandAvg;
    indices[m] = grandAvg > 0 ? avg / grandAvg : 1;
  }
  return indices;
}

export default function SalesSmartForecast() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();

  const { data: invoices = [] } = useQuery({
    queryKey: ['forecast-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('total, doc_date, status').order('doc_date', { ascending: true }).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['forecast-opportunities', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('opportunities').select('value, probability, stage, expected_close').limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['forecast-orders', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('total, doc_date, status').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const fmt = (v: number) => `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v)}`;

  // Build monthly historical data (last 24 months)
  const monthlyRevenue = useMemo(() => {
    const months: { label: string; month: number; year: number; revenue: number; orders: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const rev = invoices.filter(inv => inv.doc_date >= start && inv.doc_date <= end).reduce((s, inv) => s + (inv.total || 0), 0);
      const ord = salesOrders.filter(o => o.doc_date >= start && o.doc_date <= end).length;
      months.push({ label: format(d, 'MMM yy'), month: d.getMonth(), year: d.getFullYear(), revenue: rev, orders: ord });
    }
    return months;
  }, [invoices, salesOrders]);

  // Seasonal indices
  const seasonalIndices = useMemo(() => {
    return calculateSeasonalIndex(monthlyRevenue.map(m => ({ month: m.month, value: m.revenue })));
  }, [monthlyRevenue]);

  // Forecast next 6 months
  const forecast = useMemo(() => {
    const values = monthlyRevenue.map(m => m.revenue);
    const { slope, intercept } = linearRegression(values);
    const n = values.length;

    const results: { label: string; predicted: number; optimistic: number; pessimistic: number; confidence: number }[] = [];
    for (let i = 1; i <= 6; i++) {
      const futureDate = addMonths(new Date(), i);
      const trendValue = intercept + slope * (n + i - 1);
      const seasonIdx = seasonalIndices[futureDate.getMonth()] || 1;
      const predicted = Math.max(0, trendValue * seasonIdx);
      const variance = values.length > 3 ? Math.sqrt(values.slice(-6).reduce((s, v) => s + (v - (values.reduce((a, b) => a + b, 0) / values.length)) ** 2, 0) / Math.min(6, values.length)) : predicted * 0.2;
      const confidence = Math.max(40, Math.min(95, 85 - i * 5 + Math.min(values.filter(v => v > 0).length * 2, 20)));

      results.push({
        label: format(futureDate, 'MMM yy'),
        predicted: Math.round(predicted),
        optimistic: Math.round(predicted + variance * 1.5),
        pessimistic: Math.round(Math.max(0, predicted - variance * 1.5)),
        confidence,
      });
    }
    return results;
  }, [monthlyRevenue, seasonalIndices]);

  // Pipeline weighted value
  const pipelineWeighted = opportunities.reduce((s, o) => s + (o.value || 0) * (o.probability || 0) / 100, 0);
  const pipelineTotal = opportunities.reduce((s, o) => s + (o.value || 0), 0);
  const activeOpps = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage || ''));

  // Quarterly forecast
  const quarterlyForecast = useMemo(() => {
    const q1 = forecast.slice(0, 3).reduce((s, f) => s + f.predicted, 0);
    const q2 = forecast.slice(3, 6).reduce((s, f) => s + f.predicted, 0);
    const historicalQ = monthlyRevenue.slice(-3).reduce((s, m) => s + m.revenue, 0);
    return { currentQ: historicalQ, nextQ: q1, q2, growth: historicalQ > 0 ? ((q1 - historicalQ) / historicalQ * 100) : 0 };
  }, [forecast, monthlyRevenue]);

  // Risk indicators
  const risks = useMemo(() => {
    const items: { label: string; severity: 'high' | 'medium' | 'low'; detail: string }[] = [];
    const recentMonths = monthlyRevenue.slice(-3);
    const avgRecent = recentMonths.reduce((s, m) => s + m.revenue, 0) / 3;
    const prevMonths = monthlyRevenue.slice(-6, -3);
    const avgPrev = prevMonths.reduce((s, m) => s + m.revenue, 0) / 3;

    if (avgPrev > 0 && avgRecent < avgPrev * 0.8) {
      items.push({ label: isAr ? 'انخفاض الإيرادات' : 'Revenue Decline', severity: 'high', detail: isAr ? 'انخفاض 20%+ في آخر 3 أشهر' : '20%+ decline in last 3 months vs prior period' });
    }
    if (activeOpps.length < 5) {
      items.push({ label: isAr ? 'ضعف خط المبيعات' : 'Weak Pipeline', severity: 'medium', detail: isAr ? `${activeOpps.length} فرص نشطة فقط` : `Only ${activeOpps.length} active opportunities` });
    }
    if (pipelineWeighted < quarterlyForecast.nextQ * 0.5) {
      items.push({ label: isAr ? 'فجوة التغطية' : 'Coverage Gap', severity: 'high', detail: isAr ? 'قيمة الأنبوب المرجحة أقل من 50% من التوقع' : 'Weighted pipeline < 50% of forecast' });
    }
    if (items.length === 0) {
      items.push({ label: isAr ? 'وضع صحي' : 'Healthy Status', severity: 'low', detail: isAr ? 'لا توجد مخاطر حرجة' : 'No critical risks detected' });
    }
    return items;
  }, [monthlyRevenue, activeOpps, pipelineWeighted, quarterlyForecast, isAr]);

  // Seasonal radar data
  const seasonalRadar = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((name, i) => ({
      month: name,
      index: Math.round((seasonalIndices[i] || 1) * 100),
    }));
  }, [seasonalIndices]);

  // Combined chart data
  const combinedChart = useMemo(() => {
    const historical = monthlyRevenue.slice(-12).map(m => ({
      name: m.label,
      actual: m.revenue,
      predicted: null as number | null,
      optimistic: null as number | null,
      pessimistic: null as number | null,
    }));
    const forecastData = forecast.map(f => ({
      name: f.label,
      actual: null as number | null,
      predicted: f.predicted,
      optimistic: f.optimistic,
      pessimistic: f.pessimistic,
    }));
    return [...historical, ...forecastData];
  }, [monthlyRevenue, forecast]);

  const avgConfidence = forecast.length > 0 ? Math.round(forecast.reduce((s, f) => s + f.confidence, 0) / forecast.length) : 0;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {isAr ? 'التنبؤ الذكي بالمبيعات' : 'Smart Sales Forecasting'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'توقعات مدعومة بالذكاء الاصطناعي مع مؤشرات الثقة' : 'AI-powered predictions with confidence levels & risk indicators'}</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Zap className="h-3 w-3" />
          {isAr ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-primary/20 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{isAr ? 'توقع الربع القادم' : 'Next Quarter Forecast'}</span>
            </div>
            <p className="text-lg font-bold">{fmt(quarterlyForecast.nextQ)}</p>
            <p className={`text-xs ${quarterlyForecast.growth >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {quarterlyForecast.growth >= 0 ? '↑' : '↓'} {Math.abs(quarterlyForecast.growth).toFixed(1)}% vs current
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">{isAr ? 'قيمة الأنبوب المرجحة' : 'Weighted Pipeline'}</span>
            </div>
            <p className="text-lg font-bold">{fmt(pipelineWeighted)}</p>
            <p className="text-xs text-muted-foreground">{fmt(pipelineTotal)} {isAr ? 'إجمالي' : 'total'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">{isAr ? 'متوسط الثقة' : 'Avg Confidence'}</span>
            </div>
            <p className="text-lg font-bold">{avgConfidence}%</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'عبر 6 أشهر' : 'across 6 months'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${risks[0]?.severity === 'high' ? 'text-destructive' : risks[0]?.severity === 'medium' ? 'text-amber-500' : 'text-green-600'}`} />
              <span className="text-xs text-muted-foreground">{isAr ? 'حالة المخاطر' : 'Risk Status'}</span>
            </div>
            <p className="text-sm font-bold">{risks[0]?.label}</p>
            <p className="text-xs text-muted-foreground">{risks[0]?.detail}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {isAr ? 'الإيرادات الفعلية والمتوقعة' : 'Actual vs Forecasted Revenue'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={combinedChart}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name={isAr ? 'فعلي' : 'Actual'} connectNulls={false} />
              <Area type="monotone" dataKey="optimistic" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name={isAr ? 'متفائل' : 'Optimistic'} strokeDasharray="4 4" connectNulls={false} />
              <Area type="monotone" dataKey="predicted" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name={isAr ? 'متوقع' : 'Predicted'} connectNulls={false} />
              <Area type="monotone" dataKey="pessimistic" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name={isAr ? 'متشائم' : 'Pessimistic'} strokeDasharray="4 4" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Forecast Table */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{isAr ? 'التوقعات الشهرية' : 'Monthly Forecast Breakdown'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">{isAr ? 'الشهر' : 'Month'}</th>
                  <th className="text-right p-2">{isAr ? 'متوقع' : 'Predicted'}</th>
                  <th className="text-right p-2">{isAr ? 'نطاق' : 'Range'}</th>
                  <th className="text-center p-2">{isAr ? 'الثقة' : 'Confidence'}</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map(f => (
                  <tr key={f.label} className="border-t">
                    <td className="p-2 font-medium">{f.label}</td>
                    <td className="p-2 text-right font-mono">{fmt(f.predicted)}</td>
                    <td className="p-2 text-right text-muted-foreground">{fmt(f.pessimistic)} - {fmt(f.optimistic)}</td>
                    <td className="p-2 text-center">
                      <Badge variant={f.confidence >= 75 ? 'default' : f.confidence >= 60 ? 'secondary' : 'outline'} className="text-[10px]">
                        {f.confidence}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Seasonal Pattern */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isAr ? 'الأنماط الموسمية' : 'Seasonal Patterns'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={seasonalRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="month" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name={isAr ? 'مؤشر موسمي' : 'Seasonal Index'} dataKey="index" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Indicators */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{isAr ? 'مؤشرات المخاطر' : 'Risk Indicators'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {risks.map((risk, i) => (
              <div key={i} className={`p-3 rounded-lg border ${risk.severity === 'high' ? 'border-destructive/30 bg-destructive/5' : risk.severity === 'medium' ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-4 w-4 ${risk.severity === 'high' ? 'text-destructive' : risk.severity === 'medium' ? 'text-amber-500' : 'text-green-600'}`} />
                  <span className="text-sm font-semibold">{risk.label}</span>
                  <Badge variant={risk.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] ml-auto">{risk.severity.toUpperCase()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{risk.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
