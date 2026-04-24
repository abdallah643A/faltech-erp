import { useState } from 'react';
import { useScenarios, useCreateScenario, useScenarioAdjustments, useAddAdjustment, useApplyScenario } from '@/hooks/usePMOAdvanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Play, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const verdictColor = (v: string) =>
  v === 'overcommitted' ? 'destructive' : v === 'tight' ? 'secondary' : v === 'undercommitted' ? 'outline' : 'default';

export default function ScenarioPlanningPage() {
  const { data: scenarios } = useScenarios();
  const createScenario = useCreateScenario();
  const apply = useApplyScenario();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data: adjustments } = useScenarioAdjustments(selectedId);
  const addAdj = useAddAdjustment();

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adjType, setAdjType] = useState('add_demand');
  const [adjValue, setAdjValue] = useState('40');
  const [adjNotes, setAdjNotes] = useState('');
  const [open, setOpen] = useState(false);

  const selected = (scenarios || []).find((s: any) => s.id === selectedId);
  const results = selected?.results || {};

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Scenario Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">Model what-if changes to demand or capacity across the portfolio.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Scenario</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Scenario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Q3 ramp-up" /></div>
              <div><Label>Description</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} /></div>
              <Button className="w-full" disabled={!newName || createScenario.isPending} onClick={async () => {
                await createScenario.mutateAsync({ scenario_name: newName, description: newDesc });
                setNewName(''); setNewDesc(''); setOpen(false);
              }}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Scenarios</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(scenarios || []).length === 0 && <p className="text-sm text-muted-foreground">No scenarios yet.</p>}
            {(scenarios || []).map((s: any) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedId === s.id ? 'border-primary bg-accent' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{s.scenario_name}</p>
                  <Badge variant="outline" className="text-xs">{s.status}</Badge>
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          {!selected ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />Select a scenario to model adjustments.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-base">{selected.scenario_name}</CardTitle>
                  <Button size="sm" onClick={() => apply.mutate(selected.id)} disabled={apply.isPending}>
                    {apply.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                    Run Scenario
                  </Button>
                </CardHeader>
                <CardContent>
                  {Object.keys(results).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Run scenario to see projected impact.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Baseline Util</p><p className="text-xl font-bold">{Number(results.baseline_utilization || 0).toFixed(1)}%</p></div>
                      <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Projected Util</p><p className="text-xl font-bold text-primary">{Number(results.projected_utilization || 0).toFixed(1)}%</p></div>
                      <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Demand Δ</p><p className="text-xl font-bold">{Number(results.demand_delta || 0) > 0 ? '+' : ''}{Number(results.demand_delta || 0).toFixed(0)}h</p></div>
                      <div className="p-3 rounded-lg bg-muted/30"><p className="text-xs text-muted-foreground">Verdict</p><Badge variant={verdictColor(results.verdict) as any} className="mt-1">{results.verdict}</Badge></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Adjustments</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Select value={adjType} onValueChange={setAdjType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add_demand">Add demand (h)</SelectItem>
                        <SelectItem value="reduce_demand">Reduce demand (h)</SelectItem>
                        <SelectItem value="shift_pct">Shift demand %</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" value={adjValue} onChange={(e) => setAdjValue(e.target.value)} placeholder="Value" />
                    <Input value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Notes (optional)" className="md:col-span-1" />
                    <Button onClick={() => addAdj.mutate({ scenario_id: selected.id, adjustment_type: adjType, adjustment_value: Number(adjValue), notes: adjNotes })} disabled={addAdj.isPending}>
                      <Plus className="w-4 h-4 mr-1" />Add
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {(adjustments || []).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                        <span><Badge variant="outline" className="mr-2">{a.adjustment_type}</Badge>{a.adjustment_value}{a.notes ? ` — ${a.notes}` : ''}</span>
                      </div>
                    ))}
                    {(adjustments || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No adjustments yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
