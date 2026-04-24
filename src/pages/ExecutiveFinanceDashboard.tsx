import { useState, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { useEVM } from '@/hooks/useEVM';
import { calculateRAG } from '@/hooks/useProjectControl';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, BarChart3,
  Briefcase, Target, Activity, PieChart as PieIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(0 84% 60%)', 'hsl(45 93% 47%)', 'hsl(262 83% 58%)', 'hsl(199 89% 48%)'];
const ragColors = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };

export default function ExecutiveFinanceDashboard() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { projects = [] } = useProjects();

  // Portfolio financial aggregations
  const portfolioStats = useMemo(() => {
    const active = projects.filter(p => p.status === 'in_progress');
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalActual = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);
    const totalVariance = totalBudget - totalActual;
    const avgProgress = active.length > 0 ? active.reduce((s, p) => s + (p.progress || 0), 0) / active.length : 0;

    // RAG Distribution
    const rag = { green: 0, amber: 0, red: 0 };
    projects.forEach(p => {
      const usage = p.budget > 0 ? (p.actual_cost / p.budget) * 100 : 0;
      if (usage > 110) rag.red++;
      else if (usage > 90) rag.amber++;
      else rag.green++;
    });

    return { totalBudget, totalActual, totalVariance, avgProgress, rag, activeCount: active.length, totalCount: projects.length };
  }, [projects]);

  // Project-level financial data for table
  const projectFinancials = useMemo(() => {
    return projects.map(p => {
      const variance = (p.budget || 0) - (p.actual_cost || 0);
      const variancePct = p.budget > 0 ? (variance / p.budget) * 100 : 0;
      const usage = p.budget > 0 ? (p.actual_cost / p.budget) * 100 : 0;
      const rag = usage > 110 ? 'red' : usage > 90 ? 'amber' : 'green';
      return { ...p, variance, variancePct, usage, rag };
    }).sort((a, b) => a.variancePct - b.variancePct);
  }, [projects]);

  // Cost breakdown by status
  const costByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => {
      map[p.status] = (map[p.status] || 0) + (p.actual_cost || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Budget vs Actual bar chart
  const budgetVsActual = useMemo(() => {
    return projects
      .filter(p => p.budget > 0)
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
        Budget: p.budget,
        Actual: p.actual_cost,
        Variance: p.budget - p.actual_cost,
      }));
  }, [projects]);

  // Forecast trend (mock rolling forecast based on projects)
  const forecastData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((m, i) => ({
      month: m,
      Planned: portfolioStats.totalBudget * ((i + 1) / 12),
      Actual: portfolioStats.totalActual * ((i + 1) / 6),
      Forecast: portfolioStats.totalActual * ((i + 1) / 6) * 1.05,
    }));
  }, [portfolioStats]);

  const ragData = [
    { name: 'On Track', value: portfolioStats.rag.green },
    { name: 'At Risk', value: portfolioStats.rag.amber },
    { name: 'Critical', value: portfolioStats.rag.red },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executive Financial Dashboard</h1>
        <p className="text-sm text-muted-foreground">Portfolio-wide financial performance, forecasts & risk indicators</p>
      </div>

      {/* C-Suite KPI Row */}
      <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Briefcase className="h-3.5 w-3.5" />Portfolio</div>
            <p className="text-2xl font-bold">{portfolioStats.totalCount}</p>
            <p className="text-xs text-muted-foreground">{portfolioStats.activeCount} active</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Total projects in portfolio</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="h-3.5 w-3.5" />Total Budget</div>
            <p className="text-2xl font-bold">{(portfolioStats.totalBudget / 1e6).toFixed(1)}M</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Aggregated budget across all projects</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Activity className="h-3.5 w-3.5" />Total Spend</div>
            <p className="text-2xl font-bold">{(portfolioStats.totalActual / 1e6).toFixed(1)}M</p>
            <Progress value={portfolioStats.totalBudget > 0 ? (portfolioStats.totalActual / portfolioStats.totalBudget) * 100 : 0} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Actual costs incurred to date</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card className={`border-l-4 ${portfolioStats.totalVariance >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {portfolioStats.totalVariance >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}Variance
            </div>
            <p className={`text-2xl font-bold ${portfolioStats.totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(portfolioStats.totalVariance / 1e3).toFixed(0)}K</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Budget minus Actual — positive means under budget</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Target className="h-3.5 w-3.5" />Avg Progress</div>
            <p className="text-2xl font-bold">{portfolioStats.avgProgress.toFixed(0)}%</p>
            <Progress value={portfolioStats.avgProgress} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Average completion across active projects</p></TooltipContent></UITooltip>
        <UITooltip><TooltipTrigger asChild>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-3.5 w-3.5" />At Risk</div>
            <p className="text-2xl font-bold text-red-600">{portfolioStats.rag.red + portfolioStats.rag.amber}</p>
          </CardContent>
        </Card>
        </TooltipTrigger><TooltipContent><p className="text-xs">Projects exceeding 90% budget utilization</p></TooltipContent></UITooltip>
      </div>
      </TooltipProvider>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Financial Overview</TabsTrigger>
          <TabsTrigger value="projects">Project Financials</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Budget vs Actual */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Budget vs Actual by Project</CardTitle>
              </CardHeader>
              <CardContent>
                {budgetVsActual.length === 0 ? (
                  <EmptyChartState message="No project budget data available" height={300} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetVsActual} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Budget" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Actual" fill="hsl(0 84% 60%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* RAG Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Portfolio Health (RAG)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={ragData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      <Cell fill="hsl(142 71% 45%)" />
                      <Cell fill="hsl(45 93% 47%)" />
                      <Cell fill="hsl(0 84% 60%)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {ragData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${['bg-emerald-500', 'bg-amber-500', 'bg-red-500'][i]}`} />
                      <span className="text-xs">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spend by Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spend Distribution by Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={costByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {costByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project-Level Financial Performance</CardTitle>
              <CardDescription>Sorted by variance (worst first)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RAG</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Var %</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFinancials.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className={`w-4 h-4 rounded-full ${ragColors[p.rag as keyof typeof ragColors]}`} />
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">{(p.budget || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(p.actual_cost || 0).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-bold ${p.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.variance.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right ${p.variancePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.variancePct.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.progress || 0} className="h-1.5 w-16" />
                          <span className="text-xs">{p.progress || 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rolling Financial Forecast</CardTitle>
              <CardDescription>Planned vs Actual vs Forecast (portfolio level)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Planned" fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" fillOpacity={0.3} strokeDasharray="5 5" />
                  <Bar dataKey="Actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Forecast" stroke="hsl(0 84% 60%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
