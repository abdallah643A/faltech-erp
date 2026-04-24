import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNextBestActions, useCompleteNBA, useGenerateNBA } from "@/hooks/useCRMLeads";
import { Sparkles, CheckCircle2, X, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CRMNextBestActions() {
  const { data: actions = [], isLoading } = useNextBestActions();
  const complete = useCompleteNBA();
  const generate = useGenerateNBA();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Next Best Actions</h1>
          <p className="text-sm text-muted-foreground">AI-recommended next steps across leads & opportunities (on-demand + nightly).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
          actions.length === 0 ? <p className="text-sm text-muted-foreground col-span-full">No open recommendations. Generate them from a specific lead or opportunity.</p> :
          actions.map((a: any) => (
            <Card key={a.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="outline" className="mb-1">{a.entity_type} · {a.action_type}</Badge>
                  <div className="font-medium">{a.title}</div>
                </div>
                <Badge variant={a.priority === "urgent" || a.priority === "high" ? "destructive" : "secondary"}>{a.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{a.rationale}</p>
              {a.due_at && (
                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> Due {formatDistanceToNow(new Date(a.due_at), { addSuffix: true })}
                </div>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => complete.mutate({ id: a.id, status: "done" })}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                </Button>
                <Button size="sm" variant="ghost" onClick={() => complete.mutate({ id: a.id, status: "dismissed" })}>
                  <X className="h-3 w-3 mr-1" /> Dismiss
                </Button>
              </div>
            </CardContent></Card>
          ))
        }
      </div>
    </div>
  );
}
