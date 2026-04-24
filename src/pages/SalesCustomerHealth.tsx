import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Heart, AlertTriangle, TrendingUp, TrendingDown, Search, RefreshCw, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { KPICard } from '@/components/ui/kpi-card';

interface CustomerHealth {
  id: string;
  code: string;
  name: string;
  engagementScore: number;
  paymentScore: number;
  orderFrequencyScore: number;
  supportScore: number;
  overallScore: number;
  status: 'healthy' | 'at_risk' | 'critical';
  lastOrderDays: number;
  avgPaymentDays: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function SalesCustomerHealth() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['bp-health', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name, card_type').eq('card_type', 'customer');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(500);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['ar-health', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('customer_code, doc_date, total, balance_due, status, doc_due_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['act-health', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('activities').select('card_code, created_at, type');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const healthData = useMemo<CustomerHealth[]>(() => {
    const now = Date.now();
    return partners.map((bp: any) => {
      const custInvoices = invoices.filter((i: any) => i.customer_code === bp.card_code);
      const custActivities = activities.filter((a: any) => a.card_code === bp.card_code);

      const totalOrders = custInvoices.length;
      const totalRevenue = custInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0);

      // Engagement: activity count in last 90 days
      const recentActs = custActivities.filter((a: any) => (now - new Date(a.created_at).getTime()) < 90 * 86400000).length;
      const engagementScore = Math.min(100, recentActs * 15);

      // Payment timeliness
      const paidInvoices = custInvoices.filter((i: any) => i.status === 'paid' || i.status === 'closed');
      const overdueCount = custInvoices.filter((i: any) => i.status === 'overdue').length;
      const paymentScore = totalOrders > 0 ? Math.max(0, 100 - (overdueCount / totalOrders) * 100) : 50;

      // Order frequency: orders in last 180 days
      const recentOrders = custInvoices.filter((i: any) => (now - new Date(i.doc_date).getTime()) < 180 * 86400000).length;
      const orderFrequencyScore = Math.min(100, recentOrders * 20);

      // Last order days
      const lastOrder = custInvoices.sort((a: any, b: any) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime())[0];
      const lastOrderDays = lastOrder ? Math.floor((now - new Date(lastOrder.doc_date).getTime()) / 86400000) : 999;

      const avgPaymentDays = paidInvoices.length > 0 ? 30 : overdueCount > 0 ? 60 : 0;

      // Support score (placeholder - no tickets table, use inverse of overdue)
      const supportScore = Math.max(0, 100 - overdueCount * 20);

      const overallScore = Math.round((engagementScore * 0.25 + paymentScore * 0.3 + orderFrequencyScore * 0.25 + supportScore * 0.2));

      const status: 'healthy' | 'at_risk' | 'critical' = overallScore >= 60 ? 'healthy' : overallScore >= 35 ? 'at_risk' : 'critical';

      return {
        id: bp.id, code: bp.card_code, name: bp.card_name,
        engagementScore, paymentScore, orderFrequencyScore, supportScore,
        overallScore, status, lastOrderDays, avgPaymentDays, totalOrders, totalRevenue,
      };
    });
  }, [partners, invoices, activities]);

  const filtered = healthData.filter(h =>
    (statusFilter === 'all' || h.status === statusFilter) &&
    (!search || h.name?.toLowerCase().includes(search.toLowerCase()) || h.code?.toLowerCase().includes(search.toLowerCase()))
  );

  const summary = useMemo(() => ({
    healthy: healthData.filter(h => h.status === 'healthy').length,
    atRisk: healthData.filter(h => h.status === 'at_risk').length,
    critical: healthData.filter(h => h.status === 'critical').length,
    avgScore: healthData.length > 0 ? Math.round(healthData.reduce((s, h) => s + h.overallScore, 0) / healthData.length) : 0,
  }), [healthData]);

  const radarData = [
    { metric: 'Engagement', avg: Math.round(healthData.reduce((s, h) => s + h.engagementScore, 0) / (healthData.length || 1)) },
    { metric: 'Payment', avg: Math.round(healthData.reduce((s, h) => s + h.paymentScore, 0) / (healthData.length || 1)) },
    { metric: 'Order Freq', avg: Math.round(healthData.reduce((s, h) => s + h.orderFrequencyScore, 0) / (healthData.length || 1)) },
    { metric: 'Support', avg: Math.round(healthData.reduce((s, h) => s + h.supportScore, 0) / (healthData.length || 1)) },
  ];

  const statusColor = (s: string) => s === 'healthy' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : s === 'at_risk' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-red-500/10 text-red-600 border-red-200';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Health Score</h1>
          <p className="text-muted-foreground">Monitor customer engagement, payments & retention risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          icon={<Heart className="h-4 w-4 text-emerald-500" />}
          label="Healthy"
          value={summary.healthy}
          tooltip="Customers with an overall health score of 60% or above — active engagement, on-time payments, and regular orders"
        />
        <KPICard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label="At Risk"
          value={summary.atRisk}
          tooltip="Customers scoring between 35-59% — may have declining order frequency or payment delays"
        />
        <KPICard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="Critical"
          value={summary.critical}
          tooltip="Customers scoring below 35% — significant risk of churn due to inactivity, overdue payments, or no recent orders"
        />
        <KPICard
          icon={<Activity className="h-4 w-4 text-primary" />}
          label="Avg Health Score"
          value={`${summary.avgScore}%`}
          tooltip="Weighted average of engagement (25%), payment timeliness (30%), order frequency (25%), and support quality (20%)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {partnersLoading ? <ChartSkeleton /> : healthData.length === 0 ? (
            <EmptyChartState message="No customer data available for health analysis" height={240} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Average" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.slice(0, 50).map(h => (
          <Card key={h.id}>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{h.name}</span>
                  <Badge variant="outline" className="text-xs">{h.code}</Badge>
                  <Badge className={statusColor(h.status)}>{h.status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex gap-6 mt-2 text-xs text-muted-foreground">
                  <span>Orders: {h.totalOrders}</span>
                  <span>Revenue: {h.totalRevenue.toLocaleString()}</span>
                  <span>Last Order: {h.lastOrderDays}d ago</span>
                </div>
              </div>
              <div className="w-48">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Health Score</span>
                  <span className="font-medium text-foreground">{h.overallScore}%</span>
                </div>
                <Progress value={h.overallScore} className="h-2" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div><div className="text-muted-foreground">Engage</div><div className="font-medium text-foreground">{h.engagementScore}</div></div>
                <div><div className="text-muted-foreground">Payment</div><div className="font-medium text-foreground">{h.paymentScore}</div></div>
                <div><div className="text-muted-foreground">Freq</div><div className="font-medium text-foreground">{h.orderFrequencyScore}</div></div>
                <div><div className="text-muted-foreground">Support</div><div className="font-medium text-foreground">{h.supportScore}</div></div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No customers found</p>}
      </div>
    </div>
  );
}
