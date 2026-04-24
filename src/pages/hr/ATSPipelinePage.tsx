import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users2 } from 'lucide-react';
import { useATSStages, useATSCandidateScores } from '@/hooks/useHREnhanced';

export default function ATSPipelinePage() {
  const { data: stages = [] } = useATSStages();
  const { data: scores = [] } = useATSCandidateScores();
  const activeStages = stages.filter((s: any) => !s.is_terminal);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users2 className="h-6 w-6 text-primary" />ATS Pipeline</h1>
        <p className="text-muted-foreground">Applicant Tracking System — high-volume candidate funnel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {activeStages.map((s: any) => {
          const stageScores = scores.filter((sc: any) => sc.recommendation === s.stage_code);
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase">{s.stage_name}</CardTitle>
                <p className="text-[10px] text-muted-foreground" dir="rtl">{s.stage_name_ar}</p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stageScores.length}</div>
                {s.sla_hours && <Badge variant="outline" className="text-[10px] mt-1">SLA {s.sla_hours}h</Badge>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Stages Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border rounded p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">{s.stage_order}</div>
                  <div>
                    <div className="font-medium">{s.stage_name}</div>
                    <div className="text-xs text-muted-foreground" dir="rtl">{s.stage_name_ar}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={s.stage_type === 'success' ? 'default' : s.stage_type === 'rejection' ? 'destructive' : 'outline'}>{s.stage_type}</Badge>
                  {s.is_terminal && <Badge variant="secondary">Terminal</Badge>}
                  {s.sla_hours && <Badge variant="outline">SLA {s.sla_hours}h</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
