import { useState, useEffect } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSHealth, ProjectHealth } from '@/hooks/useCPMSHealth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  RefreshCw, Shield, Target, Gauge, ArrowUpRight, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

const healthColors: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  yellow: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
};

const riskColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function CPMSProjectHealth() {
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { healthData, loading, fetchHealth, computeHealthForProject } = useCPMSHealth();
  const [refreshing, setRefreshing] = useState(false);

  const activeProjects = projects.filter(p => p.status === 'active');

  const handleRefreshAll = async () => {
    setRefreshing(true);
    for (const project of activeProjects) {
      if (project.id) await computeHealthForProject(project.id);
    }
    await fetchHealth();
    setRefreshing(false);
  };

  // Get latest health per project
  const latestHealth = activeProjects.map(project => {
    const health = healthData.find(h => h.project_id === project.id);
    return { project, health };
  });

  // Trend data for charts
  const getTrendData = (projId: string) => {
    return healthData
      .filter(h => h.project_id === projId)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      .slice(-14)
      .map(h => ({
        date: h.snapshot_date.slice(5),
        schedule: h.schedule_variance_pct,
        budget: h.budget_variance_pct,
        quality: h.quality_score,
      }));
  };

  // Portfolio summary
  const portfolioSummary = {
    green: latestHealth.filter(h => (h.health?.overall_health || 'green') === 'green').length,
    yellow: latestHealth.filter(h => h.health?.overall_health === 'yellow').length,
    red: latestHealth.filter(h => h.health?.overall_health === 'red').length,
    avgQuality: latestHealth.length > 0
      ? Math.round(latestHealth.reduce((s, h) => s + (h.health?.quality_score || 100), 0) / latestHealth.length)
      : 100,
    totalRisks: latestHealth.reduce((s, h) => s + (h.health?.risk_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Project Health Monitor
          </h2>
          <p className="text-sm text-muted-foreground">Real-time health status across active projects</p>
        </div>
        <Button onClick={handleRefreshAll} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={cn('h-4 w-4 mr-1', refreshing && 'animate-spin')} />
          {refreshing ? 'Computing...' : 'Refresh All'}
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Healthy</p>
            <p className="text-2xl font-bold text-emerald-600">{portfolioSummary.green}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">At Risk</p>
            <p className="text-2xl font-bold text-amber-600">{portfolioSummary.yellow}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Critical</p>
            <p className="text-2xl font-bold text-red-600">{portfolioSummary.red}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg Quality</p>
            <p className="text-2xl font-bold">{portfolioSummary.avgQuality}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Risks</p>
            <p className="text-2xl font-bold text-orange-600">{portfolioSummary.totalRisks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Project Health Cards */}
      {latestHealth.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No active projects. Create a project with "active" status to see health monitoring.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {latestHealth.map(({ project, health }) => {
            const h = health || { schedule_variance_pct: 0, budget_variance_pct: 0, quality_score: 100, risk_level: 'low', risk_count: 0, overall_health: 'green', spi: null, cpi: null, defect_count: 0, open_ncrs: 0, open_rfis: 0 };
            const colors = healthColors[h.overall_health] || healthColors.green;
            const trendData = getTrendData(project.id!);

            return (
              <Card
                key={project.id}
                className={cn('cursor-pointer hover:shadow-lg transition-all border', colors.border)}
                onClick={() => navigate(`/cpms/project/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{project.code} – {project.name}</CardTitle>
                      <CardDescription className="text-xs">{project.city || 'No location'}</CardDescription>
                    </div>
                    <Badge className={cn('text-[10px]', colors.bg, colors.text)}>
                      {h.overall_health === 'green' ? '● Healthy' : h.overall_health === 'yellow' ? '● At Risk' : '● Critical'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 4 Metric Indicators */}
                  <div className="grid grid-cols-4 gap-2">
                    {/* Schedule Variance */}
                    <div className="text-center">
                      <div className={cn('text-lg font-bold', h.schedule_variance_pct >= 0 ? 'text-emerald-600' : h.schedule_variance_pct > -10 ? 'text-amber-600' : 'text-red-600')}>
                        {h.schedule_variance_pct > 0 ? '+' : ''}{h.schedule_variance_pct}%
                      </div>
                      <p className="text-[9px] text-muted-foreground">Schedule</p>
                      {h.spi && <p className="text-[9px] font-medium">SPI: {h.spi}</p>}
                    </div>
                    {/* Budget Variance */}
                    <div className="text-center">
                      <div className={cn('text-lg font-bold', h.budget_variance_pct >= 0 ? 'text-emerald-600' : h.budget_variance_pct > -10 ? 'text-amber-600' : 'text-red-600')}>
                        {h.budget_variance_pct > 0 ? '+' : ''}{h.budget_variance_pct}%
                      </div>
                      <p className="text-[9px] text-muted-foreground">Budget</p>
                      {h.cpi && <p className="text-[9px] font-medium">CPI: {h.cpi}</p>}
                    </div>
                    {/* Quality Score */}
                    <div className="text-center">
                      <div className={cn('text-lg font-bold', h.quality_score >= 80 ? 'text-emerald-600' : h.quality_score >= 60 ? 'text-amber-600' : 'text-red-600')}>
                        {h.quality_score}
                      </div>
                      <p className="text-[9px] text-muted-foreground">Quality</p>
                      <Progress value={h.quality_score} className="h-1 mt-0.5" />
                    </div>
                    {/* Risk Level */}
                    <div className="text-center">
                      <Badge className={cn('text-[10px]', riskColors[h.risk_level])}>
                        {h.risk_level}
                      </Badge>
                      <p className="text-[9px] text-muted-foreground mt-1">{h.risk_count} risks</p>
                    </div>
                  </div>

                  {/* Mini Trend Chart */}
                  {trendData.length > 1 && (
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                          <Area type="monotone" dataKey="quality" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2">
                    <span>{h.defect_count} open defects</span>
                    <span>{h.open_ncrs} NCRs</span>
                    <span>{h.open_rfis} RFIs</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
