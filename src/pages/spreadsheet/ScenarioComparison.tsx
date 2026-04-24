import { useState } from 'react';
import { useWorkbooks, useScenarios } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ScenarioComparison() {
  const { data: workbooks = [] } = useWorkbooks();
  const [selectedWb, setSelectedWb] = useState<string>('');
  const { data: scenarios = [] } = useScenarios(selectedWb || undefined);

  // Mock comparison data for UI
  const comparisonData = [
    { metric: 'Revenue', base: 5000000, optimistic: 6200000, pessimistic: 4100000 },
    { metric: 'Cost of Sales', base: 3200000, optimistic: 3400000, pessimistic: 3000000 },
    { metric: 'Gross Profit', base: 1800000, optimistic: 2800000, pessimistic: 1100000 },
    { metric: 'Operating Expenses', base: 800000, optimistic: 850000, pessimistic: 750000 },
    { metric: 'Net Profit', base: 1000000, optimistic: 1950000, pessimistic: 350000 },
    { metric: 'Headcount', base: 120, optimistic: 145, pessimistic: 105 },
    { metric: 'Capital Expenditure', base: 500000, optimistic: 750000, pessimistic: 300000 },
  ];

  const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toLocaleString();
  const variance = (a: number, b: number) => ((a - b) / b * 100).toFixed(1);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitCompare className="h-6 w-6" />Scenario Comparison</h1>
        <p className="text-muted-foreground">Compare different planning scenarios side by side</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={selectedWb} onValueChange={setSelectedWb}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Select a workbook to compare scenarios" /></SelectTrigger>
            <SelectContent>{workbooks.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedWb && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.length > 0 ? scenarios.map(s => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="outline">{s.scenario_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.description || 'No description'}</p>
                </CardContent>
              </Card>
            )) : (
              <Card className="col-span-3">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No scenarios created yet. Create scenarios from the Spreadsheet Editor.
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle>Comparison Matrix (Sample Data)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Optimistic</TableHead>
                    <TableHead className="text-right">Δ vs Base</TableHead>
                    <TableHead className="text-right">Pessimistic</TableHead>
                    <TableHead className="text-right">Δ vs Base</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map(row => {
                    const optVar = Number(variance(row.optimistic, row.base));
                    const pesVar = Number(variance(row.pessimistic, row.base));
                    return (
                      <TableRow key={row.metric}>
                        <TableCell className="font-medium">{row.metric}</TableCell>
                        <TableCell className="text-right font-mono">{fmtNum(row.base)}</TableCell>
                        <TableCell className="text-right font-mono">{fmtNum(row.optimistic)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`flex items-center justify-end gap-1 ${optVar > 0 ? 'text-green-600' : optVar < 0 ? 'text-destructive' : ''}`}>
                            {optVar > 0 ? <TrendingUp className="h-3 w-3" /> : optVar < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {optVar > 0 ? '+' : ''}{optVar}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmtNum(row.pessimistic)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`flex items-center justify-end gap-1 ${pesVar > 0 ? 'text-green-600' : pesVar < 0 ? 'text-destructive' : ''}`}>
                            {pesVar > 0 ? <TrendingUp className="h-3 w-3" /> : pesVar < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {pesVar > 0 ? '+' : ''}{pesVar}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
