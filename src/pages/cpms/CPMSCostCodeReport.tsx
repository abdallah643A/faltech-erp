import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Filter, BarChart3 } from 'lucide-react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCostCodes } from '@/hooks/useCostCodes';
import { formatSAR } from '@/lib/currency';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSCostCodeReport() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const { codes } = useCostCodes();
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [drillCode, setDrillCode] = useState<string | null>(null);

  const allCodes = codes.data || [];

  // Fetch expenses grouped by cost_code
  const expenses = useQuery({
    queryKey: ['cost-code-expenses', projectFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('cpms_expenses' as any).select('*');
      if (projectFilter !== 'all') q = q.eq('project_id', projectFilter);
      if (dateFrom) q = q.gte('expense_date', dateFrom);
      if (dateTo) q = q.lte('expense_date', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch budgets
  const budgets = useQuery({
    queryKey: ['cost-code-budgets-report', projectFilter],
    queryFn: async () => {
      let q = supabase.from('cpms_cost_code_budgets' as any).select('*');
      if (projectFilter !== 'all') q = q.eq('project_id', projectFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const expenseData = expenses.data || [];
  const budgetData = budgets.data || [];

  // Aggregate by cost_code
  const codeSpend: Record<string, number> = {};
  expenseData.forEach((e: any) => {
    const cc = e.cost_code || 'Unassigned';
    codeSpend[cc] = (codeSpend[cc] || 0) + (e.amount || 0);
  });

  // Get budget by code_id
  const codeBudgetMap: Record<string, number> = {};
  budgetData.forEach((b: any) => {
    codeBudgetMap[b.cost_code_id] = (codeBudgetMap[b.cost_code_id] || 0) + (b.budgeted_amount || 0);
  });

  // Build report rows
  const reportRows = allCodes.map(cc => {
    const actual = codeSpend[cc.code] || 0;
    const budgetEntry = budgetData.find((b: any) => b.cost_code_id === cc.id);
    const budget = budgetEntry?.budgeted_amount || 0;
    const variance = budget - actual;
    const pct = budget > 0 ? (actual / budget) * 100 : 0;
    return { ...cc, actual, budget, variance, pct };
  }).filter(r => r.actual > 0 || r.budget > 0);

  // Unassigned expenses
  const unassigned = codeSpend['Unassigned'] || 0;

  const totalActual = reportRows.reduce((s, r) => s + r.actual, 0) + unassigned;
  const totalBudget = reportRows.reduce((s, r) => s + r.budget, 0);

  // Drill-down expenses
  const drillExpenses = drillCode ? expenseData.filter((e: any) => (e.cost_code || 'Unassigned') === drillCode) : [];

  const handleExport = () => {
    const rows = reportRows.map(r => ({
      Code: r.code, Title: r.title, Budget: r.budget, Actual: r.actual,
      Variance: r.variance, 'Usage %': r.pct.toFixed(1),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Code Report');
    XLSX.writeFile(wb, 'cost_code_report.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" />Cost Code Report</h1>
          <p className="text-sm text-muted-foreground">Analyze spending by CSI MasterFormat cost codes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Budget</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatSAR(totalBudget)} SAR</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Actual</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatSAR(totalActual)} SAR</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Variance</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalBudget - totalActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatSAR(totalBudget - totalActual)} SAR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader><CardTitle>Cost Code Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">Budgeted (SAR)</TableHead>
                <TableHead className="text-right">Actual (SAR)</TableHead>
                <TableHead className="text-right">Variance (SAR)</TableHead>
                <TableHead className="text-right">% Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrillCode(r.code)}>
                  <TableCell className="font-mono text-sm font-medium">{r.code}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell className="text-right">{formatSAR(r.budget)}</TableCell>
                  <TableCell className="text-right">{formatSAR(r.actual)}</TableCell>
                  <TableCell className={`text-right font-medium ${r.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatSAR(r.variance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.pct > 100 ? 'destructive' : r.pct > 80 ? 'default' : 'secondary'}>
                      {r.pct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {unassigned > 0 && (
                <TableRow className="cursor-pointer" onClick={() => setDrillCode('Unassigned')}>
                  <TableCell className="font-mono text-sm text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">Unassigned</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right">{formatSAR(unassigned)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatSAR(-unassigned)}</TableCell>
                  <TableCell className="text-right"><Badge variant="destructive">N/A</Badge></TableCell>
                </TableRow>
              )}
              {reportRows.length === 0 && !unassigned && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No expense data found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillCode} onOpenChange={() => setDrillCode(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Expenses for Cost Code: {drillCode}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">Amount (SAR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillExpenses.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{e.expense_date}</TableCell>
                  <TableCell>{e.vendor_name}</TableCell>
                  <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate">{e.description}</TableCell>
                  <TableCell className="text-right font-medium">{formatSAR(e.amount)}</TableCell>
                </TableRow>
              ))}
              {drillExpenses.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No expenses</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
