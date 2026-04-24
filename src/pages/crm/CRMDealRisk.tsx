import { useState } from "react";
import { useDealRiskSignals, useComputeDealRisk } from "@/hooks/useCRMLifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

const severityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CRMDealRisk() {
  const [oppId, setOppId] = useState("");
  const { data: signals, isLoading } = useDealRiskSignals(oppId);
  const compute = useComputeDealRisk();

  const totalScore = signals?.reduce((sum, s) => sum + Number(s.weight), 0) ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deal Risk Indicators</h1>
        <p className="text-muted-foreground mt-1">Detect stalled, overdue, low-confidence, and unassigned opportunities.</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-2">
          <Search className="h-5 w-5 text-muted-foreground self-center" />
          <Input
            placeholder="Paste Opportunity ID…"
            value={oppId}
            onChange={(e) => setOppId(e.target.value.trim())}
          />
          <Button onClick={() => oppId && compute.mutate(oppId)} disabled={!oppId || compute.isPending}>
            {compute.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recompute
          </Button>
        </CardContent>
      </Card>

      {oppId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Risk Signals</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total risk:</span>
                <Badge variant={totalScore > 50 ? "destructive" : totalScore > 25 ? "secondary" : "outline"} className="text-base">
                  {Math.min(100, totalScore)}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : !signals || signals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active risk signals. Click Recompute to analyze.</p>
            ) : (
              <div className="space-y-3">
                {signals.map((s) => (
                  <div key={s.id} className={`border rounded-lg p-4 ${severityColors[s.severity]}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-medium">{s.signal_label}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="capitalize">{s.severity}</Badge>
                            <Badge variant="outline">+{s.weight} pts</Badge>
                          </div>
                        </div>
                        {s.signal_description && <p className="text-sm mt-1 opacity-90">{s.signal_description}</p>}
                        <p className="text-xs mt-2 opacity-70">Detected {format(new Date(s.detected_at), "PPp")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
