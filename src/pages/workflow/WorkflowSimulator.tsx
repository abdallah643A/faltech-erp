import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRunWorkflowSimulation, useWorkflowSimulationRuns } from "@/hooks/useWorkflowSimulation";
import { Play, History } from "lucide-react";

const SAMPLE = {
  workflow_key: "expense_approval",
  scenario_name: "High-value expense",
  steps: [
    { id: "s1", type: "condition", name: "Amount > 1000?", config: { expression: "${amount} > 1000" }, branches: [{ when: "true", next: "s2" }, { when: "false", next: "s3" }] },
    { id: "s2", type: "approval", name: "Manager approval", config: { approver: "manager" }, next: "s4" },
    { id: "s3", type: "action", name: "Auto-approve", config: { action: "auto_approve" }, next: "s4" },
    { id: "s4", type: "notify", name: "Notify requester", config: { channel: "email", template: "expense_decision" }, next: null },
  ],
  input: { amount: 1500 },
};

export default function WorkflowSimulator() {
  const [json, setJson] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState<any>(null);
  const run = useRunWorkflowSimulation();
  const { data: history = [] } = useWorkflowSimulationRuns();

  const handleRun = async () => {
    try {
      const body = JSON.parse(json);
      const r = await run.mutateAsync(body);
      setResult(r);
    } catch (e: any) {
      setResult({ error: e.message });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Workflow Simulator</h1>
        <p className="text-sm text-muted-foreground">Dry-run workflows with mock input before publishing.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="h-4 w-4" /> Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Workflow definition (JSON)</Label>
            <Textarea rows={20} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-xs" />
            <Button onClick={handleRun} disabled={run.isPending}>
              {run.isPending ? "Running..." : "Run simulation"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-muted-foreground">No result yet</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={result.status === "success" ? "default" : "destructive"}>{result.status}</Badge>
                  <span className="text-xs text-muted-foreground">{result.steps_executed} step(s)</span>
                </div>
                <div className="space-y-1">
                  {(result.trace ?? []).map((t: any, i: number) => (
                    <div key={i} className="text-xs border rounded px-2 py-1">
                      <span className="font-mono text-primary">{t.step_id}</span> · {t.type}
                      {t.name && <span className="text-muted-foreground"> — {t.name}</span>}
                      {t.expression && <div className="text-muted-foreground">expr: {t.expression} → {String(t.result)}</div>}
                      {t.error && <div className="text-destructive">error: {t.error}</div>}
                    </div>
                  ))}
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Output payload</summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">{JSON.stringify(result.output, null, 2)}</pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">When</th>
                <th className="text-left px-4 py-2 font-medium">Workflow</th>
                <th className="text-left px-4 py-2 font-medium">Scenario</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Steps</th>
                <th className="text-left px-4 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No runs yet</td></tr>
              ) : history.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.workflow_key}</td>
                  <td className="px-4 py-2 text-xs">{r.scenario_name || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={r.status === 'success' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.steps_executed}/{r.steps_total}</td>
                  <td className="px-4 py-2 text-xs">{r.duration_ms ? `${r.duration_ms}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
