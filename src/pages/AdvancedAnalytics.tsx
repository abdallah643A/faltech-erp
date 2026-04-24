import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, TrendingUp, TrendingDown, Target, Users, DollarSign,
  PieChart, Activity, ArrowUpRight, ArrowDownRight, Loader2, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RPieChart, Pie, Cell, Legend,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)', 'hsl(221 83% 53%)', 'hsl(262 83% 58%)'];

export default function AdvancedAnalytics() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30');

  const periodDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel
  const { data: leads = [] } = useQuery({
    queryKey: ['analytics-leads', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('id, card_name, card_type, status, source, score, risk_level, created_at, credit_limit, industry')
        .eq('card_type', 'lead');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['analytics-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('id, card_name, card_type, status, industry, credit_limit, created_at')
        .eq('card_type', 'customer');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['analytics-opportunities', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, name, stage, value, probability, expected_close, created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['analytics-activities', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, type, status, priority, created_at, due_date, completed_at')
        .gte('created_at', periodDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['analytics-sales-orders', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('id, doc_num, total, status, doc_date, customer_name, workflow_status')
        .gte('doc_date', periodDate.split('T')[0]);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['analytics-payments', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('id, total_amount, doc_date, payment_type, currency')
        .gte('doc_date', periodDate.split('T')[0])
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
  });

  // === COMPUTED METRICS ===
  const totalRevenue = payments.reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalPipeline = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage || '')).reduce((s, o) => s + (o.value || 0), 0);
  const weightedPipeline = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage || '')).reduce((s, o) => s + ((o.value || 0) * (o.probability || 0) / 100), 0);
  const wonOpps = opportunities.filter(o => o.stage === 'Closed Won').length;
  const lostOpps = opportunities.filter(o => o.stage === 'Closed Lost').length;
  const winRate = wonOpps + lostOpps > 0 ? Math.round((wonOpps / (wonOpps + lostOpps)) * 100) : 0;
  const completedActivities = activities.filter(a => a.status === 'completed').length;
  const activityRate = activities.length > 0 ? Math.round((completedActivities / activities.length) * 100) : 0;

  // Pipeline funnel data
  const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
  const funnelData = stages.map(stage => ({
    name: stage,
    value: opportunities.filter(o => o.stage === stage).length,
    revenue: opportunities.filter(o => o.stage === stage).reduce((s, o) => s + (o.value || 0), 0),
  }));

  // Lead source distribution
  const sourceData = Object.entries(
    leads.reduce((acc: Record<string, number>, l) => {
      const src = l.source || 'Direct';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Monthly trends
  const monthlyTrends = (() => {
    const months: Record<string, { leads: number; deals: number; revenue: number }> = {};
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    last6.forEach(m => months[m] = { leads: 0, deals: 0, revenue: 0 });

    leads.forEach(l => {
      const m = l.created_at?.slice(0, 7);
      if (m && months[m]) months[m].leads++;
    });
    opportunities.filter(o => o.stage === 'Closed Won').forEach(o => {
      const m = o.created_at?.slice(0, 7);
      if (m && months[m]) { months[m].deals++; months[m].revenue += (o.value || 0); }
    });
    payments.forEach(p => {
      const m = p.doc_date?.slice(0, 7);
      if (m && months[m]) months[m].revenue += (p.total_amount || 0);
    });

    return last6.map(m => ({
      month: new Date(m + '-01').toLocaleDateString(language === 'ar' ? 'ar' : 'en', { month: 'short' }),
      ...months[m],
    }));
  })();

  // Activity breakdown
  const activityByType = Object.entries(
    activities.reduce((acc: Record<string, number>, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Lead score distribution
  const scoreDistribution = [
    { range: '0-20', count: leads.filter(l => (l.score || 0) <= 20).length },
    { range: '21-40', count: leads.filter(l => (l.score || 0) > 20 && (l.score || 0) <= 40).length },
    { range: '41-60', count: leads.filter(l => (l.score || 0) > 40 && (l.score || 0) <= 60).length },
    { range: '61-80', count: leads.filter(l => (l.score || 0) > 60 && (l.score || 0) <= 80).length },
    { range: '81-100', count: leads.filter(l => (l.score || 0) > 80).length },
  ];

  const formatCurrency = (v: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, notation: 'compact' }).format(v);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'التقارير والتحليلات المتقدمة' : 'Advanced Analytics & Dashboards'}
          </h1>
          <p className="text-muted-foreground">Forecasting, scorecards, funnels, and trend analysis</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scorecard KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-600', href: '/incoming-payments' },
          { label: 'Pipeline Value', value: formatCurrency(totalPipeline), icon: TrendingUp, color: 'text-blue-600', href: '/opportunities' },
          { label: 'Weighted Forecast', value: formatCurrency(weightedPipeline), icon: Target, color: 'text-purple-600', href: '/sales-smart-forecast' },
          { label: 'Win Rate', value: `${winRate}%`, icon: ArrowUpRight, color: 'text-emerald-600', href: '/sales-performance' },
          { label: 'Active Leads', value: leads.length, icon: Users, color: 'text-blue-600', href: '/leads' },
          { label: 'Activity Rate', value: `${activityRate}%`, icon: Activity, color: 'text-amber-600', href: '/activities' },
        ].map((kpi, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(kpi.href)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Sales Funnel</TabsTrigger>
          <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Revenue & Deals Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Revenue (SAR)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" /> Activity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RPieChart>
                    <Pie data={activityByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {activityByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline by Stage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((stage, i) => (
                  <div key={stage.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 text-right">{stage.name}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Progress value={funnelData[0]?.value ? (stage.value / funnelData[0].value) * 100 : 0} className="h-6" />
                        <span className="text-xs font-bold w-8">{stage.value}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{formatCurrency(stage.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNNEL */}
        <TabsContent value="funnel" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {funnelData.map((stage, i) => {
                    const maxVal = Math.max(...funnelData.map(f => f.value), 1);
                    const pct = Math.round((stage.value / maxVal) * 100);
                    const convRate = i > 0 && funnelData[i - 1].value > 0
                      ? Math.round((stage.value / funnelData[i - 1].value) * 100)
                      : 100;
                    return (
                      <div key={stage.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{stage.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{stage.value} deals</Badge>
                            {i > 0 && <Badge variant="secondary" className="text-[10px]">{convRate}% conv.</Badge>}
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-8 overflow-hidden flex items-center" style={{ maxWidth: `${pct}%`, minWidth: '60px' }}>
                          <div className="h-full rounded-full flex items-center px-3" style={{ backgroundColor: COLORS[i % COLORS.length], width: '100%' }}>
                            <span className="text-[10px] text-white font-bold">{formatCurrency(stage.revenue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Win/Loss Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <p className="text-3xl font-bold text-emerald-600">{wonOpps}</p>
                    <p className="text-xs text-muted-foreground">Won</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-3xl font-bold text-red-600">{lostOpps}</p>
                    <p className="text-xs text-muted-foreground">Lost</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{winRate}%</p>
                  <p className="text-sm text-muted-foreground">Overall Win Rate</p>
                  <Progress value={winRate} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LEAD ANALYTICS */}
        <TabsContent value="leads" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lead Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RPieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risk Assessment Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {['low', 'medium', 'high'].map(level => {
                  const count = leads.filter(l => l.risk_level === level).length;
                  const color = level === 'low' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
                    level === 'medium' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' :
                    'text-red-600 bg-red-50 dark:bg-red-950/30';
                  return (
                    <div key={level} className={`text-center p-4 rounded-lg ${color}`}>
                      <p className="text-3xl font-bold">{count}</p>
                      <p className="text-xs capitalize">{level} Risk</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRENDS */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lead & Deal Creation Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="New Leads" />
                  <Line type="monotone" dataKey="deals" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 4 }} name="Deals Won" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sales Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    salesOrders.reduce((acc: Record<string, number>, so) => {
                      const s = so.status || 'draft';
                      acc[s] = (acc[s] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-xs capitalize w-20">{status}</span>
                      <Progress value={(count / Math.max(salesOrders.length, 1)) * 100} className="flex-1" />
                      <span className="text-xs font-bold w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customers by Industry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    customers.reduce((acc: Record<string, number>, c) => {
                      const ind = c.industry || 'Other';
                      acc[ind] = (acc[ind] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort(([, a], [, b]) => b - a).slice(0, 6).map(([industry, count]) => (
                    <div key={industry} className="flex items-center gap-3">
                      <span className="text-xs w-28 truncate">{industry}</span>
                      <Progress value={(count / Math.max(customers.length, 1)) * 100} className="flex-1" />
                      <span className="text-xs font-bold w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
