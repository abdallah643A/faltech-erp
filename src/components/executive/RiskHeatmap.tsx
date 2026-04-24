import { Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldAlert } from 'lucide-react';

interface Props { isAr?: boolean }

/**
 * RiskHeatmap — PR2
 * Renders a 5×5 likelihood × impact matrix from `risk_register`.
 * Cell color uses risk score thresholds; hover lists risks in the cell.
 */
export function RiskHeatmap({ isAr = false }: Props) {
  const { activeCompanyId } = useActiveCompany();

  const { data: risks = [] } = useQuery({
    queryKey: ['risk-heatmap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('risk_register' as any).select('*').eq('status', 'open');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const matrix = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const r of risks) {
      const key = `${r.likelihood}-${r.impact}`;
      m[key] = m[key] || [];
      m[key].push(r);
    }
    return m;
  }, [risks]);

  const cellColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact;
    if (score >= 16) return 'bg-red-500/30 hover:bg-red-500/40 border-red-500/50';
    if (score >= 9) return 'bg-orange-500/30 hover:bg-orange-500/40 border-orange-500/50';
    if (score >= 4) return 'bg-amber-400/30 hover:bg-amber-400/40 border-amber-400/50';
    return 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40';
  };

  const labels = isAr
    ? { likelihood: 'الاحتمالية', impact: 'التأثير', l: ['نادر', 'منخفض', 'متوسط', 'مرتفع', 'مؤكد'], i: ['ضئيل', 'بسيط', 'متوسط', 'كبير', 'كارثي'] }
    : { likelihood: 'Likelihood', impact: 'Impact', l: ['Rare', 'Low', 'Med', 'High', 'Certain'], i: ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'] };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />{isAr ? 'خريطة المخاطر المؤسسية' : 'Enterprise Risk Heatmap'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مخاطر مفتوحة.' : 'No open risks registered.'}</p>
        ) : (
          <TooltipProvider>
            <div className="flex gap-2">
              <div className="flex flex-col justify-around text-[10px] text-muted-foreground -rotate-90 self-center w-6">
                <span className="whitespace-nowrap">{labels.likelihood} →</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-6 gap-1">
                  <div></div>
                  {labels.i.map((il, i) => (
                    <div key={i} className="text-[10px] text-center text-muted-foreground">{il}</div>
                  ))}
                  {[5, 4, 3, 2, 1].map((l) => (
                    <Fragment key={`row-${l}`}>
                      <div className="text-[10px] text-right text-muted-foreground self-center">{labels.l[l - 1]}</div>
                      {[1, 2, 3, 4, 5].map((i) => {
                        const cellRisks = matrix[`${l}-${i}`] || [];
                        return (
                          <Tooltip key={`${l}-${i}`}>
                            <TooltipTrigger asChild>
                              <button type="button" className={`aspect-square w-full border rounded flex items-center justify-center cursor-pointer transition-colors ${cellColor(l, i)}`}>
                                <span className="text-sm font-bold">{cellRisks.length || ''}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {cellRisks.length > 0 ? (
                                <div className="space-y-1 max-w-xs">
                                  {cellRisks.slice(0, 6).map((r) => (
                                    <div key={r.id} className="text-xs">
                                      <span className="font-medium">{r.risk_code}</span> — {isAr && r.risk_title_ar ? r.risk_title_ar : r.risk_title}
                                    </div>
                                  ))}
                                  {cellRisks.length > 6 && <div className="text-[10px] text-muted-foreground">+{cellRisks.length - 6} more</div>}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">{isAr ? 'لا توجد مخاطر' : 'No risks'}</span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
                <div className="text-[10px] text-center text-muted-foreground mt-1">{labels.impact} →</div>
              </div>
            </div>
            <div className="flex gap-3 mt-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" /> {isAr ? 'منخفض' : 'Low'}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400/30 border border-amber-400/50" /> {isAr ? 'متوسط' : 'Medium'}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50" /> {isAr ? 'مرتفع' : 'High'}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" /> {isAr ? 'حرج' : 'Critical'}</span>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
