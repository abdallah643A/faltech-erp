import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Users, Plus } from "lucide-react";
import { useRequisitions, useCandidates, useMoveCandidateStage } from "@/hooks/useHRLifecycle";

const STAGES = ["applied", "screening", "interview", "offer", "hired"];

export default function HRRecruitmentPage() {
  const { data: reqs = [] } = useRequisitions();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: candidates = [] } = useCandidates(selected ?? undefined);
  const move = useMoveCandidateStage();

  return (
    <div className="page-enter p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Recruitment
        </h1>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Requisition</Button>
      </div>

      <Tabs defaultValue="reqs">
        <TabsList>
          <TabsTrigger value="reqs">Requisitions ({reqs.length})</TabsTrigger>
          <TabsTrigger value="pipeline">Candidate Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="reqs" className="space-y-2 mt-3">
          {reqs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No requisitions yet</CardContent></Card>
          ) : reqs.map((r: any) => (
            <Card key={r.id} className={`cursor-pointer ${selected === r.id ? 'border-primary' : ''}`} onClick={() => setSelected(r.id)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{r.job_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.requisition_number} · {r.number_of_openings} opening(s) · {r.location ?? "—"}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {selected ? `Showing pipeline for selected requisition` : "Select a requisition to filter, or showing all candidates"}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {STAGES.map((stage) => (
              <Card key={stage}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase">{stage}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {candidates.filter((c: any) => c.current_stage === stage).map((cand: any) => (
                    <div key={cand.id} className="border rounded p-2 text-xs">
                      <p className="font-medium">{cand.full_name}</p>
                      <p className="text-muted-foreground">{cand.email}</p>
                      <div className="flex gap-1 mt-1">
                        {STAGES.indexOf(stage) < STAGES.length - 1 && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={() => move.mutate({ id: cand.id, stage: STAGES[STAGES.indexOf(stage) + 1] })}>
                            → {STAGES[STAGES.indexOf(stage) + 1]}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
