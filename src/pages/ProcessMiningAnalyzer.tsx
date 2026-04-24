import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { GitBranch, AlertTriangle, Clock, Target, BarChart3, Repeat, CheckCircle2, ArrowRight } from 'lucide-react';

const PROCESSES = ['procure_to_pay', 'order_to_cash', 'issue_to_resolution', 'hire_to_retire', 'project_billing', 'maintenance_cycle'];
const PROCESS_LABELS: Record<string, string> = {
  procure_to_pay: 'Procure to Pay', order_to_cash: 'Order to Cash', issue_to_resolution: 'Issue to Resolution',
  hire_to_retire: 'Hire to Retire', project_billing: 'Project Billing', maintenance_cycle: 'Maintenance Cycle',
};

export default function ProcessMiningAnalyzer() {
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('explorer');
  const [selectedProcess, setSelectedProcess] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['process-mining-events', activeCompanyId, selectedProcess],
    queryFn: async () => {
      let q = supabase.from('process_mining_events' as any).select('*').order('created_at', { ascending: false }).limit(500) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (selectedProcess) q = q.eq('process_name', selectedProcess);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const bottlenecks = events.filter((e: any) => e.is_bottleneck);
  const reworks = events.filter((e: any) => e.is_rework);
  const nonConforming = events.filter((e: any) => e.conformance_status !== 'conforming');
  const variants = [...new Set(events.map((e: any) => e.variant).filter(Boolean))];
  const avgDuration = events.length > 0 ? (events.reduce((s: number, e: any) => s + (e.duration_hours || 0), 0) / events.length).toFixed(1) : '0';

  const processCounts = PROCESSES.map(p => ({
    name: p, label: PROCESS_LABELS[p],
    count: events.filter((e: any) => e.process_name === p).length,
    bottlenecks: events.filter((e: any) => e.process_name === p && e.is_bottleneck).length,
    reworks: events.filter((e: any) => e.process_name === p && e.is_rework).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6" />Process Mining & Bottleneck Analyzer</h1>
          <p className="text-muted-foreground">Analyze real process paths, delays, and rework loops</p>
        </div>
        <Select value={selectedProcess} onValueChange={setSelectedProcess}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Processes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {PROCESSES.map(p => <SelectItem key={p} value={p}>{PROCESS_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Total Events</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{bottlenecks.length}</p><p className="text-xs text-muted-foreground">Bottlenecks</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{reworks.length}</p><p className="text-xs text-muted-foreground">Rework Loops</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{variants.length}</p><p className="text-xs text-muted-foreground">Variants</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{avgDuration}h</p><p className="text-xs text-muted-foreground">Avg Duration</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="explorer">Process Explorer</TabsTrigger>
          <TabsTrigger value="variants">Variant Analysis</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottleneck Heatmap</TabsTrigger>
          <TabsTrigger value="rework">Rework Loops</TabsTrigger>
          <TabsTrigger value="conformance">Conformance Monitor</TabsTrigger>
          <TabsTrigger value="actions">Action Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processCounts.map(p => (
              <Card key={p.name} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedProcess(p.name)}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{p.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{p.count} events</span>
                    {p.bottlenecks > 0 && <Badge variant="destructive">{p.bottlenecks} bottlenecks</Badge>}
                  </div>
                  {p.reworks > 0 && <Badge variant="secondary">{p.reworks} rework loops</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="variants">
          <div className="space-y-3">
            {variants.length > 0 ? variants.map(v => {
              const vEvents = events.filter((e: any) => e.variant === v);
              return (
                <Card key={v}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Variant: {v}</p>
                        <p className="text-sm text-muted-foreground">{vEvents.length} instances</p>
                      </div>
                      <div className="flex gap-2">
                        {vEvents.some((e: any) => e.is_bottleneck) && <Badge variant="destructive">Has Bottleneck</Badge>}
                        {vEvents.some((e: any) => e.is_rework) && <Badge variant="secondary">Has Rework</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {[...new Set(vEvents.map((e: any) => e.step_name))].map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">{step as string}</Badge>
                          {idx < [...new Set(vEvents.map((e: any) => e.step_name))].length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }) : <Card><CardContent className="py-8 text-center text-muted-foreground">No variant data available</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="bottlenecks">
          <div className="space-y-3">
            {bottlenecks.length > 0 ? bottlenecks.map((b: any) => (
              <Card key={b.id} className="border-destructive/30">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.step_name}</p>
                    <p className="text-sm text-muted-foreground">{PROCESS_LABELS[b.process_name] || b.process_name} • {b.actor || 'Unassigned'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{b.duration_hours?.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">{b.department || 'No dept'}</p>
                  </div>
                </CardContent>
              </Card>
            )) : <Card><CardContent className="py-8 text-center text-muted-foreground">No bottlenecks detected</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="rework">
          <div className="space-y-3">
            {reworks.length > 0 ? reworks.map((r: any) => (
              <Card key={r.id} className="border-amber-300/50">
                <CardContent className="py-4 flex items-center gap-3">
                  <Repeat className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium">{r.step_name}</p>
                    <p className="text-sm text-muted-foreground">{PROCESS_LABELS[r.process_name]} • Instance: {r.process_instance_id}</p>
                  </div>
                  <Badge variant="secondary">{r.duration_hours?.toFixed(1)}h rework</Badge>
                </CardContent>
              </Card>
            )) : <Card><CardContent className="py-8 text-center text-muted-foreground">No rework loops detected</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="conformance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card><CardContent className="pt-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{events.filter((e: any) => e.conformance_status === 'conforming').length}</p>
              <p className="text-xs text-muted-foreground">Conforming</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{events.filter((e: any) => e.conformance_status === 'deviation').length}</p>
              <p className="text-xs text-muted-foreground">Deviations</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-2xl font-bold">{events.filter((e: any) => e.conformance_status === 'violation').length}</p>
              <p className="text-xs text-muted-foreground">Violations</p>
            </CardContent></Card>
          </div>
          <div className="space-y-2">
            {nonConforming.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.step_name}</p>
                    <p className="text-sm text-muted-foreground">{PROCESS_LABELS[e.process_name]}</p>
                  </div>
                  <Badge variant={e.conformance_status === 'violation' ? 'destructive' : 'secondary'}>{e.conformance_status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="space-y-4">
            {bottlenecks.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base text-destructive">Bottleneck Reduction</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {bottlenecks.slice(0, 5).map((b: any) => (
                      <li key={b.id} className="flex items-start gap-2">
                        <Target className="h-4 w-4 mt-0.5 text-destructive" />
                        <span>Reduce duration at <strong>{b.step_name}</strong> ({b.duration_hours?.toFixed(1)}h) in {PROCESS_LABELS[b.process_name]}. Assign to {b.actor || 'owner'}.</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {reworks.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base text-amber-600">Rework Elimination</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {reworks.slice(0, 5).map((r: any) => (
                      <li key={r.id} className="flex items-start gap-2">
                        <Repeat className="h-4 w-4 mt-0.5 text-amber-600" />
                        <span>Investigate rework at <strong>{r.step_name}</strong> in {PROCESS_LABELS[r.process_name]}. Root cause analysis needed.</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {bottlenecks.length === 0 && reworks.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No actionable recommendations — processes are running smoothly</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
