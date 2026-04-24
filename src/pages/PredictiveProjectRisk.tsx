import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, TrendingDown, CheckCircle, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PredictiveProjectRisk() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: scores = [] } = useQuery({
    queryKey: ['pred-project-risk', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('predictive_project_risk_scores' as any).select('*').order('overall_risk_score', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const riskColor = (l: string) => l === 'high' ? 'destructive' : l === 'medium' ? 'default' : 'secondary';
  const barColor = (v: number) => v > 70 ? 'bg-red-500' : v > 40 ? 'bg-orange-400' : 'bg-green-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Project Risk Scoring</h1>
        <p className="text-muted-foreground">Predictive risk analysis across schedule, cost, material, and quality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'High Risk', value: scores.filter((s: any) => s.risk_level === 'high').length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Medium Risk', value: scores.filter((s: any) => s.risk_level === 'medium').length, icon: TrendingDown, color: 'text-orange-600' },
          { label: 'Low Risk', value: scores.filter((s: any) => s.risk_level === 'low').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Projects Scored', value: scores.length, icon: BarChart3, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.color}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-3">
        {scores.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.project_name || 'Project'}</span>
                  <Badge variant={riskColor(s.risk_level)}>{s.risk_level} risk</Badge>
                  <span className="text-sm font-bold text-primary">{Math.round(s.overall_risk_score || 0)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[{ label: 'Schedule', value: s.schedule_risk },
                  { label: 'Cost', value: s.cost_risk },
                  { label: 'Material', value: s.material_risk },
                  { label: 'Manpower', value: s.manpower_risk },
                  { label: 'Quality', value: s.quality_risk },
                  { label: 'Variation', value: s.variation_risk },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-muted-foreground mb-1">{f.label}</div>
                    <Progress value={f.value || 0} className="h-2" />
                    <div className="text-xs font-bold mt-0.5">{Math.round(f.value || 0)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {scores.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No project risk scores generated yet. The system will analyze active projects automatically.</CardContent></Card>}
      </div>
    </div>
  );
}
