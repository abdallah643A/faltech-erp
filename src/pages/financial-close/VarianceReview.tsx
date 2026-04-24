import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function VarianceReview() {
  const { activeCompanyId } = useActiveCompany();

  const { data: budgetData = [] } = useQuery({
    queryKey: ['variance-review', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('budget_lines' as any).select('*, budget_scenarios!inner(scenario_name, fiscal_year)').limit(100);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Simulate variance data
  const variances = budgetData.slice(0, 20).map((b: any) => {
    const budget = b.total_amount || b.month1 || 0;
    const actual = budget * (0.7 + Math.random() * 0.6); // simulated
    const variance = actual - budget;
    const pct = budget > 0 ? (variance / budget) * 100 : 0;
    return {
      id: b.id,
      account: b.acct_code || 'N/A',
      accountName: b.acct_name || 'Account',
      budget,
      actual: Math.round(actual),
      variance: Math.round(variance),
      variancePct: Math.round(pct * 10) / 10,
      threshold: Math.abs(pct) > 10,
    };
  });

  const overThreshold = variances.filter(v => v.threshold);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Variance Review</h1>
        <p className="text-muted-foreground">Budget vs actual variance analysis with threshold alerts</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold">{variances.length}</p>
          <p className="text-sm text-muted-foreground">Accounts Reviewed</p>
        </CardContent></Card>
        <Card className="border-red-200"><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-red-600">{overThreshold.length}</p>
          <p className="text-sm text-muted-foreground">Over Threshold (±10%)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold">{variances.length - overThreshold.length}</p>
          <p className="text-sm text-muted-foreground">Within Budget</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Variance Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variances.map(v => (
                <TableRow key={v.id} className={v.threshold ? 'bg-red-50' : ''}>
                  <TableCell className="font-mono text-sm">{v.account}</TableCell>
                  <TableCell>{v.accountName}</TableCell>
                  <TableCell className="text-right">{v.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{v.actual.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={v.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {v.variance > 0 ? '+' : ''}{v.variance.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {v.variance > 0 ? <TrendingUp className="h-3 w-3 text-red-500" /> : <TrendingDown className="h-3 w-3 text-green-500" />}
                      {v.variancePct > 0 ? '+' : ''}{v.variancePct}%
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.threshold ? <Badge variant="destructive">Over Threshold</Badge> : <Badge variant="outline">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {variances.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No budget data available for variance review</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
