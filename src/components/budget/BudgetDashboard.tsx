import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertTriangle, Clock, BarChart3, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { BudgetMaster } from '@/hooks/useBudgetMasters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6'];

interface Props {
  budgets: BudgetMaster[];
}

export function BudgetDashboard({ budgets }: Props) {
  const stats = useMemo(() => {
    const totalOriginal = 0;
    const totalRevised = 0;
    const totalCommitted = 0;
    const totalActual = 0;
    const totalAvailable = 0;
    const totalForecast = 0;
    const overBudgetCount = 0;
    const pendingApproval = budgets.filter(b => ['submitted', 'pending_review'].includes(b.approval_status)).length;
    const multiYear = budgets.filter(b => b.is_multi_year).length;
    const active = budgets.filter(b => b.approval_status === 'active').length;
    const draft = budgets.filter(b => b.approval_status === 'draft').length;

    const byType: Record<string, number> = {};
    budgets.forEach(b => {
      byType[b.budget_type] = (byType[b.budget_type] || 0) + 1;
    });

    const byYear: Record<number, number> = {};
    budgets.forEach(b => {
      byYear[b.fiscal_year] = (byYear[b.fiscal_year] || 0) + 1;
    });

    return {
      totalOriginal, totalRevised, totalCommitted, totalActual, totalAvailable, totalForecast,
      overBudgetCount, pendingApproval, multiYear, active, draft, total: budgets.length,
      byType: Object.entries(byType).map(([name, value]) => ({ name: name.replace('_', ' ').toUpperCase(), value })),
      byYear: Object.entries(byYear).map(([year, count]) => ({ year, count })).sort((a, b) => Number(a.year) - Number(b.year)),
      byStatus: [
        { name: 'Active', value: active },
        { name: 'Draft', value: draft },
        { name: 'Pending', value: pendingApproval },
        { name: 'Other', value: budgets.length - active - draft - pendingApproval },
      ].filter(s => s.value > 0),
    };
  }, [budgets]);

  const kpis = [
    { label: 'Total Budgets', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Active Budgets', value: stats.active, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'text-amber-500' },
    { label: 'Multi-Year Projects', value: stats.multiYear, icon: Calendar, color: 'text-blue-500' },
    { label: 'Draft Budgets', value: stats.draft, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Over-Budget Items', value: stats.overBudgetCount, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Budgets by Type</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Budget Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {stats.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Budgets by Fiscal Year</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byYear}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
