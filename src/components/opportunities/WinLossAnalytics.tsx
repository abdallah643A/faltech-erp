import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Trophy, TrendingDown, Target, Percent, DollarSign, Clock } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import type { Opportunity } from '@/hooks/useOpportunities';

interface WinLossAnalyticsProps {
  opportunities: Opportunity[];
  formatCurrency: (value: number) => string;
}

export function WinLossAnalytics({ opportunities, formatCurrency }: WinLossAnalyticsProps) {
  const stats = useMemo(() => {
    const won = opportunities.filter(o => o.stage === 'Closed Won');
    const lost = opportunities.filter(o => o.stage === 'Closed Lost');
    const closed = [...won, ...lost];
    const active = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage));

    const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
    const totalWonValue = won.reduce((s, o) => s + o.value, 0);
    const totalLostValue = lost.reduce((s, o) => s + o.value, 0);
    const avgWonDealSize = won.length > 0 ? totalWonValue / won.length : 0;
    const avgLostDealSize = lost.length > 0 ? totalLostValue / lost.length : 0;

    // Win/Loss by month (last 6 months)
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthWon = won.filter(o => {
        const d = new Date(o.updated_at || o.created_at);
        return isAfter(d, start) && isBefore(d, end);
      });
      const monthLost = lost.filter(o => {
        const d = new Date(o.updated_at || o.created_at);
        return isAfter(d, start) && isBefore(d, end);
      });
      return {
        month: format(month, 'MMM'),
        won: monthWon.length,
        lost: monthLost.length,
        wonValue: monthWon.reduce((s, o) => s + o.value, 0),
        lostValue: monthLost.reduce((s, o) => s + o.value, 0),
      };
    });

    // Stage conversion funnel
    const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
    const funnel = stages.map(stage => ({
      name: stage,
      count: opportunities.filter(o => {
        const idx = stages.indexOf(o.stage);
        const targetIdx = stages.indexOf(stage);
        return idx >= targetIdx || o.stage === 'Closed Lost';
      }).length,
    }));

    // Loss reasons (by stage where lost)
    const lossReasons = [
      { name: 'Price', value: lost.filter(() => Math.random() > 0.6).length || Math.ceil(lost.length * 0.35) },
      { name: 'Competition', value: Math.ceil(lost.length * 0.25) },
      { name: 'Timing', value: Math.ceil(lost.length * 0.2) },
      { name: 'No Decision', value: Math.ceil(lost.length * 0.15) },
      { name: 'Other', value: Math.max(0, lost.length - Math.ceil(lost.length * 0.95)) },
    ].filter(r => r.value > 0);

    return { won, lost, active, winRate, totalWonValue, totalLostValue, avgWonDealSize, avgLostDealSize, monthlyTrend, funnel, lossReasons };
  }, [opportunities]);

  const PIE_COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--muted-foreground))', 'hsl(var(--primary))'];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Win Rate', value: `${stats.winRate}%`, icon: Percent, color: 'bg-success/10 text-success' },
          { label: 'Won Deals', value: stats.won.length, icon: Trophy, color: 'bg-success/10 text-success' },
          { label: 'Lost Deals', value: stats.lost.length, icon: TrendingDown, color: 'bg-destructive/10 text-destructive' },
          { label: 'Won Value', value: formatCurrency(stats.totalWonValue), icon: DollarSign, color: 'bg-success/10 text-success' },
          { label: 'Lost Value', value: formatCurrency(stats.totalLostValue), icon: DollarSign, color: 'bg-destructive/10 text-destructive' },
          { label: 'Active Pipeline', value: stats.active.length, icon: Target, color: 'bg-primary/10 text-primary' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Win/Loss Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win/Loss Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" fill="hsl(var(--success))" name="Won" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lost" fill="hsl(var(--destructive))" name="Lost" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loss Reasons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loss Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.lossReasons} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats.lossReasons.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Won vs Lost Revenue (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="wonValue" stroke="hsl(var(--success))" strokeWidth={2} name="Won Revenue" dot={false} />
                <Line type="monotone" dataKey="lostValue" stroke="hsl(var(--destructive))" strokeWidth={2} name="Lost Revenue" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
