import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useDesignerVersions, useSaveDesignerVersion,
} from "@/hooks/useGovernanceSuite";
import { useRunWorkflowSimulation } from "@/hooks/useWorkflowSimulation";
import { Save, Play, History, Layout, Wand2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE = {
  start: "step1",
  steps: [
    { id: "step1", type: "condition", name: "Amount > 10000", branches: [{ when: "true", next: "step2" }, { when: "false", next: "step3" }] },
    { id: "step2", type: "approval", name: "CFO approval", config: { sla_hours: 48 }, next: "step4" },
    { id: "step3", type: "approval", name: "Manager approval", config: { sla_hours: 24 }, next: "step4" },
    { id: "step4", type: "notify", name: "Notify requester", next: null },
  ],
};

export default function WorkflowDesignerPage() {
  const [workflowKey, setWorkflowKey] = useState("invoice_approval");
  const [definition, setDefinition] = useState(JSON.stringify(SAMPLE, null, 2));
  const [changeSummary, setChangeSummary] = useState("");
  const { data: versions = [] } = useDesignerVersions(workflowKey);
  const save = useSaveDesignerVersion();
  const simulate = useRunWorkflowSimulation();

  const [simInput, setSimInput] = useState('{"amount": 25000}');
  const [simOutput, setSimOutput] = useState<any>(null);

  const doSave = async (publish: boolean) => {
    try {
      const def = JSON.parse(definition);
      await save.mutateAsync({
        workflow_key: workflowKey,
        definition: def,
        change_summary: changeSummary,
        publish,
      });
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };

  const doSimulate = async () => {
    try {
      const def = JSON.parse(definition);
      const input = JSON.parse(simInput);
      const result = await simulate.mutateAsync({
        workflow_key: workflowKey,
        scenario_name: "Designer simulation",
        steps: def.steps,
        input,
        start_step_id: def.start,
      });
      setSimOutput(result);
    } catch (e: any) {
      toast.error(`Simulation failed: ${e.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layout /> Low-Code Workflow Designer</h1>
          <p className="text-sm text-muted-foreground">Design, simulate, version, and publish workflows.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => doSave(false)} disabled={save.isPending}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={() => doSave(true)} disabled={save.isPending}>
            <Wand2 className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Workflow key</label>
            <Input value={workflowKey} onChange={(e) => setWorkflowKey(e.target.value)} />
          </div>
          <div>
            <label className="text-xs">Change summary</label>
            <Input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="What did you change?" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="designer">
        <TabsList>
          <TabsTrigger value="designer">Designer</TabsTrigger>
          <TabsTrigger value="simulate"><Play className="w-3 h-3 mr-1" /> Simulate</TabsTrigger>
          <TabsTrigger value="history"><History className="w-3 h-3 mr-1" /> Change history</TabsTrigger>
        </TabsList>

        <TabsContent value="designer">
          <Card>
            <CardHeader><CardTitle>Definition (JSON)</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                className="font-mono text-xs min-h-[420px]"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate">
          <Card>
            <CardHeader>
              <CardTitle>Run simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs">Input payload (JSON)</label>
                <Textarea className="font-mono text-xs min-h-[120px]" value={simInput} onChange={(e) => setSimInput(e.target.value)} />
              </div>
              <Button onClick={doSimulate} disabled={simulate.isPending}>
                <Play className="w-4 h-4 mr-2" /> Run simulation
              </Button>
              {simOutput && (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">{JSON.stringify(simOutput, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Versions of {workflowKey}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>v#</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No versions yet</TableCell></TableRow>
                  )}
                  {versions.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">{v.version_number}</TableCell>
                      <TableCell>{v.version_label}</TableCell>
                      <TableCell><Badge variant={v.status === "published" ? "default" : "secondary"}>{v.status}</Badge></TableCell>
                      <TableCell className="text-xs">{v.change_summary ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.created_by_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(v.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
