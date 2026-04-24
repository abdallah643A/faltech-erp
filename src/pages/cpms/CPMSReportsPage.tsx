import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Download, Printer, DollarSign, Activity, BarChart3,
  TrendingUp, Users, ArrowLeft, Filter,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProjectRow {
  id: string; name: string; code: string; project_number: string | null;
  status: string; type: string; contract_value: number; budgeted_cost: number;
  client_name: string | null; start_date: string | null;
}
interface ExpenseRow { id: string; project_id: string | null; category: string; amount: number; expense_date: string; }
interface InvoiceRow { id: string; cpms_project_id: string | null; total: number; status: string; doc_date: string; retention_amount: number | null; }

export default function CPMSReportsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [filterProject, setFilterProject] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pR, eR, iR] = await Promise.all([
        supabase.from('cpms_projects').select('id, name, code, project_number, status, type, contract_value, budgeted_cost, client_name, start_date'),
        supabase.from('cpms_expenses' as any).select('id, project_id, category, amount, expense_date'),
        supabase.from('ar_invoices').select('id, cpms_project_id, total, status, doc_date, retention_amount').not('cpms_project_id', 'is', null),
      ]);
      setProjects((pR.data || []) as any);
      setExpenses((eR.data || []) as any);
      setInvoices((iR.data || []) as any);
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toLocaleString();
  const customers = [...new Set(projects.map(p => p.client_name).filter(Boolean))] as string[];

  const filteredProjects = useMemo(() => projects.filter(p => {
    if (filterProject !== 'all' && p.id !== filterProject) return false;
    if (filterCustomer !== 'all' && p.client_name !== filterCustomer) return false;
    return true;
  }), [projects, filterProject, filterCustomer]);

  const projectIds = new Set(filteredProjects.map(p => p.id));
  const filteredExpenses = expenses.filter(e => e.project_id && projectIds.has(e.project_id) && e.expense_date >= dateFrom && e.expense_date <= dateTo);
  const filteredInvoices = invoices.filter(i => i.cpms_project_id && projectIds.has(i.cpms_project_id) && i.doc_date >= dateFrom && i.doc_date <= dateTo);

  const projectExpTotals: Record<string, number> = {};
  filteredExpenses.forEach(e => { if (e.project_id) projectExpTotals[e.project_id] = (projectExpTotals[e.project_id] || 0) + (e.amount || 0); });

  const handleExportCSV = (rows: any[], filename: string) => {
  const { t } = useLanguage();

    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cpms/analytics')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="p-2.5 rounded-lg bg-purple-100">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Construction Reports</h1>
            <p className="text-sm text-muted-foreground">تقارير المشاريع</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Project</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number || p.code} - {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="wip">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="wip"><Activity className="h-4 w-4 mr-1" /> WIP Report</TabsTrigger>
          <TabsTrigger value="job-costing"><DollarSign className="h-4 w-4 mr-1" /> Job Costing</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="h-4 w-4 mr-1" /> Performance</TabsTrigger>
          <TabsTrigger value="customer"><Users className="h-4 w-4 mr-1" /> Customer Profitability</TabsTrigger>
        </TabsList>

        {/* WIP REPORT */}
        <TabsContent value="wip">
          <WIPReport projects={filteredProjects} expenses={filteredExpenses} invoices={filteredInvoices}
            projectExpTotals={projectExpTotals} fmt={fmt} onExport={handleExportCSV} />
        </TabsContent>

        {/* JOB COSTING */}
        <TabsContent value="job-costing">
          <JobCostingReport projects={filteredProjects} expenses={filteredExpenses} invoices={filteredInvoices}
            projectExpTotals={projectExpTotals} fmt={fmt} onExport={handleExportCSV} />
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance">
          <PerformanceReport projects={filteredProjects} expenses={filteredExpenses} invoices={filteredInvoices}
            projectExpTotals={projectExpTotals} fmt={fmt} onExport={handleExportCSV} />
        </TabsContent>

        {/* CUSTOMER PROFITABILITY */}
        <TabsContent value="customer">
          <CustomerProfitReport projects={filteredProjects} expenses={filteredExpenses} invoices={filteredInvoices}
            projectExpTotals={projectExpTotals} fmt={fmt} onExport={handleExportCSV} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======== WIP Report ========
function WIPReport({ projects, expenses, invoices, projectExpTotals, fmt, onExport }: any) {
  const activeProjects = projects.filter((p: any) => ['in_progress', 'active', 'awarded'].includes(p.status));
  const rows = activeProjects.map((p: any) => {
    const billed = invoices.filter((i: any) => i.cpms_project_id === p.id).reduce((s: number, i: any) => s + (i.total || 0), 0);
    const costs = projectExpTotals[p.id] || 0;
    const costPct = p.budgeted_cost > 0 ? costs / p.budgeted_cost * 100 : (p.contract_value > 0 ? costs / p.contract_value * 100 : 0);
    const overUnder = billed - (p.contract_value * (costPct / 100));
    return {
      project: p.project_number || p.code, name: p.name, client: p.client_name || '-',
      contract: p.contract_value || 0, billed, pctBilled: p.contract_value > 0 ? (billed / p.contract_value * 100) : 0,
      costs, profit: billed - costs, overUnder, costPct,
    };
  });

  const totals = rows.reduce((t: any, r: any) => ({
    contract: t.contract + r.contract, billed: t.billed + r.billed,
    costs: t.costs + r.costs, profit: t.profit + r.profit,
  }), { contract: 0, billed: 0, costs: 0, profit: 0 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Work in Progress Report</CardTitle>
          <CardDescription className="text-xs">All in-progress projects financial status</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onExport(rows, 'wip-report')}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Contract</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">% Complete</TableHead>
                <TableHead className="text-right">Costs</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Over/Under Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No in-progress projects</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.project}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.project}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{r.name}</p>
                  </TableCell>
                  <TableCell className="text-sm">{r.client}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(r.contract)}</TableCell>
                  <TableCell className="text-right">{fmt(r.billed)}</TableCell>
                  <TableCell className="text-right">{r.pctBilled.toFixed(0)}%</TableCell>
                  <TableCell className="text-right">{fmt(r.costs)}</TableCell>
                  <TableCell className={`text-right font-medium ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(r.profit)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${r.overUnder >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.overUnder >= 0 ? '+' : ''}{fmt(r.overUnder)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={2}>TOTALS</TableCell>
                  <TableCell className="text-right">{fmt(totals.contract)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.billed)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmt(totals.costs)}</TableCell>
                  <TableCell className={`text-right ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.profit)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ======== Job Costing Report ========
function JobCostingReport({ projects, expenses, invoices, projectExpTotals, fmt, onExport }: any) {
  const { t } = useLanguage();

  const rows = projects.map((p: any) => {
    const rev = invoices.filter((i: any) => i.cpms_project_id === p.id).reduce((s: number, i: any) => s + (i.total || 0), 0);
    const costs = projectExpTotals[p.id] || 0;
    const catBreakdown: Record<string, number> = {};
    expenses.filter((e: any) => e.project_id === p.id).forEach((e: any) => {
      catBreakdown[e.category] = (catBreakdown[e.category] || 0) + (e.amount || 0);
    });
    return {
      project: p.project_number || p.code, name: p.name, status: p.status,
      contract: p.contract_value || 0, budget: p.budgeted_cost || 0,
      revenue: rev, costs, profit: rev - costs,
      margin: rev > 0 ? ((rev - costs) / rev * 100) : 0,
      materials: catBreakdown['materials'] || 0,
      labor: catBreakdown['labor'] || 0,
      equipment: catBreakdown['equipment'] || 0,
      subcontractor: catBreakdown['subcontractor'] || 0,
      other: (catBreakdown['permits'] || 0) + (catBreakdown['other'] || 0),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Job Costing Report (P&L)</CardTitle>
          <CardDescription className="text-xs">Revenue, costs, and profit by project</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => onExport(rows, 'job-costing')}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Project</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">Contract</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Materials</TableHead>
              <TableHead className="text-right">Labor</TableHead>
              <TableHead className="text-right">Equipment</TableHead>
              <TableHead className="text-right">Subcontr.</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.project}>
                <TableCell>
                  <p className="font-medium text-sm">{r.project}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{r.name}</p>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{r.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-right">{fmt(r.contract)}</TableCell>
                <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.materials)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.labor)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.equipment)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(r.subcontractor)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.costs)}</TableCell>
                <TableCell className={`text-right font-bold ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.profit)}</TableCell>
                <TableCell className={`text-right font-medium ${r.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{r.margin.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ======== Performance Report ========
function PerformanceReport({ projects, expenses, invoices, projectExpTotals, fmt, onExport }: any) {
  const { t } = useLanguage();

  const now = new Date();
  const rows = projects.map((p: any) => {
    const costs = projectExpTotals[p.id] || 0;
    const budget = p.budgeted_cost || 0;
    const budgetVariance = budget - costs;
    const budgetPct = budget > 0 ? (costs / budget * 100) : 0;
    const start = p.start_date ? new Date(p.start_date) : null;
    const daysActive = start ? Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000)) : 0;
    const billed = invoices.filter((i: any) => i.cpms_project_id === p.id).reduce((s: number, i: any) => s + (i.total || 0), 0);
    const pctComplete = p.contract_value > 0 ? (billed / p.contract_value * 100) : 0;
    return {
      project: p.project_number || p.code, name: p.name, status: p.status,
      daysActive, pctComplete: Math.min(pctComplete, 100),
      budget, costs, budgetVariance, budgetPct,
      budgetHealth: budgetPct < 90 ? 'On Track' : budgetPct <= 100 ? 'Warning' : 'Over Budget',
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Project Performance</CardTitle>
          <CardDescription className="text-xs">Schedule & budget performance metrics</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => onExport(rows, 'performance')}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Project</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">Days Active</TableHead>
              <TableHead className="text-right">% Complete</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Actual Cost</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Budget Health</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.project}>
                <TableCell>
                  <p className="font-medium text-sm">{r.project}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{r.name}</p>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{r.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-right">{r.daysActive}</TableCell>
                <TableCell className="text-right">{r.pctComplete.toFixed(0)}%</TableCell>
                <TableCell className="text-right">{fmt(r.budget)}</TableCell>
                <TableCell className="text-right">{fmt(r.costs)}</TableCell>
                <TableCell className={`text-right font-medium ${r.budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {r.budgetVariance >= 0 ? '+' : ''}{fmt(r.budgetVariance)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    r.budgetHealth === 'On Track' ? 'bg-green-100 text-green-800 border-green-200' :
                    r.budgetHealth === 'Warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-red-100 text-red-800 border-red-200'
                  }>{r.budgetHealth}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ======== Customer Profitability Report ========
function CustomerProfitReport({ projects, expenses, invoices, projectExpTotals, fmt, onExport }: any) {
  const customerMap: Record<string, { projects: number; contract: number; revenue: number; costs: number }> = {};
  projects.forEach((p: any) => {
    const client = p.client_name || 'Unknown';
    if (!customerMap[client]) customerMap[client] = { projects: 0, contract: 0, revenue: 0, costs: 0 };
    customerMap[client].projects++;
    customerMap[client].contract += (p.contract_value || 0);
    customerMap[client].revenue += invoices.filter((i: any) => i.cpms_project_id === p.id).reduce((s: number, i: any) => s + (i.total || 0), 0);
    customerMap[client].costs += (projectExpTotals[p.id] || 0);
  });

  const rows = Object.entries(customerMap).map(([name, data]) => ({
    customer: name, ...data,
    profit: data.revenue - data.costs,
    margin: data.revenue > 0 ? ((data.revenue - data.costs) / data.revenue * 100) : 0,
  })).sort((a, b) => b.profit - a.profit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Customer Profitability</CardTitle>
          <CardDescription className="text-xs">Revenue and profit by customer</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => onExport(rows, 'customer-profitability')}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead className="text-right">Contract Value</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.customer}>
                <TableCell className="font-medium">{r.customer}</TableCell>
                <TableCell className="text-right">{r.projects}</TableCell>
                <TableCell className="text-right">{fmt(r.contract)}</TableCell>
                <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                <TableCell className="text-right">{fmt(r.costs)}</TableCell>
                <TableCell className={`text-right font-bold ${r.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.profit)}</TableCell>
                <TableCell className={`text-right font-medium ${r.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{r.margin.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
