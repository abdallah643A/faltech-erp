import { useState, useMemo } from 'react';
import { PMOPageShell } from '@/components/pmo/PMOPageShell';
import { useHealthSnapshots, useComputeHealth, useProjectsList } from '@/hooks/usePMO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusVariant = (s: string) => s === 'green' ? 'default' : s === 'amber' ? 'secondary' : 'destructive';

export default function ExecutivePortfolioPage() {
  const { data: projects } = useProjectsList();
  const { data: snapshots, isLoading } = useHealthSnapshots();
  const compute = useComputeHealth();

  const latest = useMemo(() => {
    const map = new Map<string, any>();
    (snapshots || []).forEach((s: any) => {
      const cur = map.get(s.project_id);
      if (!cur || new Date(s.computed_at) > new Date(cur.computed_at)) map.set(s.project_id, s);
    });
    return Array.from(map.values());
  }, [snapshots]);

  const stats = useMemo(() => ({
    total: latest.length,
    green: latest.filter((l: any) => l.health_status === 'green').length,
    amber: latest.filter((l: any) => l.health_status === 'amber').length,
    red: latest.filter((l: any) => l.health_status === 'red').length,
  }), [latest]);

  const projectName = (id: string) => projects?.find((p: any) => p.id === id)?.project_name || id.slice(0, 8);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Portfolio View</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-project health, budget, schedule, and risk at a glance.</p>
        </div>
        <Button size="sm" variant="outline" onClick={async () => {
          for (const p of projects || []) await compute.mutateAsync(p.id);
        }} disabled={compute.isPending}>
          {compute.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Recompute All
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="w-5 h-5 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Tracked Projects</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-2xl font-bold text-primary">{stats.green}</p><p className="text-xs text-muted-foreground">Healthy</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-2xl font-bold text-amber-600">{stats.amber}</p><p className="text-xs text-muted-foreground">At Risk</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-2xl font-bold text-destructive">{stats.red}</p><p className="text-xs text-muted-foreground">Critical</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Latest Health Snapshots</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div>
            : latest.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No snapshots. Click Recompute All to generate.</div>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Project</TableHead><TableHead className="text-right">Schedule</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Risk</TableHead><TableHead className="text-right">Overall</TableHead><TableHead>Status</TableHead><TableHead>Computed</TableHead></TableRow></TableHeader>
                <TableBody>
                  {latest.sort((a: any, b: any) => Number(a.overall_score) - Number(b.overall_score)).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{projectName(s.project_id)}</TableCell>
                      <TableCell className="text-right">{Number(s.schedule_score).toFixed(0)}</TableCell>
                      <TableCell className="text-right">{Number(s.budget_score).toFixed(0)}</TableCell>
                      <TableCell className="text-right">{Number(s.risk_score).toFixed(0)}</TableCell>
                      <TableCell className="text-right font-bold">{Number(s.overall_score).toFixed(1)}</TableCell>
                      <TableCell><Badge variant={statusVariant(s.health_status) as any}>{s.health_status}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(s.computed_at), 'MMM d, HH:mm')}</TableCell>
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
