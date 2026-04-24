import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Calculator, Copy } from 'lucide-react';
import { BudgetVersionLine, useBudgetPeriodAllocs } from '@/hooks/useBudgetMasters';
import { formatSAR } from '@/lib/currency';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  lines: BudgetVersionLine[];
  startYear: number;
  endYear: number;
  isEditable: boolean;
}

export function BudgetPeriodDistribution({ lines, startYear, endYear, isEditable }: Props) {
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(startYear);
  const [monthlyValues, setMonthlyValues] = useState<number[]>(Array(12).fill(0));
  const { data: allocs = [], upsertBatch } = useBudgetPeriodAllocs(selectedLineId);

  const years = useMemo(() => {
    const yrs: number[] = [];
    for (let y = startYear; y <= endYear; y++) yrs.push(y);
    return yrs;
  }, [startYear, endYear]);

  const selectedLine = lines.find(l => l.id === selectedLineId);

  useEffect(() => {
    if (allocs.length > 0) {
      const yearAllocs = allocs.filter(a => a.period_year === selectedYear);
      const values = Array(12).fill(0);
      yearAllocs.forEach(a => { values[a.period_month - 1] = Number(a.budget_amount); });
      setMonthlyValues(values);
    } else {
      setMonthlyValues(Array(12).fill(0));
    }
  }, [allocs, selectedYear]);

  const totalAllocated = monthlyValues.reduce((s, v) => s + v, 0);
  const lineTotal = Number(selectedLine?.revised_amount || selectedLine?.original_amount || 0);
  const difference = lineTotal - totalAllocated;

  const distributeEvenly = () => {
    const monthly = Math.round((lineTotal / 12) * 100) / 100;
    const values = Array(12).fill(monthly);
    const remainder = lineTotal - monthly * 12;
    values[11] = Math.round((values[11] + remainder) * 100) / 100;
    setMonthlyValues(values);
  };

  const distributeQuarterly = () => {
    const quarterly = Math.round((lineTotal / 4) * 100) / 100;
    const values = Array(12).fill(0);
    [2, 5, 8, 11].forEach((m, i) => { values[m] = i < 3 ? quarterly : lineTotal - quarterly * 3; });
    setMonthlyValues(values);
  };

  const distributeFrontLoaded = () => {
    const values = Array(12).fill(0);
    const weights = [15, 12, 11, 10, 9, 8, 8, 7, 6, 5, 5, 4];
    weights.forEach((w, i) => { values[i] = Math.round((lineTotal * w / 100) * 100) / 100; });
    const diff = lineTotal - values.reduce((s, v) => s + v, 0);
    values[0] = Math.round((values[0] + diff) * 100) / 100;
    setMonthlyValues(values);
  };

  const handleSave = () => {
    if (!selectedLineId) return;
    const payload = monthlyValues.map((amount, i) => ({
      line_id: selectedLineId,
      period_year: selectedYear,
      period_month: i + 1,
      budget_amount: amount,
      available_amount: amount,
    }));
    upsertBatch.mutate(payload);
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Period Distribution</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Select budget line..." /></SelectTrigger>
              <SelectContent>
                {lines.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    #{l.line_num} - {l.description || l.account_code || l.budget_category || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {years.length > 1 && (
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedLineId ? (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md text-sm">
              <span>Line Total: <strong className="font-mono">{formatSAR(lineTotal)}</strong></span>
              <span>Allocated: <strong className="font-mono">{formatSAR(totalAllocated)}</strong></span>
              <span className={difference !== 0 ? 'text-destructive font-medium' : 'text-green-600'}>
                Difference: <strong className="font-mono">{formatSAR(difference)}</strong>
              </span>
              {Math.abs(difference) < 0.01 && <Badge className="bg-green-100 text-green-700 text-xs">Balanced</Badge>}
            </div>

            {/* Distribution buttons */}
            {isEditable && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={distributeEvenly}><Calculator className="h-3.5 w-3.5 mr-1" />Even</Button>
                <Button variant="outline" size="sm" onClick={distributeQuarterly}>Quarterly</Button>
                <Button variant="outline" size="sm" onClick={distributeFrontLoaded}>Front-Loaded</Button>
              </div>
            )}

            {/* Monthly grid */}
            <div className="grid grid-cols-4 gap-3">
              {MONTHS.map((m, i) => (
                <div key={m} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{m} {selectedYear}</label>
                  <Input
                    type="number"
                    value={monthlyValues[i] || ''}
                    onChange={e => {
                      const v = [...monthlyValues];
                      v[i] = Number(e.target.value) || 0;
                      setMonthlyValues(v);
                    }}
                    className="h-8 text-sm font-mono"
                    disabled={!isEditable}
                  />
                </div>
              ))}
            </div>

            {/* Quarterly summary */}
            <div className="grid grid-cols-4 gap-3">
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => {
                const qTotal = monthlyValues.slice(qi * 3, qi * 3 + 3).reduce((s, v) => s + v, 0);
                return (
                  <div key={q} className="text-center p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">{q}</div>
                    <div className="font-mono text-sm font-medium">{formatSAR(qTotal)}</div>
                  </div>
                );
              })}
            </div>

            {isEditable && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={upsertBatch.isPending}>
                  <Save className="h-4 w-4 mr-1" />Save Distribution
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Select a budget line to manage period distribution</div>
        )}
      </CardContent>
    </Card>
  );
}
