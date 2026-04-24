import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBidManagement } from '@/hooks/useBidManagement';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AICopilotPanel from '@/components/ai/AICopilotPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend, LineChart, Line } from 'recharts';
import { Brain, TrendingUp, AlertTriangle, DollarSign, Clock, Target, Activity, Shield, Cpu, HardHat, Ship, Landmark, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function UnifiedExecutiveDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { bids, bidStats } = useBidManagement();
  const { portfolioItems, risks, programs } = usePMOPortfolio();
  const { techAssets, roadmapItems, vendors } = useTMOPortfolio();

  // Cross-module KPIs: CPMS project margins
  const { data: cpmsProjects = [] } = useQuery({
    queryKey: ['exec-cpms-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('cpms_projects' as any).select('id, project_number, name, contract_value, actual_cost, status, profit_margin').limit(50);
      return (data || []) as any[];
    },
  });

  // Cross-module KPIs: Trading open exposure (deals)
  const { data: deals = [] } = useQuery({
    queryKey: ['exec-trading-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals' as any).select('id, deal_number, status, total_value, currency').eq('status', 'open').limit(50);
      return (data || []) as any[];
    },
  });

  // Cross-module KPIs: Finance cash position
  const { data: cashData } = useQuery({
    queryKey: ['exec-finance-cash'],
    queryFn: async () => {
      const { data: payments } = await supabase.from('incoming_payments').select('total_amount').eq('status', 'posted');
      const totalCollected = (payments || []).reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
      const { data: invoices } = await supabase.from('ar_invoices').select('balance_due').gt('balance_due', 0);
      const totalOutstanding = (invoices || []).reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
      return { totalCollected, totalOutstanding };
    },
  });

  const stats = bidStats();
  const allBids = bids.data || [];
  const allProjects = portfolioItems || [];
  const allRisks = risks || [];
  const allAssets = techAssets || [];

  // CPMS aggregate
  const cpmsAvgMargin = cpmsProjects.length > 0
    ? cpmsProjects.reduce((s: number, p: any) => s + (p.profit_margin || 0), 0) / cpmsProjects.length
    : 0;
  const cpmsActiveCount = cpmsProjects.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length;

  // Trading exposure
  const tradingExposure = deals.reduce((s: number, d: any) => s + (d.total_value || 0), 0);

  // Portfolio Health Score
  const healthyProjects = allProjects.filter(p => p.health_status === 'green').length;
  const totalProjects = allProjects.length;
  const portfolioHealth = totalProjects > 0 ? (healthyProjects / totalProjects) * 100 : 0;

  // Risk severity distribution
  const riskSeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  allRisks.forEach(r => {
    const score = (r.probability || 1) * (r.impact || 1);
    if (score >= 20) riskSeverity.critical++;
    else if (score >= 12) riskSeverity.high++;
    else if (score >= 6) riskSeverity.medium++;
    else riskSeverity.low++;
  });

  const totalBudget = allProjects.reduce((s, p) => s + ((p as any).project?.budget || 0), 0);
  const totalSpent = allProjects.reduce((s, p) => s + ((p as any).project?.actual_cost || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const avgTechHealth = allAssets.length > 0
    ? allAssets.reduce((s, a) => s + (a.health_score || 50), 0) / allAssets.length
    : 0;

  const radarData = [
    { dimension: 'Win Rate', score: stats.winRate || 0 },
    { dimension: 'Portfolio Health', score: portfolioHealth },
    { dimension: 'Budget Control', score: Math.max(0, 100 - Math.abs(budgetUtilization - 75)) },
    { dimension: 'Risk Mgmt', score: totalProjects > 0 ? Math.max(0, 100 - (riskSeverity.critical * 20)) : 50 },
    { dimension: 'Tech Health', score: avgTechHealth },
    { dimension: 'Pipeline', score: stats.activeBids > 0 ? Math.min(100, stats.activeBids * 15) : 0 },
  ];

  // Pipeline funnel
  const funnelData = [
    { stage: 'Qualifying', count: allBids.filter(b => b.status === 'qualifying').length },
    { stage: 'In Progress', count: allBids.filter(b => b.status === 'in_progress').length },
    { stage: 'Submitted', count: allBids.filter(b => b.status === 'submitted').length },
    { stage: 'Won', count: allBids.filter(b => b.status === 'won').length },
  ];

  const portfolioData = [
    { name: 'Green', value: allProjects.filter(p => p.health_status === 'green').length, color: '#22c55e' },
    { name: 'Amber', value: allProjects.filter(p => p.health_status === 'amber').length, color: '#f59e0b' },
    { name: 'Red', value: allProjects.filter(p => p.health_status === 'red').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Unified Executive Dashboard</h1>
          <p className="text-muted-foreground">Cross-module intelligence across Bids, Projects, and Technology</p>
        </div>
        <AICopilotPanel
          analysisType="risk_assessment"
          data={{
            bids_summary: stats,
            portfolio: { totalProjects, portfolioHealth, budgetUtilization },
            risks: riskSeverity,
            tech: { avgTechHealth, totalAssets: allAssets.length },
          }}
          title="AI Portfolio Risk Assessment"
          triggerLabel="AI Risk Analysis"
        />
      </div>

      {/* Cross-Module KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/cpms')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><HardHat className="h-3 w-3" />CPMS Margin</div>
            <p className={`text-xl font-bold ${cpmsAvgMargin >= 15 ? 'text-green-600' : cpmsAvgMargin >= 5 ? 'text-amber-600' : 'text-destructive'}`}>{cpmsAvgMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">{cpmsActiveCount} active <ExternalLink className="inline h-2.5 w-2.5" /></p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/deals')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Ship className="h-3 w-3" />Trade Exposure</div>
            <p className="text-xl font-bold">{(tradingExposure / 1e6).toFixed(1)}M</p>
            <p className="text-[10px] text-muted-foreground">{deals.length} open <ExternalLink className="inline h-2.5 w-2.5" /></p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/finance-dashboard')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Landmark className="h-3 w-3" />Cash Collected</div>
            <p className="text-xl font-bold text-green-600">{((cashData?.totalCollected || 0) / 1e6).toFixed(2)}M</p>
            <p className="text-[10px] text-muted-foreground">Total <ExternalLink className="inline h-2.5 w-2.5" /></p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/ar-invoices?status=overdue')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3 w-3" />Outstanding</div>
            <p className="text-xl font-bold text-destructive">{((cashData?.totalOutstanding || 0) / 1e6).toFixed(2)}M</p>
            <p className="text-[10px] text-muted-foreground">AR balance <ExternalLink className="inline h-2.5 w-2.5" /></p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/sales-pipeline')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Target className="h-3 w-3" />Win Rate</div>
            <p className="text-xl font-bold text-green-600">{stats.winRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/bids')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="h-3 w-3" />Active Bids</div>
            <p className="text-xl font-bold">{stats.activeBids}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/bids')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><DollarSign className="h-3 w-3" />Pipeline</div>
            <p className="text-xl font-bold">{(stats.pipelineValue / 1e6).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/pmo/portfolio')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" />Projects</div>
            <p className="text-xl font-bold">{totalProjects}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/pmo/portfolio')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Shield className="h-3 w-3" />Health</div>
            <p className={`text-xl font-bold ${portfolioHealth >= 70 ? 'text-green-600' : portfolioHealth >= 50 ? 'text-amber-600' : 'text-destructive'}`}>{portfolioHealth.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => navigate('/pmo/portfolio')}>
          <CardContent className="pt-3 pb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3 w-3" />Risks</div>
            <p className="text-xl font-bold text-destructive">{riskSeverity.critical + riskSeverity.high}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Portfolio Radar */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Portfolio Performance Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" className="text-xs" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bid Pipeline Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Bid Pipeline Funnel</CardTitle></CardHeader>
          <CardContent>
            {funnelData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No bid data</div>
            )}
          </CardContent>
        </Card>

        {/* Project Health Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Project Health Distribution</CardTitle></CardHeader>
          <CardContent>
            {portfolioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={portfolioData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {portfolioData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No project data</div>
            )}
          </CardContent>
        </Card>

        {/* Risk Severity */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Severity Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Critical', count: riskSeverity.critical, color: 'bg-red-500', max: Math.max(riskSeverity.critical, riskSeverity.high, riskSeverity.medium, riskSeverity.low, 1) },
                { label: 'High', count: riskSeverity.high, color: 'bg-orange-500', max: Math.max(riskSeverity.critical, riskSeverity.high, riskSeverity.medium, riskSeverity.low, 1) },
                { label: 'Medium', count: riskSeverity.medium, color: 'bg-yellow-500', max: Math.max(riskSeverity.critical, riskSeverity.high, riskSeverity.medium, riskSeverity.low, 1) },
                { label: 'Low', count: riskSeverity.low, color: 'bg-green-500', max: Math.max(riskSeverity.critical, riskSeverity.high, riskSeverity.medium, riskSeverity.low, 1) },
              ].map(r => (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{r.label}</span><span className="font-bold">{r.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${(r.count / r.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Budget Utilization</span>
                  <span className={budgetUtilization > 100 ? 'text-red-600 font-bold' : ''}>{budgetUtilization.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${budgetUtilization > 100 ? 'bg-red-500' : budgetUtilization > 85 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">Total Budget</p>
                  <p className="font-bold">{(totalBudget / 1e6).toFixed(2)}M</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">Actual Spent</p>
                  <p className="font-bold">{(totalSpent / 1e6).toFixed(2)}M</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />AI Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <AICopilotPanel
              analysisType="project_health"
              data={{ projects: allProjects.slice(0, 10), budgetUtilization, riskSeverity }}
              title="Portfolio Health Analysis"
              triggerLabel="Analyze Portfolio Health"
            />
            <AICopilotPanel
              analysisType="resource_optimization"
              data={{ projects: allProjects.slice(0, 10), programs: (programs || []).slice(0, 5) }}
              title="Resource Optimization"
              triggerLabel="Optimize Resources"
            />
            <AICopilotPanel
              analysisType="tech_health"
              data={{ assets: allAssets.slice(0, 15), roadmap: (roadmapItems || []).slice(0, 10) }}
              title="Technology Health Assessment"
              triggerLabel="Assess Tech Health"
            />
            <AICopilotPanel
              analysisType="lessons_extraction"
              data={{ projects: allProjects.filter(p => p.health_status === 'red').slice(0, 5), risks: allRisks.slice(0, 10) }}
              title="Extract Lessons Learned"
              triggerLabel="Extract Lessons"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
