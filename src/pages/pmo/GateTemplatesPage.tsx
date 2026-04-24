import { useGateTemplates } from '@/hooks/usePMOEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, ShieldCheck, FileCheck } from 'lucide-react';

const methodologyColor: Record<string, string> = {
  PMI: 'bg-blue-500/10 text-blue-700',
  PRINCE2: 'bg-purple-500/10 text-purple-700',
  Agile: 'bg-emerald-500/10 text-emerald-700',
  Hybrid: 'bg-amber-500/10 text-amber-700',
  Custom: 'bg-muted text-muted-foreground',
};

export default function GateTemplatesPage() {
  const { list } = useGateTemplates();
  const templates = list.data ?? [];

  return (
    <div className="p-4 space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-primary" /> Stage-Gate Governance Templates</h1>
        <p className="text-sm text-muted-foreground">Reusable PMI / PRINCE2 / Agile gate flows with required artifacts and approval roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((t: any) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t.template_name}
                </CardTitle>
                <div className="flex gap-1">
                  <Badge className={methodologyColor[t.methodology]}>{t.methodology}</Badge>
                  {t.is_default && <Badge variant="outline">Default</Badge>}
                </div>
              </div>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Gates</div>
                {(t.gates ?? []).map((g: any, i: number) => (
                  <div key={i} className="border rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{g.order}. {g.name}</span>
                      <Badge variant="outline" className="text-[10px]">{g.approval_role}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(g.checklist ?? []).map((item: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] font-normal">{item}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {(t.required_artifacts ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><FileCheck className="h-3 w-3" /> Required Artifacts</div>
                  <div className="flex flex-wrap gap-1">
                    {t.required_artifacts.map((a: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No templates configured.</p>}
      </div>
    </div>
  );
}
