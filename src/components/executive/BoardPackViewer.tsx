import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  packId: string | null;
  onClose: () => void;
  isAr?: boolean;
}

/**
 * BoardPackViewer — PR3
 * Renders a generated board pack payload (KPIs, risks, decisions, goals,
 * AI narrative). Provides a "Print / Save as PDF" button using window.print.
 */
export function BoardPackViewer({ packId, onClose, isAr = false }: Props) {
  const { data: pack, isLoading } = useQuery({
    queryKey: ['board-pack', packId],
    enabled: !!packId,
    queryFn: async () => {
      const { data, error } = await supabase.from('exec_board_packs' as any).select('*').eq('id', packId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const payload = pack?.payload ?? null;
  const narrative = payload?.narrative ?? null;

  const fmt = useMemo(() => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }), []);

  return (
    <Dialog open={!!packId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />{pack?.title ?? (isAr ? 'حزمة مجلس الإدارة' : 'Board Pack')}
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3 w-3 mr-1" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جارِ التحميل...' : 'Loading...'}</p>
        ) : !payload ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد بيانات في هذه الحزمة.' : 'No payload stored for this pack.'}</p>
        ) : (
          <div className="space-y-6 print:space-y-3" id="board-pack-print">
            <div className="text-center pb-3 border-b">
              <h1 className="text-2xl font-bold">{pack.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(payload.period_start), 'dd MMM yyyy')} → {format(new Date(payload.period_end), 'dd MMM yyyy')}
              </p>
            </div>

            {narrative && (
              <section>
                <h2 className="text-base font-semibold flex items-center gap-1 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />{isAr ? 'الملخص التنفيذي' : 'Executive Summary'}
                </h2>
                <p className="text-sm leading-relaxed">{narrative.executive_summary}</p>
                {narrative.highlights?.length > 0 && (
                  <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
                    {narrative.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                )}
              </section>
            )}

            {payload.data.executive_kpis?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-2">{isAr ? 'مؤشرات الأداء الرئيسية' : 'Key Performance Indicators'}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {payload.data.executive_kpis.slice(0, 12).map((k: any) => (
                    <div key={k.id} className="p-2 border rounded">
                      <div className="text-[10px] uppercase text-muted-foreground">{k.kpi_name}</div>
                      <div className="text-base font-bold">{fmt.format(Number(k.actual_value || 0))}{k.unit ? ` ${k.unit}` : ''}</div>
                      <div className="text-[10px] text-muted-foreground">vs {fmt.format(Number(k.target_value || 0))}</div>
                      {k.status && <Badge variant={k.status === 'on_track' ? 'default' : k.status === 'at_risk' ? 'secondary' : 'destructive'} className="mt-1 text-[10px]">{k.status}</Badge>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {payload.data.risk_register?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-2">{isAr ? 'سجل المخاطر' : 'Top Risks'}</h2>
                {narrative?.risks_summary && <p className="text-xs text-muted-foreground mb-2">{narrative.risks_summary}</p>}
                <div className="space-y-1">
                  {payload.data.risk_register.slice(0, 8).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div>
                        <div className="font-medium">{r.risk_code} — {r.risk_title}</div>
                        <div className="text-[10px] text-muted-foreground">{r.owner_name}{r.mitigation_plan ? ` • ${r.mitigation_plan}` : ''}</div>
                      </div>
                      <Badge variant={r.risk_score >= 16 ? 'destructive' : r.risk_score >= 9 ? 'secondary' : 'outline'}>
                        L{r.likelihood}×I{r.impact} = {r.risk_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {payload.data.decisions?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-2">{isAr ? 'القرارات' : 'Management Decisions'}</h2>
                <div className="space-y-1">
                  {payload.data.decisions.slice(0, 10).map((d: any) => (
                    <div key={d.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{d.title}</span>
                        <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                      </div>
                      {d.description && <div className="text-xs text-muted-foreground mt-1">{d.description}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {payload.data.goals?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-2">{isAr ? 'الأهداف الاستراتيجية' : 'Strategic Goals'}</h2>
                <div className="space-y-1">
                  {payload.data.goals.slice(0, 10).map((g: any) => {
                    const pct = g.target_value ? Math.round((Number(g.current_value ?? 0) / Number(g.target_value)) * 100) : 0;
                    return (
                      <div key={g.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{g.title}</span>
                          <span className="text-xs">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded mt-1 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {narrative?.outlook && (
              <section>
                <h2 className="text-base font-semibold mb-2">{isAr ? 'التوقعات' : 'Outlook'}</h2>
                <p className="text-sm leading-relaxed">{narrative.outlook}</p>
              </section>
            )}

            <div className="text-[10px] text-muted-foreground text-center pt-3 border-t">
              {isAr ? 'تم إنشاؤه بواسطة' : 'Generated by'} Executive Reporting Hub • {pack.generated_at && format(new Date(pack.generated_at), 'dd MMM yyyy HH:mm')}
              {narrative && ` • AI: google/gemini-2.5-flash`}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
