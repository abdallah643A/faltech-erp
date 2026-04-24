import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Play, TrendingDown, TrendingUp } from 'lucide-react';
import { useScheduleRuns } from '@/hooks/useMfgScheduling';
import { useSimulationScenarios, useSimulationResults } from '@/hooks/useMfgScheduling';
import { format } from 'date-fns';

export default function WhatIfSimulation() {
  const { runs } = useScheduleRuns();
  const { scenarios, isLoading, createScenario, runSimulation } = useSimulationScenarios();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: results } = useSimulationResults(selected || undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scenario_name: '', description: '', base_run_id: '', capacity_multiplier: 1.2 });

  const selectedScen = scenarios?.find((s: any) => s.id === selected);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What-If Simulation</h1>
          <p className="text-sm text-muted-foreground mt-1">Clone a scheduling run, change capacity assumptions, and compare load impact without touching live data.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!runs?.length}><Plus className="w-4 h-4 mr-1" />New Scenario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New What-If Scenario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Scenario Name *</Label><Input value={form.scenario_name} onChange={e => setForm({ ...form, scenario_name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Base Schedule Run *</Label>
                <Select value={form.base_run_id} onValueChange={v => setForm({ ...form, base_run_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select baseline…" /></SelectTrigger>
                  <SelectContent>{(runs || []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.run_number} ({r.total_operations} ops)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Capacity Multiplier (e.g. 1.2 = +20% capacity, 0.8 = -20%)</Label>
                <Input type="number" step="0.1" value={form.capacity_multiplier} onChange={e => setForm({ ...form, capacity_multiplier: +e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!form.scenario_name || !form.base_run_id) return;
                const created: any = await createScenario.mutateAsync(form);
                await runSimulation.mutateAsync(created.id);
                setSelected(created.id);
                setOpen(false);
                setForm({ scenario_name: '', description: '', base_run_id: '', capacity_multiplier: 1.2 });
              }} disabled={createScenario.isPending || runSimulation.isPending}>
                {(createScenario.isPending || runSimulation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Create & Simulate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Scenarios ({scenarios?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
              : (scenarios?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No scenarios. Run scheduler first then create one.</div>
              : (
                <div className="space-y-2">
                  {scenarios!.map((s: any) => (
                    <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left p-3 rounded-md border hover:bg-muted/50 transition ${selected === s.id ? 'bg-muted border-primary' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{s.scenario_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.description || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-1">{format(new Date(s.created_at), 'MMM d, HH:mm')}</div>
                        </div>
                        <Badge variant={s.status === 'simulated' ? 'default' : 'secondary'}>{s.status}</Badge>
                      </div>
                      {s.status === 'simulated' && (
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1">
                            {Number(s.delta_load_hours) < 0 ? <TrendingDown className="w-3 h-3 text-primary" /> : <TrendingUp className="w-3 h-3 text-destructive" />}
                            {Number(s.delta_load_hours).toFixed(1)}h
                          </span>
                          <span>Δ {Number(s.delta_completion_days).toFixed(1)}d</span>
                          {s.delta_bottleneck && <span className="text-muted-foreground">@ {s.delta_bottleneck}</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-3"><CardTitle className="text-base">Work Center Load Comparison</CardTitle></CardHeader>
          <CardContent>
            {!selected ? <div className="py-8 text-center text-sm text-muted-foreground">Select a scenario to view per-work-center deltas.</div>
              : (results?.length ?? 0) === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No simulation data.</div>
              : (
                <Table>
                  <TableHeader><TableRow><TableHead>Work Center</TableHead><TableHead className="text-right">Baseline (h)</TableHead><TableHead className="text-right">Scenario (h)</TableHead><TableHead className="text-right">Δ</TableHead><TableHead className="text-right">Util %</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results!.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.work_center_code || '—'}</TableCell>
                        <TableCell className="text-right">{Number(r.baseline_load_hours).toFixed(1)}</TableCell>
                        <TableCell className="text-right">{Number(r.scenario_load_hours).toFixed(1)}</TableCell>
                        <TableCell className={`text-right ${Number(r.delta_hours) < 0 ? 'text-primary' : 'text-destructive'}`}>{Number(r.delta_hours).toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(r.utilization_pct) > 85 ? 'destructive' : Number(r.utilization_pct) > 60 ? 'secondary' : 'outline'}>
                            {Number(r.utilization_pct).toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
