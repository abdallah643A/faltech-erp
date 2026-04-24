import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  DollarSign, Users, Shield, Target, ArrowUpRight, ArrowDownRight,
  Layers, Activity, FileText, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { ExecutiveAlertWidget } from '@/components/pmo/alerts/ExecutiveAlertWidget';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, LineChart, Line, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  completed: 'hsl(var(--success))',
  in_progress: 'hsl(var(--primary))',
  planning: 'hsl(var(--warning))',
  on_hold: 'hsl(var(--muted-foreground))',
  cancelled: 'hsl(var(--destructive))',
};

const HEALTH_COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
};

export default function PMOExecutiveDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { portfolioItems, risks, issues, resources, allocations, programs, stageGates } = usePMOPortfolio();
  const { projects = [] } = useProjects();

  // EVM Snapshots
  const { data: evmSnapshots = [] } = useQuery({
    queryKey: ['pmo-evm-snapshots', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_evm_snapshots').select('*').order('snapshot_date', { ascending: true });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Lessons learned
  const { data: lessonsLearned = [] } = useQuery({
    queryKey: ['pmo-lessons', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_lessons_learned').select('*').order('created_at', { ascending: false }).limit(10);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // KPI calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const onTimeRate = totalProjects > 0 ? Math.round((completedProjects / Math.max(completedProjects + projects.filter(p => p.status === 'cancelled').length, 1)) * 100) : 0;
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating').length;
  const criticalRisks = risks.filter(r => r.risk_score >= 20).length;
  const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
  const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / totalProjects) : 0;

  // Resource utilization
  const totalCapacity = resources.reduce((s, r) => s + (r.available_hours_per_week || 0), 0);
  const totalAllocated = allocations.filter(a => a.status === 'active').reduce((s, a) => s + (a.allocated_hours_per_week || 0), 0);
  const resourceUtilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

  // Chart data
  const statusDistribution = [
    { name: 'Active', value: activeProjects, color: STATUS_COLORS.in_progress },
    { name: 'Completed', value: completedProjects, color: STATUS_COLORS.completed },
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length, color: STATUS_COLORS.planning },
    { name: 'On Hold', value: projects.filter(p => p.status === 'on_hold').length, color: STATUS_COLORS.on_hold },
  ].filter(d => d.value > 0);

  const healthDistribution = [
    { name: 'Green', value: portfolioItems.filter(p => p.health_status === 'green').length, color: HEALTH_COLORS.green },
    { name: 'Yellow', value: portfolioItems.filter(p => p.health_status === 'yellow').length, color: HEALTH_COLORS.yellow },
    { name: 'Red', value: portfolioItems.filter(p => p.health_status === 'red').length, color: HEALTH_COLORS.red },
  ].filter(d => d.value > 0);

  const riskBySeverity = [
    { severity: 'Critical (20+)', count: risks.filter(r => r.risk_score >= 20).length },
    { severity: 'High (12-19)', count: risks.filter(r => r.risk_score >= 12 && r.risk_score < 20).length },
    { severity: 'Medium (6-11)', count: risks.filter(r => r.risk_score >= 6 && r.risk_score < 12).length },
    { severity: 'Low (1-5)', count: risks.filter(r => r.risk_score < 6).length },
  ];

  const investmentByTier = portfolioItems.reduce((acc, item) => {
    const tier = item.investment_tier || 'unclassified';
    const budget = item.project?.budget || 0;
    acc[tier] = (acc[tier] || 0) + budget;
    return acc;
  }, {} as Record<string, number>);

  const investmentData = Object.entries(investmentByTier).map(([tier, amount]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    amount: Math.round(amount / 1000),
  }));

  // Gate compliance
  const totalGates = stageGates.length;
  const passedGates = stageGates.filter(g => g.status === 'passed').length;
  const gateCompliance = totalGates > 0 ? Math.round((passedGates / totalGates) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PMO Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm">Enterprise portfolio governance & strategic oversight</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/pmo/alerts')}>
            <Bell className="h-4 w-4 mr-1" /> Alert Center
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pmo/portfolio')}>
            <Layers className="h-4 w-4 mr-1" /> Portfolio View
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pmo/lessons')}>
            <FileText className="h-4 w-4 mr-1" /> Lessons Learned
          </Button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPITile label="Total Projects" value={totalProjects} sub={`${activeProjects} active`} icon={Layers} />
        <KPITile label="On-Time Rate" value={`${onTimeRate}%`} sub="delivery" icon={CheckCircle2} trend={onTimeRate >= 85 ? 'up' : 'down'} />
        <KPITile label="Avg Progress" value={`${avgProgress}%`} icon={Activity} />
        <KPITile label="Budget Used" value={`${budgetUtilization}%`} sub={`${(totalSpent/1000).toFixed(0)}K / ${(totalBudget/1000).toFixed(0)}K`} icon={DollarSign} trend={budgetUtilization <= 100 ? 'up' : 'down'} />
        <KPITile label="Resource Util." value={`${resourceUtilization}%`} sub={`${resources.length} resources`} icon={Users} />
        <KPITile label="Open Risks" value={openRisks} sub={`${criticalRisks} critical`} icon={AlertTriangle} variant="danger" />
        <KPITile label="Open Issues" value={openIssues} icon={Shield} />
        <KPITile label="Gate Compliance" value={`${gateCompliance}%`} sub={`${passedGates}/${totalGates}`} icon={Target} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={healthDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {healthDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              {healthDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Severity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskBySeverity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="severity" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Investment by Tier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Investment by Tier (K SAR)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={investmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* EVM Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Earned Value Management (EVM) Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {evmSnapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={evmSnapshots}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="snapshot_date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="planned_value" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" name="PV" />
                  <Area type="monotone" dataKey="earned_value" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="EV" />
                  <Area type="monotone" dataKey="actual_cost" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.1)" name="AC" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No EVM data yet. Add snapshots from the Portfolio view.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Alerts + Programs + Lessons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alert Widget */}
        <ExecutiveAlertWidget />
        {/* Program Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Programs Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {programs.length === 0 && <p className="text-muted-foreground text-sm">No programs defined yet.</p>}
            {programs.slice(0, 6).map(prog => {
              const progProjects = portfolioItems.filter(p => p.program_id === prog.id);
              const progBudget = progProjects.reduce((s, p) => s + (p.project?.budget || 0), 0);
              return (
                <div key={prog.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{prog.name}</p>
                    <p className="text-xs text-muted-foreground">{progProjects.length} projects · {(progBudget/1000).toFixed(0)}K budget</p>
                  </div>
                  <Badge variant={prog.status === 'active' ? 'default' : 'secondary'}>{prog.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Lessons Learned */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Lessons Learned</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pmo/lessons')}>View All</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessonsLearned.length === 0 && <p className="text-muted-foreground text-sm">No lessons captured yet.</p>}
            {lessonsLearned.slice(0, 5).map(lesson => (
              <div key={lesson.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">{lesson.category} · {lesson.lesson_type}</p>
                </div>
                {lesson.approved && <Badge variant="outline" className="text-[10px] shrink-0">Approved</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable KPI Tile
function KPITile({ label, value, sub, icon: Icon, trend, variant }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  variant?: 'danger';
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-3 pb-2 px-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className={`h-3.5 w-3.5 ${variant === 'danger' ? 'text-destructive' : 'text-primary'}`} />
          <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-xl font-bold">{value}</p>
          {trend && (
            trend === 'up'
              ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
