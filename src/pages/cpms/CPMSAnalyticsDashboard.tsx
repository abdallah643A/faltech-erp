import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon,
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  FileText, HardHat, Activity, Lightbulb, RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { format, subMonths, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const PIE_COLORS = [
  'hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)', 'hsl(217, 91%, 60%)', 'hsl(280, 67%, 55%)',
];

const CAT_COLORS: Record<string, string> = {
  materials: 'hsl(217, 91%, 60%)',
  labor: 'hsl(142, 71%, 45%)',
  equipment: 'hsl(280, 67%, 55%)',
  subcontractor: 'hsl(25, 95%, 53%)',
  permits: 'hsl(48, 96%, 53%)',
  other: 'hsl(0, 0%, 60%)',
};

interface ProjectRow {
  id: string; name: string; code: string; project_number: string | null;
  status: string; type: string; contract_value: number; budgeted_cost: number;
  start_date: string | null; end_date: string | null; target_completion_date: string | null;
  client_name: string | null;
}

interface ExpenseRow {
  id: string; project_id: string | null; category: string; amount: number;
  expense_date: string; paid: boolean;
}

interface InvoiceRow {
  id: string; cpms_project_id: string | null; total: number; status: string;
  doc_date: string; retention_amount: number | null;
}

export default function CPMSAnalyticsDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pRes, eRes, iRes] = await Promise.all([
        supabase.from('cpms_projects').select('id, name, code, project_number, status, type, contract_value, budgeted_cost, start_date, end_date, target_completion_date, client_name'),
        supabase.from('cpms_expenses' as any).select('id, project_id, category, amount, expense_date, paid'),
        supabase.from('ar_invoices').select('id, cpms_project_id, total, status, doc_date, retention_amount').not('cpms_project_id', 'is', null),
      ]);
      setProjects((pRes.data || []) as any);
      setExpenses((eRes.data || []) as any);
      setInvoices((iRes.data || []) as any);
      setLoading(false);
    };
    load();
  }, [activeCompanyId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const now = new Date();
  const thisMonth = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonth = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Financial metrics
  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const outstandingInvoices = invoices.filter(i => i.status !== 'closed' && i.status !== 'cancelled');
  const outstandingAmount = outstandingInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return d >= thisMonth && d <= thisMonthEnd;
  }).reduce((s, e) => s + (e.amount || 0), 0);
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return d >= lastMonth && d <= lastMonthEnd;
  }).reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonthRevenue = invoices.filter(i => {
    const d = new Date(i.doc_date);
    return d >= thisMonth && d <= thisMonthEnd;
  }).reduce((s, i) => s + (i.total || 0), 0);
  const lastMonthRevenue = invoices.filter(i => {
    const d = new Date(i.doc_date);
    return d >= lastMonth && d <= lastMonthEnd;
  }).reduce((s, i) => s + (i.total || 0), 0);
  const netProfit = thisMonthRevenue - thisMonthExpenses;
  const revenueTrend = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
  const expenseTrend = lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100) : 0;

  // Project health
  const activeProjects = projects.filter(p => ['in_progress', 'active', 'awarded'].includes(p.status));
  const totalContractValue = activeProjects.reduce((s, p) => s + (p.contract_value || 0), 0);
  const completedProjects = projects.filter(p => p.status === 'completed');
  const completionRate = projects.length > 0 ? (completedProjects.length / projects.length * 100) : 0;

  // Over budget projects
  const projectExpenseTotals: Record<string, number> = {};
  expenses.forEach(e => {
    if (e.project_id) projectExpenseTotals[e.project_id] = (projectExpenseTotals[e.project_id] || 0) + (e.amount || 0);
  });
  const overBudgetProjects = projects.filter(p => {
    const spent = projectExpenseTotals[p.id] || 0;
    const budget = p.budgeted_cost || 0;
    return budget > 0 && spent > budget;
  });
  const avgOverBudgetPct = overBudgetProjects.length > 0
    ? overBudgetProjects.reduce((s, p) => {
        const spent = projectExpenseTotals[p.id] || 0;
        return s + ((spent - p.budgeted_cost) / p.budgeted_cost * 100);
      }, 0) / overBudgetProjects.length
    : 0;

  // Behind schedule
  const behindScheduleProjects = activeProjects.filter(p => {
    const end = p.target_completion_date || p.end_date;
    return end && new Date(end) < now;
  });
  const avgDaysBehind = behindScheduleProjects.length > 0
    ? behindScheduleProjects.reduce((s, p) => {
        const end = new Date(p.target_completion_date || p.end_date || '');
        return s + differenceInDays(now, end);
      }, 0) / behindScheduleProjects.length
    : 0;

  // Revenue vs Expenses - last 6 months
  const revExpData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i);
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const rev = invoices.filter(inv => { const d = new Date(inv.doc_date); return d >= ms && d <= me; }).reduce((s, inv) => s + (inv.total || 0), 0);
    const exp = expenses.filter(e => { const d = new Date(e.expense_date); return d >= ms && d <= me; }).reduce((s, e) => s + (e.amount || 0), 0);
    return { month: format(month, 'MMM yy'), Revenue: rev, Expenses: exp, Profit: rev - exp };
  });

  // Profit by project (top 10 active)
  const projectProfitData = activeProjects.map(p => {
    const rev = invoices.filter(i => i.cpms_project_id === p.id).reduce((s, i) => s + (i.total || 0), 0);
    const exp = projectExpenseTotals[p.id] || 0;
    return { name: p.project_number || p.code, Revenue: rev, Expenses: exp, Profit: rev - exp };
  }).sort((a, b) => b.Profit - a.Profit).slice(0, 10);

  // Status distribution
  const statusDist: Record<string, number> = {};
  projects.forEach(p => { statusDist[p.status] = (statusDist[p.status] || 0) + 1; });
  const statusData = Object.entries(statusDist).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Expense categories
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0); });
  const catData = Object.entries(catTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Insights
  const typeProfit: Record<string, { rev: number; exp: number; count: number }> = {};
  projects.forEach(p => {
    const rev = invoices.filter(i => i.cpms_project_id === p.id).reduce((s, i) => s + (i.total || 0), 0);
    const exp = projectExpenseTotals[p.id] || 0;
    if (!typeProfit[p.type]) typeProfit[p.type] = { rev: 0, exp: 0, count: 0 };
    typeProfit[p.type].rev += rev;
    typeProfit[p.type].exp += exp;
    typeProfit[p.type].count++;
  });
  const bestType = Object.entries(typeProfit).sort((a, b) => {
    const aMargin = a[1].rev > 0 ? (a[1].rev - a[1].exp) / a[1].rev : 0;
    const bMargin = b[1].rev > 0 ? (b[1].rev - b[1].exp) / b[1].rev : 0;
    return bMargin - aMargin;
  })[0];
  const bestTypeMargin = bestType && bestType[1].rev > 0 ? ((bestType[1].rev - bestType[1].exp) / bestType[1].rev * 100).toFixed(0) : '0';
  const totalRetention = invoices.reduce((s, i) => s + (i.retention_amount || 0), 0);

  const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toLocaleString();

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-100">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Construction Analytics & Reporting</h1>
            <p className="text-sm text-muted-foreground">تحليلات المشاريع الإنشائية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/cpms/reports')}>
            <FileText className="h-4 w-4 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {/* ROW 1 - Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardInline icon={DollarSign} label="Total Revenue" value={fmt(totalRevenue)}
          trend={revenueTrend} sub="All-time invoiced" color="text-emerald-600" bg="bg-emerald-50"
          onClick={() => navigate('/ar-invoices')} tooltip="Total revenue from all CPMS-linked invoices" />
        <KPICardInline icon={Clock} label="Outstanding Invoices" value={fmt(outstandingAmount)}
          sub={`${outstandingInvoices.length} unpaid`} color="text-amber-600" bg="bg-amber-50"
          onClick={() => navigate('/ar-invoices')} tooltip="Unpaid invoice amount pending collection" />
        <KPICardInline icon={TrendingDown} label="Expenses This Month" value={fmt(thisMonthExpenses)}
          trend={expenseTrend} trendInverse sub={format(now, 'MMMM yyyy')} color="text-red-600" bg="bg-red-50"
          onClick={() => navigate('/cpms/expenses')} tooltip="Total expenses recorded for the current month" />
        <KPICardInline icon={TrendingUp} label="Net Profit" value={fmt(netProfit)}
          sub="This month" color={netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
          bg={netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'} tooltip="Revenue minus expenses for current month" />
      </div>

      {/* ROW 2 - Project Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardInline icon={HardHat} label="Active Projects" value={String(activeProjects.length)}
          sub={`${fmt(totalContractValue)} contract value`} color="text-blue-600" bg="bg-blue-50"
          onClick={() => navigate('/cpms/projects')} tooltip="Projects currently in progress with their total contract value" />
        <KPICardInline icon={AlertTriangle} label="Over Budget" value={String(overBudgetProjects.length)}
          sub={overBudgetProjects.length > 0 ? `Avg ${avgOverBudgetPct.toFixed(0)}% over` : 'All on track'}
          color="text-orange-600" bg="bg-orange-50" tooltip="Projects where actual cost exceeds the approved budget" />
        <KPICardInline icon={Clock} label="Behind Schedule" value={String(behindScheduleProjects.length)}
          sub={behindScheduleProjects.length > 0 ? `Avg ${avgDaysBehind.toFixed(0)} days behind` : 'All on schedule'}
          color="text-red-600" bg="bg-red-50" tooltip="Projects past their target completion date" />
        <KPICardInline icon={CheckCircle2} label="Completion Rate" value={`${completionRate.toFixed(0)}%`}
          sub={`${completedProjects.length}/${projects.length} projects`} color="text-green-600" bg="bg-green-50"
          tooltip="Percentage of projects marked as completed" />
      </div>

      {/* ROW 3 - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue vs Expenses</CardTitle>
            <CardDescription className="text-xs">Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {revExpData.some(d => d.Revenue > 0 || d.Expenses > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revExpData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={v => fmt(v)} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                  <Area type="monotone" dataKey="Revenue" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="Expenses" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.15} strokeWidth={2} />
                  <Line type="monotone" dataKey="Profit" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message="No revenue or expense data available" height={260} />
            )}
          </CardContent>
        </Card>

        {/* Profit by Project */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profit by Project</CardTitle>
            <CardDescription className="text-xs">Top 10 active projects</CardDescription>
          </CardHeader>
          <CardContent>
            {projectProfitData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projectProfitData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={70} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="hsl(142, 71%, 45%)" stackId="a" />
                  <Bar dataKey="Expenses" fill="hsl(0, 84%, 60%)" stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChartState message="No project profit data available" height={260} />}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                      {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {statusData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="capitalize">{s.name}</span>
                      </div>
                      <span className="font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChartState message="No project status data" height={180} />}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {catData.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] || 'hsl(0,0%,60%)'} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {catData.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CAT_COLORS[c.name] || 'hsl(0,0%,60%)' }} />
                        <span className="capitalize">{c.name}</span>
                      </div>
                      <span className="font-medium">{fmt(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChartState message="No expense data recorded" height={180} />}
          </CardContent>
        </Card>
      </div>

      {/* Profitability Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Profitability Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bestType && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800">
                  Most Profitable Type
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Your most profitable project type is <span className="font-bold capitalize">{bestType[0]}</span> with avg margin of <span className="font-bold">{bestTypeMargin}%</span>
                </p>
              </div>
            )}
            {expenseTrend !== 0 && (
              <div className={`p-4 rounded-lg border ${expenseTrend > 10 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-sm font-medium ${expenseTrend > 10 ? 'text-red-800' : 'text-blue-800'}`}>
                  Expense Trend
                </p>
                <p className={`text-xs mt-1 ${expenseTrend > 10 ? 'text-red-600' : 'text-blue-600'}`}>
                  Expenses are <span className="font-bold">{Math.abs(expenseTrend).toFixed(0)}%</span> {expenseTrend > 0 ? 'higher' : 'lower'} this month vs last month
                </p>
              </div>
            )}
            {totalRetention > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">
                  Retention Held
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  You have <span className="font-bold">{fmt(totalRetention)}</span> in retention held across all projects
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WIP Quick View */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Work in Progress (WIP)</CardTitle>
            <CardDescription className="text-xs">In-progress projects financial summary</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/cpms/reports')}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Full Report
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">% Billed</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Over/Under</TableHead>
                  <TableHead>Budget</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No active projects</TableCell></TableRow>
                ) : activeProjects.map(p => {
                  const billed = invoices.filter(i => i.cpms_project_id === p.id).reduce((s, i) => s + (i.total || 0), 0);
                  const costs = projectExpenseTotals[p.id] || 0;
                  const pctBilled = p.contract_value > 0 ? (billed / p.contract_value * 100) : 0;
                  const costPct = p.budgeted_cost > 0 ? (costs / p.budgeted_cost * 100) : 0;
                  const profit = billed - costs;
                  const overUnder = billed - (p.contract_value * (costPct / 100));
                  const budgetHealth = costPct < 90 ? 'green' : costPct <= 100 ? 'yellow' : 'red';
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/cpms/project/${p.id}`)}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.project_number || p.code}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{p.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.contract_value || 0)}</TableCell>
                      <TableCell className="text-right">{fmt(billed)}</TableCell>
                      <TableCell className="text-right">{pctBilled.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{fmt(costs)}</TableCell>
                      <TableCell className={`text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(profit)}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${overUnder >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {overUnder >= 0 ? '+' : ''}{fmt(overUnder)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          budgetHealth === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                          budgetHealth === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }>
                          {costPct.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {activeProjects.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell>TOTALS</TableCell>
                    <TableCell className="text-right">{fmt(activeProjects.reduce((s, p) => s + (p.contract_value || 0), 0))}</TableCell>
                    <TableCell className="text-right">{fmt(invoices.filter(i => activeProjects.some(p => p.id === i.cpms_project_id)).reduce((s, i) => s + (i.total || 0), 0))}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{fmt(activeProjects.reduce((s, p) => s + (projectExpenseTotals[p.id] || 0), 0))}</TableCell>
                    <TableCell className="text-right">
                      {fmt(invoices.filter(i => activeProjects.some(p => p.id === i.cpms_project_id)).reduce((s, i) => s + (i.total || 0), 0) - activeProjects.reduce((s, p) => s + (projectExpenseTotals[p.id] || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline KPI card component
function KPICardInline({ icon: Icon, label, value, sub, color, bg, trend, trendInverse, onClick, tooltip }: {
  icon: any; label: string; value: string; sub: string;
  color: string; bg: string; trend?: number; trendInverse?: boolean; onClick?: () => void; tooltip?: string;
}) {
  const trendUp = trend !== undefined && trend > 0;
  const trendColor = trendInverse
    ? (trendUp ? 'text-red-600' : 'text-green-600')
    : (trendUp ? 'text-green-600' : 'text-red-600');

  const card = (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${bg.replace('bg-', 'border-l-').replace('50', '500')}`}
      onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{sub}</p>
              {trend !== undefined && trend !== 0 && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${trendColor}`}>
                  {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent><p className="text-xs max-w-[200px]">{tooltip}</p></TooltipContent>
        </UITooltip>
      </TooltipProvider>
    );
  }
  return card;
}
