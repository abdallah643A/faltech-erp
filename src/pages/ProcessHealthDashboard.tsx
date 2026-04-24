import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessHealth } from '@/hooks/useProcessHealth';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Building2, Clock,
  FileText, Loader2, TrendingUp, Zap, Users, ShoppingCart, Landmark,
  HardHat, CheckCircle2, XCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';

const MODULE_ICONS: Record<string, React.ElementType> = {
  CRM: Users, Sales: FileText, Procurement: ShoppingCart,
  'AP Invoices': Landmark, 'AR Invoices': Landmark, HR: Users,
  Projects: HardHat, Approvals: CheckCircle2, 'Material Requests': ShoppingCart,
};

const MODULE_COLORS: Record<string, string> = {
  CRM: '#10b981', Sales: '#f59e0b', Procurement: '#8b5cf6',
  'AP Invoices': '#06b6d4', 'AR Invoices': '#3b82f6', HR: '#ec4899',
  Projects: '#f97316', Approvals: '#6366f1', 'Material Requests': '#14b8a6',
};

export default function ProcessHealthDashboard() {
  const { activeCompany, activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const { data, isLoading } = useProcessHealth(branchFilter === 'all' ? null : branchFilter);

  // Fetch branches for filter
  const { allCompanies } = useSAPCompanies();

  if (!activeCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4" />
        <h2 className="text-lg font-semibold">No Company Selected</h2>
        <p className="text-sm">Please select a company to view process health.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const healthScore = Math.max(0, Math.round(100 - (data.stuckDocs / Math.max(data.totalDocuments, 1)) * 100));
  const healthColor = healthScore >= 80 ? 'text-green-500' : healthScore >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Process Health Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Throughput, aging & bottlenecks for <span className="font-medium text-foreground">{activeCompany?.company_name}</span>
            </p>
          </div>
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{data.totalDocuments.toLocaleString()}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Stuck Documents</p>
                <p className="text-2xl font-bold text-destructive">{data.stuckDocs}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue Approvals</p>
                <p className="text-2xl font-bold text-orange-500">{data.overdueApprovals}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Health Score</p>
                <p className={`text-2xl font-bold ${healthColor}`}>{healthScore}%</p>
              </div>
              <TrendingUp className={`h-8 w-8 ${healthColor} opacity-30`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Summary + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module Throughput */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Module Throughput & Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.moduleSummary.map(m => {
                const Icon = MODULE_ICONS[m.module] || FileText;
                const stuckPct = m.total > 0 ? Math.round((m.stuck / m.total) * 100) : 0;
                return (
                  <div key={m.module} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 min-w-[9rem]">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{m.module}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={100 - stuckPct} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground">{m.total} docs</span>
                      {m.stuck > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5">{m.stuck} stuck</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5">~{m.avgAge}d avg</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly Document Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.trends} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="created" name="Created" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="stuck" name="Stuck" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Blockers + Stage Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Blockers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              Top Blockers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.blockers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">No significant blockers detected</p>
              </div>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-2">
                  {data.blockers.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(b.link)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{b.label}</p>
                          <p className="text-[11px] text-muted-foreground">{b.count} docs · avg {b.avgDays} days</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Module Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Document Distribution by Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.moduleSummary.map(m => ({ name: m.module, value: m.total }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  fontSize={11}
                >
                  {data.moduleSummary.map((m, i) => (
                    <Cell key={m.module} fill={MODULE_COLORS[m.module] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Full Stage Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Stage Breakdown (All Modules)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Stage / Status</TableHead>
                  <TableHead className="text-xs text-right">Count</TableHead>
                  <TableHead className="text-xs text-right">Avg Age (days)</TableHead>
                  <TableHead className="text-xs text-right">Overdue</TableHead>
                  <TableHead className="text-xs">Oldest</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stages
                  .sort((a, b) => (b.avgAgeDays * b.count) - (a.avgAgeDays * a.count))
                  .map((s, i) => {
                    const isWarning = s.avgAgeDays > 14;
                    const isDanger = s.avgAgeDays > 30;
                    return (
                      <TableRow key={i} className={isDanger ? 'bg-destructive/5' : isWarning ? 'bg-yellow-500/5' : ''}>
                        <TableCell className="text-xs font-medium">
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: MODULE_COLORS[s.module] }}>
                            {s.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{s.stage.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{s.count}</TableCell>
                        <TableCell className="text-xs text-right">
                          <span className={isDanger ? 'text-destructive font-bold' : isWarning ? 'text-yellow-600 font-medium' : ''}>
                            {s.avgAgeDays}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {s.overdueCount > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">{s.overdueCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.oldestDate ? new Date(s.oldestDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => navigate(getModuleLink(s.module))}
                          >
                            View <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function getModuleLink(module: string): string {
  const map: Record<string, string> = {
    CRM: '/opportunities', Sales: '/sales-orders', Procurement: '/procurement',
    'AP Invoices': '/finance', 'AR Invoices': '/ar-invoices', HR: '/hr',
    Projects: '/pm/projects', Approvals: '/approval-inbox', 'Material Requests': '/material-requests',
  };
  return map[module] || '/';
}
