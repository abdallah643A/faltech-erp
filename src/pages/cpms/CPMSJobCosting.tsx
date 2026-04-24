import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/integrations/supabase/new-tables';
import type { CpmsSubcontractorOrderLite } from '@/types/data-contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Download, FileText, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Clock, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useCPMS } from '@/hooks/useCPMS';
import { formatSAR } from '@/lib/currency';
import { format, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '@/contexts/LanguageContext';

type CostCategory =
  | 'Labor - Direct'
  | 'Labor - Subcontractor'
  | 'Materials'
  | 'Equipment - Owned'
  | 'Equipment - Rented'
  | 'Subcontracts'
  | 'Permits & Fees'
  | 'Other Costs';

const CATEGORY_MAP: Record<string, CostCategory> = {
  Labor: 'Labor - Direct',
  Subcontractor: 'Labor - Subcontractor',
  Materials: 'Materials',
  Equipment: 'Equipment - Owned',
  Permits: 'Permits & Fees',
  Other: 'Other Costs',
};

const ALL_CATEGORIES: CostCategory[] = [
  'Labor - Direct',
  'Labor - Subcontractor',
  'Materials',
  'Equipment - Owned',
  'Equipment - Rented',
  'Subcontracts',
  'Permits & Fees',
  'Other Costs',
];

export default function CPMSJobCosting() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const project = projects.find((p: any) => p.id === selectedProject);

  // Fetch expenses for selected project
  const expensesQuery = useQuery({
    queryKey: ['jc-expenses', selectedProject, dateFrom, dateTo, lastRefreshed.getTime()],
    enabled: !!selectedProject,
    queryFn: async () => {
      let q = supabase.from('cpms_expenses' as any).select('*')
        .eq('project_id', selectedProject);
      if (dateFrom) q = q.gte('expense_date', dateFrom);
      if (dateTo) q = q.lte('expense_date', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch commitments (POs) for selected project
  const commitmentsQuery = useQuery({
    queryKey: ['jc-commitments', selectedProject, lastRefreshed.getTime()],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_commitments' as any).select('*')
        .eq('project_id', selectedProject);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch cost code budgets for this project
  const budgetsQuery = useQuery({
    queryKey: ['jc-budgets', selectedProject, lastRefreshed.getTime()],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_cost_code_budgets' as any).select('*')
        .eq('project_id', selectedProject);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch subcontractor orders for committed amounts
  const subOrdersQuery = useQuery({
    queryKey: ['jc-sub-orders', selectedProject, lastRefreshed.getTime()],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await newTables.cpmsSubcontractorOrders().select('*')
        .eq('project_id', selectedProject);
      if (error) throw error;
      return (data ?? []) as CpmsSubcontractorOrderLite[];
    },
  });

  const expenses = expensesQuery.data || [];
  const commitments = commitmentsQuery.data || [];
  const subOrders = subOrdersQuery.data || [];
  const totalBudgetAllocated = (budgetsQuery.data || []).reduce((s: number, b: any) => s + (b.budgeted_amount || 0), 0);

  // Aggregate by category
  const rows = useMemo(() => {
    const categoryActual: Record<CostCategory, number> = {} as any;
    const categoryCommitted: Record<CostCategory, number> = {} as any;
    ALL_CATEGORIES.forEach(c => { categoryActual[c] = 0; categoryCommitted[c] = 0; });

    // Map expenses to categories
    expenses.forEach((e: any) => {
      const cat = CATEGORY_MAP[e.category] || 'Other Costs';
      categoryActual[cat] += e.amount || 0;
    });

    // Map commitments
    commitments.forEach((c: any) => {
      const remaining = (c.committed_amount || 0) - (c.invoiced_amount || 0);
      if (remaining > 0) {
        if (c.type === 'subcontract') categoryCommitted['Subcontracts'] += remaining;
        else if (c.type === 'material_po') categoryCommitted['Materials'] += remaining;
        else if (c.type === 'equipment_rental') categoryCommitted['Equipment - Rented'] += remaining;
        else categoryCommitted['Other Costs'] += remaining;
      }
    });

    // Subcontractor orders as committed for Subcontracts
    subOrders.forEach((so: any) => {
      if (so.status === 'active' || so.status === 'approved') {
        const remaining = (so.total_amount || 0) - (so.paid_amount || 0);
        if (remaining > 0) {
          categoryCommitted['Subcontracts'] += remaining;
          categoryActual['Labor - Subcontractor'] += (so.paid_amount || 0);
        }
      }
    });

    // Budget allocation proportionally based on project budget
    const contractValue = project?.contract_value || 0;
    const budgetedCost = (project as any)?.budgeted_cost || totalBudgetAllocated || contractValue * 0.85;
    const budgetProportions: Record<CostCategory, number> = {
      'Labor - Direct': 0.25,
      'Labor - Subcontractor': 0.15,
      'Materials': 0.30,
      'Equipment - Owned': 0.08,
      'Equipment - Rented': 0.05,
      'Subcontracts': 0.10,
      'Permits & Fees': 0.03,
      'Other Costs': 0.04,
    };

    return ALL_CATEGORIES.map(cat => {
      const budgeted = budgetedCost * budgetProportions[cat];
      const actual = categoryActual[cat];
      const committed = categoryCommitted[cat];
      const forecast = actual + committed;
      const variance = budgeted - forecast;
      const pctComplete = budgeted > 0 ? (actual / budgeted) * 100 : 0;
      const pctOverUnder = budgeted > 0 ? (variance / budgeted) * 100 : 0;
      return { category: cat, budgeted, actual, committed, forecast, variance, pctComplete, pctOverUnder };
    });
  }, [expenses, commitments, subOrders, project, totalBudgetAllocated]);

  // Totals
  const totals = useMemo(() => {
    const t = { budgeted: 0, actual: 0, committed: 0, forecast: 0, variance: 0 };
    rows.forEach(r => {
      t.budgeted += r.budgeted;
      t.actual += r.actual;
      t.committed += r.committed;
      t.forecast += r.forecast;
      t.variance += r.variance;
    });
    return t;
  }, [rows]);

  // Profitability
  const profitability = useMemo(() => {
    const contractValue = project?.contract_value || 0;
    const grossProfitBudget = contractValue - totals.budgeted;
    const grossProfitActual = contractValue - totals.actual;
    const marginBudget = contractValue > 0 ? (grossProfitBudget / contractValue) * 100 : 0;
    const marginActual = contractValue > 0 ? (grossProfitActual / contractValue) * 100 : 0;
    const profitVariance = grossProfitActual - grossProfitBudget;
    return { contractValue, grossProfitBudget, grossProfitActual, marginBudget, marginActual, profitVariance };
  }, [project, totals]);

  // Drill-down data
  const drillData = useMemo(() => {
    if (!drillCategory) return [];
    const reverseMap: Record<CostCategory, string[]> = {
      'Labor - Direct': ['Labor'],
      'Labor - Subcontractor': ['Subcontractor'],
      'Materials': ['Materials'],
      'Equipment - Owned': ['Equipment'],
      'Equipment - Rented': ['Equipment'],
      'Subcontracts': ['Subcontractor'],
      'Permits & Fees': ['Permits'],
      'Other Costs': ['Other'],
    };
    const cats = reverseMap[drillCategory as CostCategory] || [];
    return expenses.filter((e: any) => cats.includes(e.category));
  }, [drillCategory, expenses]);

  const loading = expensesQuery.isLoading || commitmentsQuery.isLoading;

  // Export to Excel
  const exportExcel = () => {
    const sheetData: Record<string, any>[] = rows.map(r => ({
      Category: r.category,
      'Budgeted (SAR)': r.budgeted,
      'Actual (SAR)': r.actual,
      'Committed (SAR)': r.committed,
      'Forecast (SAR)': r.forecast,
      'Variance (SAR)': r.variance,
      '% Complete': `${r.pctComplete.toFixed(1)}%`,
    }));
    sheetData.push({
      Category: 'TOTAL',
      'Budgeted (SAR)': totals.budgeted,
      'Actual (SAR)': totals.actual,
      'Committed (SAR)': totals.committed,
      'Forecast (SAR)': totals.forecast,
      'Variance (SAR)': totals.variance,
      '% Complete': '',
    });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Job Costing');
    XLSX.writeFile(wb, `job_costing_${project?.code || 'report'}.xlsx`);
  };

  // Export to PDF
  const exportPDF = () => {
  const { t } = useLanguage();

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Job Costing Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Project: ${project?.name || 'N/A'} (${project?.code || ''})`, 14, 23);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 29);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [['Category', 'Budgeted (SAR)', 'Actual (SAR)', 'Committed (SAR)', 'Forecast (SAR)', 'Variance (SAR)', '% Complete']],
      body: [
        ...rows.map(r => [
          r.category,
          formatSAR(r.budgeted),
          formatSAR(r.actual),
          formatSAR(r.committed),
          formatSAR(r.forecast),
          formatSAR(r.variance),
          `${r.pctComplete.toFixed(1)}%`,
        ]),
        ['TOTAL', formatSAR(totals.budgeted), formatSAR(totals.actual), formatSAR(totals.committed), formatSAR(totals.forecast), formatSAR(totals.variance), ''],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fontStyle: 'bold' },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(12);
    doc.text('Profitability Summary', 14, finalY + 12);
    doc.setFontSize(9);
    doc.text(`Contract Value: ${formatSAR(profitability.contractValue)} SAR`, 14, finalY + 20);
    doc.text(`Gross Profit (Budget): ${formatSAR(profitability.grossProfitBudget)} SAR (${profitability.marginBudget.toFixed(1)}%)`, 14, finalY + 26);
    doc.text(`Gross Profit (Actual): ${formatSAR(profitability.grossProfitActual)} SAR (${profitability.marginActual.toFixed(1)}%)`, 14, finalY + 32);
    doc.text(`Profit Variance: ${formatSAR(profitability.profitVariance)} SAR`, 14, finalY + 38);

    doc.save(`job_costing_${project?.code || 'report'}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Job Costing Report
          </h1>
          <p className="text-sm text-muted-foreground">Project profitability and cost analysis</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {format(lastRefreshed, 'HH:mm:ss')}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setLastRefreshed(new Date())}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!selectedProject}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!selectedProject}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[250px]">
              <Label className="text-xs font-medium">Project *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number || p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs font-medium">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedProject && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a project to view job costing</p>
          </CardContent>
        </Card>
      )}

      {selectedProject && loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {selectedProject && !loading && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Budgeted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatSAR(totals.budgeted)}</p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatSAR(totals.actual)}</p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Committed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatSAR(totals.committed)}</p>
                <p className="text-xs text-muted-foreground">SAR (unpaid POs)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.variance >= 0 ? '+' : ''}{formatSAR(totals.variance)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {totals.variance >= 0 ? <ArrowDownRight className="h-3 w-3 text-green-600" /> : <ArrowUpRight className="h-3 w-3 text-red-600" />}
                  {totals.variance >= 0 ? 'Under budget' : 'Over budget'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budgeted (SAR)</TableHead>
                    <TableHead className="text-right">Actual (SAR)</TableHead>
                    <TableHead className="text-right">Committed (SAR)</TableHead>
                    <TableHead className="text-right">Forecast (SAR)</TableHead>
                    <TableHead className="text-right">Variance (SAR)</TableHead>
                    <TableHead className="text-right w-[80px]">% Complete</TableHead>
                    <TableHead className="w-[100px]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const overBudget = r.pctOverUnder < -10;
                    return (
                      <TableRow
                        key={r.category}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setDrillCategory(r.category)}
                      >
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            {r.category}
                            {overBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatSAR(r.budgeted)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatSAR(r.actual)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatSAR(r.committed)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatSAR(r.forecast)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${r.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {r.variance >= 0 ? '+' : ''}{formatSAR(r.variance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={r.pctComplete > 100 ? 'destructive' : r.pctComplete > 80 ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {r.pctComplete.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Progress value={Math.min(r.pctComplete, 100)} className="h-2" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals Row */}
                  <TableRow className="font-bold border-t-2 bg-muted/30">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSAR(totals.budgeted)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSAR(totals.actual)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSAR(totals.committed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSAR(totals.forecast)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.variance >= 0 ? '+' : ''}{formatSAR(totals.variance)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Profitability Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> Profitability Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
                  <p className="text-xl font-bold">{formatSAR(profitability.contractValue)}</p>
                  <p className="text-xs text-muted-foreground">SAR</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gross Profit (Budget)</p>
                  <p className="text-xl font-bold">{formatSAR(profitability.grossProfitBudget)}</p>
                  <p className="text-xs text-muted-foreground">
                    Margin: {profitability.marginBudget.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gross Profit (Actual)</p>
                  <p className={`text-xl font-bold ${profitability.grossProfitActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatSAR(profitability.grossProfitActual)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margin: {profitability.marginActual.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Profit Variance</p>
                  <p className={`text-xl font-bold flex items-center gap-1 ${profitability.profitVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitability.profitVariance >= 0
                      ? <TrendingUp className="h-5 w-5" />
                      : <TrendingDown className="h-5 w-5" />
                    }
                    {formatSAR(Math.abs(profitability.profitVariance))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profitability.profitVariance >= 0 ? 'Above plan' : 'Below plan'}
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Visual margin comparison */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">Budget Margin</span>
                    <span className="text-xs">{profitability.marginBudget.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.max(0, profitability.marginBudget)} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">Actual Margin</span>
                    <span className="text-xs">{profitability.marginActual.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.max(0, profitability.marginActual)} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Drill-down Dialog */}
      <Dialog open={!!drillCategory} onOpenChange={() => setDrillCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Expense Details: {drillCategory}</DialogTitle>
          </DialogHeader>
          {drillData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses in this category for the selected period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount (SAR)</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillData.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.expense_date}</TableCell>
                    <TableCell className="text-sm font-medium">{e.vendor_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
                    <TableCell className="text-sm font-mono">{e.cost_code || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{e.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatSAR(e.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={e.paid ? 'default' : 'secondary'} className="text-[10px]">
                        {e.paid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={5}>{t('common.total')}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatSAR(drillData.reduce((s: number, e: any) => s + (e.amount || 0), 0))}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
