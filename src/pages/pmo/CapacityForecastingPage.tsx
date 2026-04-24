import { useState } from 'react';
import { useCapacityForecasts, useComputeCapacity } from '@/hooks/usePMOAdvanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Calculator, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColor = (s: string) =>
  s === 'overloaded' ? 'destructive' : s === 'stretched' ? 'secondary' : s === 'underused' ? 'outline' : 'default';

export default function CapacityForecastingPage() {
  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [start, setStart] = useState(today.toISOString().split('T')[0]);
  const [end, setEnd] = useState(monthEnd.toISOString().split('T')[0]);

  const { data: forecasts, isLoading } = useCapacityForecasts();
  const compute = useComputeCapacity();

  const latest = (forecasts || []).filter((f: any) => f.period_start === start && f.period_end === end);
  const totalDemand = latest.reduce((s: number, f: any) => s + Number(f.demand_hours || 0), 0);
  const totalSupply = latest.reduce((s: number, f: any) => s + Number(f.supply_hours || 0), 0);
  const utilization = totalSupply > 0 ? (totalDemand / totalSupply) * 100 : 0;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cross-Project Capacity Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-1">Roll up resource demand vs supply across all active projects.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Forecast Period</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-44" /></div>
          <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-44" /></div>
          <Button onClick={() => compute.mutate({ start, end })} disabled={compute.isPending}>
            {compute.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calculator className="w-4 h-4 mr-1" />}
            Compute Capacity
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-primary" /><div><p className="text-2xl font-bold">{latest.length}</p><p className="text-xs text-muted-foreground">Resources</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{totalDemand.toFixed(0)}h</p><p className="text-xs text-muted-foreground">Total Demand</p></CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-2xl font-bold">{utilization.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Portfolio Utilization</p>
          <Progress value={Math.min(100, utilization)} className="mt-2 h-2" />
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Resource Loading</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : latest.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No data for this period. Click Compute Capacity.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Demand</TableHead><TableHead className="text-right">Supply</TableHead><TableHead className="text-right">Utilization</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {latest.sort((a: any, b: any) => Number(b.utilization_pct) - Number(a.utilization_pct)).map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.resource_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.role || '—'}</TableCell>
                      <TableCell className="text-right">{Number(f.demand_hours).toFixed(0)}h</TableCell>
                      <TableCell className="text-right">{Number(f.supply_hours).toFixed(0)}h</TableCell>
                      <TableCell className="text-right font-medium">{Number(f.utilization_pct).toFixed(1)}%</TableCell>
                      <TableCell><Badge variant={statusColor(f.status) as any}>{f.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
