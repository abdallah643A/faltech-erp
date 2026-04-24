import { useState } from 'react';
import { useProjectsList, useHealthSnapshots } from '@/hooks/usePMO';
import { useNarratives, useSaveNarrative } from '@/hooks/usePMOAdvanced';
import { useIndustryAI } from '@/hooks/useIndustryAI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function HealthNarrativesPage() {
  const { data: projects } = useProjectsList();
  const [projectId, setProjectId] = useState<string | undefined>();
  const { data: snapshots } = useHealthSnapshots(projectId);
  const { data: narratives } = useNarratives(projectId);
  const save = useSaveNarrative();
  const { analyze, isLoading, result, reset } = useIndustryAI();

  const latestSnap = (snapshots || [])[0];
  const project = projects?.find((p: any) => p.id === projectId);

  const generate = async () => {
    if (!latestSnap || !project) return;
    reset();
    await analyze('project_health_narrative', {
      project_name: project.project_name,
      health_status: latestSnap.health_status,
      overall_score: latestSnap.overall_score,
      schedule_score: latestSnap.schedule_score,
      budget_score: latestSnap.budget_score,
      risk_score: latestSnap.risk_score,
      computed_at: latestSnap.computed_at,
      instruction: 'Provide a concise executive narrative (3-4 sentences) explaining the health status, the main drivers, and 3 specific recommendations as a JSON-like list at the end.',
    });
  };

  const persist = async () => {
    if (!result || !projectId) return;
    await save.mutateAsync({
      project_id: projectId,
      narrative: result,
      health_status: latestSnap?.health_status,
      overall_score: latestSnap?.overall_score,
      model_used: 'lovable-ai-gateway',
    });
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Health Narratives</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate executive-friendly explanations from project health scores.</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Project</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {(projects || []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={!latestSnap || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Generate Narrative
          </Button>
          {!latestSnap && projectId && <p className="text-xs text-muted-foreground">No health snapshot for this project yet.</p>}
        </CardContent>
      </Card>

      {(isLoading || result) && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Draft</CardTitle>
            {result && !isLoading && (
              <Button size="sm" variant="outline" onClick={persist} disabled={save.isPending}>
                <Save className="w-4 h-4 mr-1" />Save
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{result || 'Analyzing...'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(narratives || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No saved narratives yet.</p>
          ) : (
            (narratives || []).map((n: any) => (
              <div key={n.id} className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{format(new Date(n.generated_at), 'MMM d, yyyy HH:mm')}</span>
                  <span className="text-xs">Score: <strong>{Number(n.overall_score || 0).toFixed(1)}</strong></span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.narrative}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
