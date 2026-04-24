import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Target, TrendingUp, Users, Zap, ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { KPICard } from '@/components/ui/kpi-card';

interface ScoredLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  engagementScore: number;
  fitScore: number;
  conversionScore: number;
  totalScore: number;
  priority: 'hot' | 'warm' | 'cold';
  estimatedValue: number;
  daysSinceCreated: number;
  activitiesCount: number;
}

export default function SalesLeadScoring() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const { activeCompanyId } = useActiveCompany();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['lead-scoring-leads', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('*').eq('card_type', 'lead').order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['lead-scoring-activities', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('activities').select('business_partner_id, type, status, created_at').limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: wonOpps = [] } = useQuery({
    queryKey: ['lead-scoring-won-opps', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('opportunities').select('business_partner_id, value, stage').eq('stage', 'Closed Won').limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const isLoading = leadsLoading || activitiesLoading;

  const scoredLeads: ScoredLead[] = useMemo(() => {
    const avgWonValue = wonOpps.length > 0 ? wonOpps.reduce((s, o) => s + (o.value || 0), 0) / wonOpps.length : 10000;

    return leads.map(lead => {
      const leadActivities = activities.filter(a => a.business_partner_id === lead.id);
      const daysSinceCreated = Math.max(1, Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000));

      // Engagement Score (0-40): based on activities count and recency
      const actCount = leadActivities.length;
      const recentActs = leadActivities.filter(a => {
        const daysAgo = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
        return daysAgo <= 14;
      }).length;
      const engagementScore = Math.min(40, (actCount * 5) + (recentActs * 8));

      // Fit Score (0-30): based on data completeness and source quality
      let fitScore = 0;
      if (lead.email) fitScore += 8;
      if (lead.phone) fitScore += 5;
      if (lead.website) fitScore += 5;
      if (lead.billing_address) fitScore += 4;
      const goodSources = ['referral', 'website', 'partner', 'conference'];
      if (goodSources.includes((lead.source || '').toLowerCase())) fitScore += 8;
      fitScore = Math.min(30, fitScore);

      // Conversion Probability Score (0-30): based on stage velocity and patterns
      let conversionScore = 0;
      if (lead.status === 'active') conversionScore += 10;
      if (daysSinceCreated < 30) conversionScore += 10;
      else if (daysSinceCreated < 60) conversionScore += 5;
      if (actCount > 3) conversionScore += 10;
      conversionScore = Math.min(30, conversionScore);

      const totalScore = engagementScore + fitScore + conversionScore;
      const priority: 'hot' | 'warm' | 'cold' = totalScore >= 65 ? 'hot' : totalScore >= 35 ? 'warm' : 'cold';

      return {
        id: lead.id,
        name: lead.card_name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        engagementScore,
        fitScore,
        conversionScore,
        totalScore,
        priority,
        estimatedValue: Math.round(avgWonValue * (totalScore / 100)),
        daysSinceCreated,
        activitiesCount: actCount,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }, [leads, activities, wonOpps]);

  const filtered = useMemo(() => {
    return scoredLeads.filter(l => {
      if (filterPriority !== 'all' && l.priority !== filterPriority) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [scoredLeads, filterPriority, search]);

  const distributionData = useMemo(() => {
    const hot = scoredLeads.filter(l => l.priority === 'hot').length;
    const warm = scoredLeads.filter(l => l.priority === 'warm').length;
    const cold = scoredLeads.filter(l => l.priority === 'cold').length;
    return [
      { name: isAr ? 'ساخن' : 'Hot', value: hot, color: '#ef4444' },
      { name: isAr ? 'دافئ' : 'Warm', value: warm, color: '#f59e0b' },
      { name: isAr ? 'بارد' : 'Cold', value: cold, color: '#3b82f6' },
    ];
  }, [scoredLeads, isAr]);

  const sourceScoreData = useMemo(() => {
    const sourceMap: Record<string, { total: number; count: number }> = {};
    scoredLeads.forEach(l => {
      const src = l.source || 'Unknown';
      if (!sourceMap[src]) sourceMap[src] = { total: 0, count: 0 };
      sourceMap[src].total += l.totalScore;
      sourceMap[src].count++;
    });
    return Object.entries(sourceMap).map(([name, d]) => ({ name, avgScore: Math.round(d.total / d.count), count: d.count })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);
  }, [scoredLeads]);

  const avgScore = scoredLeads.length > 0 ? Math.round(scoredLeads.reduce((s, l) => s + l.totalScore, 0) / scoredLeads.length) : 0;
  const totalEstimatedValue = scoredLeads.filter(l => l.priority === 'hot').reduce((s, l) => s + l.estimatedValue, 0);
  const fmt = (v: number) => `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v)}`;

  const priorityColor = (p: string) => p === 'hot' ? 'text-red-600 bg-red-500/10' : p === 'warm' ? 'text-amber-600 bg-amber-500/10' : 'text-blue-600 bg-blue-500/10';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {isAr ? 'تسجيل العملاء المحتملين الذكي' : 'Intelligent Lead Scoring'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'ترتيب آلي حسب احتمالية التحويل وحجم الصفقة' : 'Automated ranking by conversion probability, deal size & cycle duration'}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<Users className="h-4 w-4 text-primary" />}
          label={isAr ? 'إجمالي العملاء المحتملين' : 'Total Leads'}
          value={scoredLeads.length}
          tooltip="Total number of leads being scored based on engagement, fit, and conversion probability"
          href="/leads"
        />
        <KPICard
          icon={<Zap className="h-4 w-4 text-red-500" />}
          label={isAr ? 'ساخن' : 'Hot Leads'}
          value={scoredLeads.filter(l => l.priority === 'hot').length}
          subtitle={`${fmt(totalEstimatedValue)} ${isAr ? 'قيمة تقديرية' : 'est. value'}`}
          tooltip="Leads scoring 65+ out of 100, with the highest conversion probability and estimated deal value"
          href="/leads"
        />
        <KPICard
          icon={<Target className="h-4 w-4 text-amber-500" />}
          label={isAr ? 'متوسط النقاط' : 'Avg Score'}
          value={`${avgScore}/100`}
          tooltip="Average lead score across all leads. Combines engagement (40%), fit (30%), and conversion probability (30%)"
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          label={isAr ? 'أفضل مصدر' : 'Top Source'}
          value={sourceScoreData[0]?.name || '-'}
          subtitle={`${sourceScoreData[0]?.avgScore || 0} ${isAr ? 'متوسط' : 'avg score'}`}
          tooltip="The lead source that produces the highest average scoring leads"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'توزيع الأولوية' : 'Priority Distribution'}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : distributionData.every(d => d.value === 0) ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات متاحة' : 'No lead data available for scoring'} height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {distributionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score by Source */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{isAr ? 'النقاط حسب المصدر' : 'Score by Source'}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : sourceScoreData.length === 0 ? (
              <EmptyChartState message={isAr ? 'لا توجد بيانات مصدر' : 'No source data available'} height={200} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceScoreData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{isAr ? 'ترتيب العملاء المحتملين' : 'Lead Rankings'}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-40" />
              </div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="hot">{isAr ? 'ساخن' : 'Hot'}</SelectItem>
                  <SelectItem value="warm">{isAr ? 'دافئ' : 'Warm'}</SelectItem>
                  <SelectItem value="cold">{isAr ? 'بارد' : 'Cold'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">{isAr ? 'الاسم' : 'Name'}</th>
                  <th className="text-center p-2">{isAr ? 'الأولوية' : 'Priority'}</th>
                  <th className="text-center p-2">{isAr ? 'النقاط' : 'Score'}</th>
                  <th className="text-center p-2">{isAr ? 'تفاعل' : 'Engage'}</th>
                  <th className="text-center p-2">{isAr ? 'ملاءمة' : 'Fit'}</th>
                  <th className="text-center p-2">{isAr ? 'تحويل' : 'Conv'}</th>
                  <th className="text-right p-2">{isAr ? 'قيمة تقديرية' : 'Est. Value'}</th>
                  <th className="text-center p-2">{isAr ? 'المصدر' : 'Source'}</th>
                  <th className="text-center p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((lead, idx) => (
                  <tr key={lead.id} className="border-t hover:bg-accent/30">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2 font-medium max-w-[150px] truncate">{lead.name}</td>
                    <td className="p-2 text-center">
                      <Badge className={`text-[10px] ${priorityColor(lead.priority)}`}>{lead.priority.toUpperCase()}</Badge>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${lead.totalScore >= 65 ? 'bg-red-500' : lead.totalScore >= 35 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${lead.totalScore}%` }} />
                        </div>
                        <span className="font-mono">{lead.totalScore}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono">{lead.engagementScore}</td>
                    <td className="p-2 text-center font-mono">{lead.fitScore}</td>
                    <td className="p-2 text-center font-mono">{lead.conversionScore}</td>
                    <td className="p-2 text-right font-mono">{fmt(lead.estimatedValue)}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className="text-[10px]">{lead.source || '-'}</Badge></td>
                    <td className="p-2 text-center">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate('/leads')}>
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
