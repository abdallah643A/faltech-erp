import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Save } from 'lucide-react';
import { useCostCodes, useCostCodeBudgets } from '@/hooks/useCostCodes';
import { formatSAR } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  projectId: string;
  contractValue: number;
}

export default function ProjectCostCodeBudgetTab({ projectId, contractValue }: Props) {
  const { codes } = useCostCodes();
  const { budgets, upsertBudget } = useCostCodeBudgets(projectId);
  const [editAmounts, setEditAmounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);

  const allCodes = (codes.data || []).filter(c => c.is_active);
  const budgetData = budgets.data || [];

  // Fetch actual expenses by cost_code for this project
  const expenses = useQuery({
    queryKey: ['project-expenses-by-code', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_expenses' as any)
        .select('cost_code, amount')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const expenseByCode: Record<string, number> = {};
  (expenses.data || []).forEach((e: any) => {
    const cc = e.cost_code || '';
    expenseByCode[cc] = (expenseByCode[cc] || 0) + (e.amount || 0);
  });

  // Map budget amounts by cost_code_id
  const budgetMap: Record<string, number> = {};
  budgetData.forEach((b: any) => { budgetMap[b.cost_code_id] = b.budgeted_amount || 0; });

  const rows = allCodes.map(cc => {
    const budgeted = editing ? (editAmounts[cc.id] ?? budgetMap[cc.id] ?? 0) : (budgetMap[cc.id] || 0);
    const actual = expenseByCode[cc.code] || 0;
    const variance = budgeted - actual;
    const pct = budgeted > 0 ? (actual / budgeted) * 100 : 0;
    return { ...cc, budgeted, actual, variance, pct };
  }).filter(r => r.budgeted > 0 || r.actual > 0 || editing);

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const budgetBalanced = Math.abs(totalBudgeted - contractValue) < 0.01;

  const startEditing = () => {
    const amounts: Record<string, number> = {};
    allCodes.forEach(cc => { amounts[cc.id] = budgetMap[cc.id] || 0; });
    setEditAmounts(amounts);
    setEditing(true);
  };

  const saveBudgets = () => {
    Object.entries(editAmounts).forEach(([codeId, amount]) => {
      if (amount > 0) {
        upsertBudget.mutate({ project_id: projectId, cost_code_id: codeId, budgeted_amount: amount });
      }
    });
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Budget by Cost Code</CardTitle>
        <div className="flex gap-2 items-center">
          {!budgetBalanced && totalBudgeted > 0 && (
            <Badge variant="destructive" className="text-xs">
              Budget ≠ Contract ({formatSAR(totalBudgeted)} vs {formatSAR(contractValue)})
            </Badge>
          )}
          {budgetBalanced && totalBudgeted > 0 && (
            <Badge variant="default" className="text-xs bg-green-600">Balanced ✓</Badge>
          )}
          {editing ? (
            <Button size="sm" onClick={saveBudgets}><Save className="h-4 w-4 mr-1" />Save</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={startEditing}>Edit Budgets</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Budgeted (SAR)</TableHead>
              <TableHead className="text-right">Actual (SAR)</TableHead>
              <TableHead className="text-right">Variance (SAR)</TableHead>
              <TableHead className="text-right w-[80px]">%</TableHead>
              <TableHead className="w-[120px]">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.code}</TableCell>
                <TableCell className="text-sm">{r.title}</TableCell>
                <TableCell className="text-right">
                  {editing ? (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editAmounts[r.id] || 0}
                      onChange={e => setEditAmounts({ ...editAmounts, [r.id]: Number(e.target.value) })}
                      className="w-[140px] text-right ml-auto"
                    />
                  ) : formatSAR(r.budgeted)}
                </TableCell>
                <TableCell className="text-right">{formatSAR(r.actual)}</TableCell>
                <TableCell className={`text-right font-medium ${r.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatSAR(r.variance)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.pct > 100 ? 'destructive' : r.pct > 80 ? 'default' : 'secondary'} className="text-[10px]">
                    {r.pct.toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Progress value={Math.min(r.pct, 100)} className="h-2" />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  {editing ? 'Set budget amounts for cost codes below' : 'No cost code budgets set. Click "Edit Budgets" to allocate.'}
                </TableCell>
              </TableRow>
            )}
            {/* Totals */}
            {rows.length > 0 && (
              <TableRow className="font-bold border-t-2">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{formatSAR(totalBudgeted)}</TableCell>
                <TableCell className="text-right">{formatSAR(totalActual)}</TableCell>
                <TableCell className={`text-right ${totalBudgeted - totalActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatSAR(totalBudgeted - totalActual)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
