import { useMemo } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, TrendingUp, DollarSign, Target,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface LeadsDashboardProps {
  leads: Lead[];
  getUserName: (userId: string | null) => string;
}

const COLORS = [
  'hsl(214, 72%, 23%)',
  'hsl(43, 65%, 49%)',
  'hsl(142, 71%, 45%)',
  'hsl(199, 89%, 48%)',
  'hsl(0, 84%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(270, 60%, 50%)',
  'hsl(180, 60%, 40%)',
];

export function LeadsDashboard({ leads, getUserName }: LeadsDashboardProps) {
  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter(l => l.status === 'Converted' || l.status === 'Won').length;
    const conversionRate = total > 0 ? ((converted / total) * 100) : 0;
    const pipelineValue = leads.reduce((sum, l) => sum + (l.credit_limit || 0), 0);
    const activeDeals = leads.filter(l => l.status === 'Hot' || l.status === 'Warm').length;

    return { total, conversionRate, pipelineValue, activeDeals };
  }, [leads]);

  // Trend data: last 30 days
  const trendData = useMemo(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const count = leads.filter(l => l.created_at?.slice(0, 10) === dateStr).length;
      days.push({ date: label, count });
    }
    return days;
  }, [leads]);

  // Source distribution
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || 'Direct';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Score distribution
  const scoreData = useMemo(() => {
    const buckets = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    leads.forEach(l => {
      const score = l.score || 0;
      const bucket = buckets.find(b => score >= b.min && score <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets.map(b => ({ range: b.range, count: b.count }));
  }, [leads]);

  // Team performance
  const teamData = useMemo(() => {
    const map: Record<string, { total: number; hot: number; converted: number; avgScore: number; scores: number[] }> = {};
    leads.forEach(l => {
      const name = getUserName(l.assigned_to);
      if (!map[name]) map[name] = { total: 0, hot: 0, converted: 0, avgScore: 0, scores: [] };
      map[name].total++;
      if (l.status === 'Hot') map[name].hot++;
      if (l.status === 'Converted' || l.status === 'Won') map[name].converted++;
      map[name].scores.push(l.score || 0);
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      total: d.total,
      hot: d.hot,
      converted: d.converted,
      avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
      conversionRate: d.total > 0 ? ((d.converted / d.total) * 100).toFixed(1) : '0.0',
    })).sort((a, b) => b.total - a.total);
  }, [leads, getUserName]);

  const kpis = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10', trend: '+12%', up: true },
    { label: 'Conversion Rate', value: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', trend: '+3.2%', up: true },
    { label: 'Pipeline Value', value: `${(stats.pipelineValue / 1000).toFixed(0)}K SAR`, icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10', trend: '+8%', up: true },
    { label: 'Active Deals', value: stats.activeDeals, icon: Target, color: 'text-info', bg: 'bg-info/10', trend: '-2', up: false },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.up ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-[11px] font-medium ${kpi.up ? 'text-success' : 'text-destructive'}`}>
                      {kpi.trend}
                    </span>
                    <span className="text-[11px] text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className={`h-10 w-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Trends (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="count" name="New Leads" stroke="hsl(214, 72%, 23%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Distribution by Source</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                  {scoreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Team Member</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground">Total</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground">Hot</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground">Conv.</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground">Avg Score</th>
                    <th className="text-center py-2 px-1 font-semibold text-muted-foreground">Conv. %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No team data available</td></tr>
                  ) : (
                    teamData.map((member) => (
                      <tr key={member.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2 font-medium truncate max-w-[140px]">{member.name}</td>
                        <td className="text-center py-2 px-1">{member.total}</td>
                        <td className="text-center py-2 px-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 bg-destructive/10 text-destructive border-destructive/20">
                            {member.hot}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 bg-success/10 text-success border-success/20">
                            {member.converted}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-1">
                          <span className={`font-semibold ${
                            member.avgScore >= 80 ? 'text-success' :
                            member.avgScore >= 50 ? 'text-warning' :
                            'text-muted-foreground'
                          }`}>
                            {member.avgScore}
                          </span>
                        </td>
                        <td className="text-center py-2 px-1 font-medium">{member.conversionRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
