import { useSupplierScorecards } from '@/hooks/useSupplierScorecard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupplierScorecards() {
  const { t } = useLanguage();
  const { data, isLoading } = useSupplierScorecards();
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t('proc.score.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('proc.score.subtitle')}</p>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="p-4 text-muted-foreground">…</div> : !data?.length ? (
            <div className="text-center text-muted-foreground py-8">{t('proc.score.empty')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('proc.score.period')}</TableHead>
                  <TableHead>{t('proc.score.vendor')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.pos')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.grpos')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.onTime')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.spend')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.exceptions')}</TableHead>
                  <TableHead className="text-right">{t('proc.score.overall')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{format(new Date(s.period_start), 'MMM d')} → {format(new Date(s.period_end), 'MMM d')}</TableCell>
                    <TableCell className="font-mono text-xs">{s.vendor_code || s.vendor_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.total_pos}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.total_grpos}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.on_time_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{s.total_spend.toLocaleString()}</TableCell>
                    <TableCell className="text-right"><Badge variant={s.match_exception_count > 0 ? 'destructive' : 'outline'}>{s.match_exception_count}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant={s.overall_score >= 80 ? 'default' : s.overall_score >= 60 ? 'secondary' : 'destructive'}>{s.overall_score.toFixed(0)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
