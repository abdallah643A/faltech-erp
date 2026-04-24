import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * CrossCompanyKPIDrilldown
 * --------------------------------
 * Shows the latest KPI snapshot per company across the tenant, allowing
 * executives to compare metrics like Revenue, Active Projects, Pending
 * Approvals across all companies in one consolidated grid.
 */
export function CrossCompanyKPIDrilldown() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['exec-cross-company-kpis'],
    queryFn: async () => {
      const { data: companies } = await supabase
        .from('sap_companies').select('id, company_name').eq('is_active', true);
      const { data: snapshots } = await (supabase.from('exec_kpi_snapshots' as any) as any)
        .select('*').order('period_end', { ascending: false }).limit(500);

      const byCompany = new Map<string, any[]>();
      for (const s of (snapshots ?? [])) {
        if (!byCompany.has(s.company_id)) byCompany.set(s.company_id, []);
        byCompany.get(s.company_id)!.push(s);
      }

      return (companies ?? []).map(c => ({
        company: c,
        kpis: (byCompany.get(c.id) ?? []).slice(0, 4),
      }));
    },
  });

  const trendIcon = (v: number) =>
    v > 0 ? <TrendingUp className="h-3 w-3 text-success" /> :
    v < 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> :
    <Minus className="h-3 w-3 text-muted-foreground" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cross-Company KPI Drilldown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((row: any) => (
            <Card key={row.company.id} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{row.company.company_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {row.kpis.length === 0 && <p className="text-xs text-muted-foreground">No snapshots yet.</p>}
                {row.kpis.map((k: any) => (
                  <div key={k.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{k.kpi_label}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{Number(k.value ?? 0).toLocaleString()}{k.unit ?? ''}</span>
                      <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                        {trendIcon(Number(k.variance_pct ?? 0))}
                        {Number(k.variance_pct ?? 0).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No companies configured.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
