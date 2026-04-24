import { useState, useMemo } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useBaselines, useStageGates } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export default function ScheduleVariancePage() {
  const [projectId, setProjectId] = useState('');
  const { data: baselines } = useBaselines(projectId);
  const { data: gates } = useStageGates(projectId);

  const variances = useMemo(() => {
    return (gates || []).filter((g: any) => g.planned_date).map((g: any) => {
      const variance = g.actual_date ? differenceInDays(new Date(g.actual_date), new Date(g.planned_date)) : null;
      return { ...g, variance };
    });
  }, [gates]);

  const summary = useMemo(() => {
    const completed = variances.filter(v => v.variance !== null);
    const avg = completed.length > 0 ? completed.reduce((s, v) => s + (v.variance || 0), 0) / completed.length : 0;
    const onTime = completed.filter(v => (v.variance || 0) <= 0).length;
    return { count: completed.length, avg, onTime, late: completed.length - onTime };
  }, [variances]);

  const current = baselines?.find((b: any) => b.is_current);

  return (
    <PMOPageShell title="Schedule Variance" description="Compare planned vs actual gate dates against the current baseline." projectId={projectId} setProjectId={setProjectId}>
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Current Baseline</p><p className="text-lg font-bold truncate">{current?.baseline_name || '— None —'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Completed Gates</p><p className="text-2xl font-bold">{summary.count}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">On Time</p><p className="text-2xl font-bold text-primary">{summary.onTime}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Avg Variance (days)</p><p className={`text-2xl font-bold ${summary.avg > 0 ? 'text-destructive' : 'text-primary'}`}>{summary.avg.toFixed(1)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Gate Variance Detail</CardTitle></CardHeader>
        <CardContent>
          {variances.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No gates with planned dates. Define stage gates first.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Gate</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead><TableHead className="text-right">Variance (d)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {variances.sort((a, b) => a.gate_seq - b.gate_seq).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">G{v.gate_seq}</TableCell>
                      <TableCell className="font-medium">{v.gate_name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(v.planned_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-xs">{v.actual_date ? format(new Date(v.actual_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right">
                        {v.variance === null ? <span className="text-muted-foreground">—</span>
                          : <span className={`flex items-center justify-end gap-1 font-medium ${v.variance > 0 ? 'text-destructive' : v.variance < 0 ? 'text-primary' : ''}`}>
                              {v.variance > 0 ? <TrendingUp className="w-3 h-3" /> : v.variance < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {v.variance}
                            </span>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </PMOPageShell>
  );
}
