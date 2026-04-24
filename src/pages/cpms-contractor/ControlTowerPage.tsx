import { useState } from 'react';
import { useControlTower, useRefreshTower } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Radio as Tower, RefreshCw } from 'lucide-react';

export default function ControlTowerPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const [scope, setScope] = useState<'company' | 'group'>('company');
  const { data = [], isLoading } = useControlTower(scope);
  const refresh = useRefreshTower();

  const totals = data.reduce((a: any, r: any) => {
    a.ncrs += r.open_ncrs || 0; a.rfis += r.open_rfis || 0;
    a.vos  += r.open_vos  || 0; a.delays += r.open_delays || 0;
    a.retention += Number(r.retention_held) || 0;
    return a;
  }, { ncrs: 0, rfis: 0, vos: 0, delays: 0, retention: 0 });

  const healthVariant = (h: string) => h === 'green' ? 'default' : h === 'amber' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Tower className="h-6 w-6 text-primary" />{isAr ? 'برج التحكم التنفيذي للمشاريع' : 'Project Control Tower'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'مؤشرات أداء عبر المشاريع — تحديث لحظي' : 'Cross-project KPIs — refresh on demand'}</p>
        </div>
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refresh.isPending ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
        <TabsList>
          <TabsTrigger value="company">{isAr ? 'الشركة الحالية' : 'Active Company'}</TabsTrigger>
          <TabsTrigger value="group">{isAr ? 'المجموعة (كل الشركات)' : 'Group (All Companies)'}</TabsTrigger>
        </TabsList>

        <TabsContent value={scope} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Projects</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open VOs</p><p className="text-2xl font-bold text-amber-600">{totals.vos}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open NCRs</p><p className="text-2xl font-bold text-destructive">{totals.ncrs}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open RFIs</p><p className="text-2xl font-bold">{totals.rfis}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Delay Events</p><p className="text-2xl font-bold text-amber-600">{totals.delays}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>{isAr ? 'حالة المشاريع' : 'Project Status'}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Snapshot</TableHead><TableHead className="text-right">CPI</TableHead><TableHead className="text-right">SPI</TableHead><TableHead className="text-right">VOs</TableHead><TableHead className="text-right">NCRs</TableHead><TableHead className="text-right">RFIs</TableHead><TableHead className="text-right">Delays</TableHead><TableHead>Health</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.project_id?.slice(0, 8)}</TableCell>
                        <TableCell>{r.snapshot_date}</TableCell>
                        <TableCell className="text-right">{r.cpi?.toFixed?.(2) ?? '—'}</TableCell>
                        <TableCell className="text-right">{r.spi?.toFixed?.(2) ?? '—'}</TableCell>
                        <TableCell className="text-right">{r.open_vos}</TableCell>
                        <TableCell className="text-right">{r.open_ncrs}</TableCell>
                        <TableCell className="text-right">{r.open_rfis}</TableCell>
                        <TableCell className="text-right">{r.open_delays}</TableCell>
                        <TableCell><Badge variant={healthVariant(r.health)}>{r.health}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!data.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">{isAr ? 'اضغط تحديث لحساب اللقطات' : 'Click Refresh to compute snapshots'}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
