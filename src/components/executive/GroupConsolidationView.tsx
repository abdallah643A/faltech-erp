import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props { isAr?: boolean }

/**
 * GroupConsolidationView — PR2
 * Aggregates executive_kpis by company for a group-level snapshot.
 * Shows revenue, EBITDA, project count, headcount per entity (when KPIs are tagged).
 */
export function GroupConsolidationView({ isAr = false }: Props) {
  const { data: companies = [] } = useQuery({
    queryKey: ['group-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sap_companies').select('id, company_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['group-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('executive_kpis' as any).select('*');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rows = useMemo(() => {
    return companies.map((c: any) => {
      const ck = kpis.filter((k) => k.company_id === c.id);
      const revenue = ck.filter((k) => /revenue/i.test(k.kpi_code || k.kpi_name)).reduce((s, k) => s + Number(k.actual_value || 0), 0);
      const target = ck.filter((k) => /revenue/i.test(k.kpi_code || k.kpi_name)).reduce((s, k) => s + Number(k.target_value || 0), 0);
      const ebitda = ck.filter((k) => /ebitda|profit/i.test(k.kpi_code || k.kpi_name)).reduce((s, k) => s + Number(k.actual_value || 0), 0);
      const onTrack = ck.filter((k) => k.status === 'on_track').length;
      const atRisk = ck.filter((k) => k.status === 'at_risk').length;
      const offTrack = ck.filter((k) => k.status === 'off_track').length;
      const variance = target ? ((revenue - target) / target) * 100 : 0;
      return { id: c.id, name: c.company_name, revenue, target, ebitda, variance, onTrack, atRisk, offTrack, total: ck.length };
    });
  }, [companies, kpis]);

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    target: rows.reduce((s, r) => s + r.target, 0),
    ebitda: rows.reduce((s, r) => s + r.ebitda, 0),
  }), [rows]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />{isAr ? 'العرض الموحد للمجموعة' : 'Group Consolidation View'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isAr ? 'الشركة' : 'Company'}</TableHead>
              <TableHead className="text-right">{isAr ? 'الإيرادات' : 'Revenue'}</TableHead>
              <TableHead className="text-right">{isAr ? 'الهدف' : 'Target'}</TableHead>
              <TableHead className="text-right">{isAr ? 'الانحراف' : 'Variance'}</TableHead>
              <TableHead className="text-right">EBITDA</TableHead>
              <TableHead className="text-center">{isAr ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(r.target)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.variance >= 0 ? 'default' : 'destructive'}>
                    {r.variance >= 0 ? '+' : ''}{r.variance.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{fmt(r.ebitda)}</TableCell>
                <TableCell className="text-center text-xs">
                  <span className="text-success">●{r.onTrack}</span>{' '}
                  <span className="text-warning">●{r.atRisk}</span>{' '}
                  <span className="text-destructive">●{r.offTrack}</span>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell>{isAr ? 'الإجمالي للمجموعة' : 'Group Total'}</TableCell>
              <TableCell className="text-right">{fmt(totals.revenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{fmt(totals.target)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={totals.revenue >= totals.target ? 'default' : 'destructive'}>
                  {totals.target ? (((totals.revenue - totals.target) / totals.target) * 100).toFixed(1) : '0'}%
                </Badge>
              </TableCell>
              <TableCell className="text-right">{fmt(totals.ebitda)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">{isAr ? 'لا توجد شركات.' : 'No companies in scope.'}</p>
        )}
      </CardContent>
    </Card>
  );
}
