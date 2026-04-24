import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Clock, TrendingUp, DollarSign, Zap } from 'lucide-react';
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import type { Opportunity } from '@/hooks/useOpportunities';

interface PipelineVelocityProps {
  opportunities: Opportunity[];
  formatCurrency: (value: number) => string;
}

const stageOrder = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export function PipelineVelocity({ opportunities, formatCurrency }: PipelineVelocityProps) {
  const velocityMetrics = useMemo(() => {
    const activeOpps = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage));
    const wonOpps = opportunities.filter(o => o.stage === 'Closed Won');

    // Average days in pipeline
    const avgDays = activeOpps.length > 0
      ? Math.round(activeOpps.reduce((s, o) => s + differenceInDays(new Date(), parseISO(o.created_at)), 0) / activeOpps.length)
      : 0;

    // Average deal cycle (won deals)
    const avgWonCycle = wonOpps.length > 0
      ? Math.round(wonOpps.reduce((s, o) => s + differenceInDays(parseISO(o.updated_at), parseISO(o.created_at)), 0) / wonOpps.length)
      : 0;

    // Pipeline velocity = (# deals * avg value * win rate) / avg cycle
    const totalClosed = opportunities.filter(o => ['Closed Won', 'Closed Lost'].includes(o.stage));
    const winRate = totalClosed.length > 0 ? wonOpps.length / totalClosed.length : 0;
    const avgValue = activeOpps.length > 0 ? activeOpps.reduce((s, o) => s + o.value, 0) / activeOpps.length : 0;
    const velocity = avgWonCycle > 0 ? (activeOpps.length * avgValue * winRate) / avgWonCycle : 0;

    return { avgDays, avgWonCycle, velocity, winRate: Math.round(winRate * 100) };
  }, [opportunities]);

  // Stage distribution with avg age
  const stageData = useMemo(() => {
    return stageOrder.slice(0, 4).map(stage => {
      const stageOpps = opportunities.filter(o => o.stage === stage);
      const avgAge = stageOpps.length > 0
        ? Math.round(stageOpps.reduce((s, o) => s + differenceInDays(new Date(), parseISO(o.created_at)), 0) / stageOpps.length)
        : 0;
      return {
        stage,
        count: stageOpps.length,
        value: stageOpps.reduce((s, o) => s + o.value, 0),
        avgAge,
      };
    });
  }, [opportunities]);

  // Monthly pipeline trend
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const created = opportunities.filter(o => {
        const d = parseISO(o.created_at);
        return isAfter(d, start) && isBefore(d, end);
      });
      const won = opportunities.filter(o => {
        if (o.stage !== 'Closed Won') return false;
        const d = parseISO(o.updated_at);
        return isAfter(d, start) && isBefore(d, end);
      });
      return {
        month: format(month, 'MMM'),
        created: created.length,
        won: won.length,
        createdValue: created.reduce((s, o) => s + o.value, 0),
        wonValue: won.reduce((s, o) => s + o.value, 0),
      };
    });
  }, [opportunities]);

  // Forecast data by expected close month
  const forecastData = useMemo(() => {
    const activeOpps = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage) && o.expected_close);
    const monthMap: Record<string, { month: string; total: number; weighted: number; count: number }> = {};
    activeOpps.forEach(o => {
      const m = o.expected_close!.substring(0, 7);
      if (!monthMap[m]) monthMap[m] = { month: m, total: 0, weighted: 0, count: 0 };
      monthMap[m].total += o.value;
      monthMap[m].weighted += o.value * (o.probability / 100);
      monthMap[m].count += 1;
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(0, 6);
  }, [opportunities]);

  return (
    <div className="space-y-6">
      {/* Velocity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Pipeline Velocity</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(velocityMetrics.velocity)}</p>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Avg Cycle</span>
            </div>
            <p className="text-lg font-bold">{velocityMetrics.avgWonCycle} days</p>
            <p className="text-xs text-muted-foreground">for won deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Age</span>
            </div>
            <p className="text-lg font-bold">{velocityMetrics.avgDays} days</p>
            <p className="text-xs text-muted-foreground">active pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-lg font-bold">{velocityMetrics.winRate}%</p>
            <p className="text-xs text-muted-foreground">of closed deals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stage Distribution & Avg Age</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number, name: string) => name === 'avgAge' ? `${v} days` : v} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" name="Count" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgAge" fill="hsl(var(--chart-3))" name="Avg Age (days)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Pipeline Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Created" />
                <Area type="monotone" dataKey="won" fill="hsl(var(--chart-2) / 0.2)" stroke="hsl(var(--chart-2))" name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue Forecast by Expected Close</CardTitle>
          </CardHeader>
          <CardContent>
            {forecastData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No forecast data - set expected close dates on opportunities</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary) / 0.3)" name="Total Pipeline" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="weighted" fill="hsl(var(--chart-2))" name="Weighted Forecast" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
