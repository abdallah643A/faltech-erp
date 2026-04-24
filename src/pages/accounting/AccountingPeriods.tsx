/**
 * Posting Periods — generate fiscal year, lock/unlock, soft-close, close.
 * The DB trigger `tg_je_enforce_period_and_balance` rejects any post into
 * a `closed` period, so this UI just controls the gate.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, Lock, Unlock, CheckCircle2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { acctTables } from '@/integrations/supabase/acct-tables';
import { recordSetupAudit } from '@/lib/setupAudit';
import type { AcctPeriod, AcctPeriodStatus } from '@/types/accounting-contracts';

const STATUS_VARIANT: Record<AcctPeriodStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default', soft_closed: 'secondary', closed: 'destructive',
};

export default function AccountingPeriods() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.periods()
      .select('*').order('fiscal_year', { ascending: false }).order('period_number');
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctPeriod[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const generateYear = async () => {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const payload = months.map((m, i) => ({
      fiscal_year: year,
      period_number: i + 1,
      period_name: `${m} ${year}`,
      start_date: new Date(year, i, 1).toISOString().split('T')[0],
      end_date: new Date(year, i + 1, 0).toISOString().split('T')[0],
      status: 'open' as const,
    }));
    const { error } = await acctTables.periods().upsert(payload, {
      onConflict: 'company_id,fiscal_year,period_number',
    });
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'acct_period', action: 'create',
      entityLabel: `FY ${year}`,
      newValues: { fiscal_year: year, generated: 12 },
    });
    toast({ title: isAr ? 'تم إنشاء الفترات' : `Generated 12 periods for ${year}` });
    fetchRows();
  };

  const setStatus = async (p: AcctPeriod, status: AcctPeriodStatus) => {
    const patch: Partial<AcctPeriod> = { status };
    if (status === 'closed') {
      patch.closed_at = new Date().toISOString();
    }
    const { error } = await acctTables.periods().update(patch).eq('id', p.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'acct_period',
      entityId: p.id, entityLabel: p.period_name,
      action: status === 'closed' ? 'publish' : 'update',
      oldValues: { status: p.status }, newValues: { status },
    });
    toast({ title: isAr ? 'تم التحديث' : 'Period updated' });
    fetchRows();
  };

  const grouped = useMemo(() => {
    const m = new Map<number, AcctPeriod[]>();
    rows.forEach((r) => {
      if (!m.has(r.fiscal_year)) m.set(r.fiscal_year, []);
      m.get(r.fiscal_year)!.push(r);
    });
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-7 w-7" />
            {isAr ? 'فترات الترحيل المحاسبي' : 'Accounting Posting Periods'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr
              ? 'فتح وإقفال الفترات. الترحيل في فترة مقفلة مرفوض من قاعدة البيانات.'
              : 'Open, soft-close and close periods. Posts into a closed period are blocked at the DB level.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="w-28" min={2000} max={2100} />
          <Button onClick={generateYear}>
            <Plus className="me-2 h-4 w-4" />
            {isAr ? 'توليد سنة' : 'Generate year'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          {isAr ? 'لا توجد فترات بعد. ابدأ بتوليد سنة.' : 'No periods yet. Start by generating a fiscal year.'}
        </CardContent></Card>
      ) : grouped.map(([fy, periods]) => (
        <Card key={fy}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">FY {fy}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الفترة' : 'Period'}</TableHead>
                  <TableHead>{isAr ? 'البداية' : 'Start'}</TableHead>
                  <TableHead>{isAr ? 'النهاية' : 'End'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'مقفل في' : 'Closed at'}</TableHead>
                  <TableHead className="text-end">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.period_name}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.start_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell className="text-sm">{format(new Date(p.end_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell className="text-sm">{p.closed_at ? format(new Date(p.closed_at), 'yyyy-MM-dd HH:mm') : '—'}</TableCell>
                    <TableCell className="text-end space-x-1">
                      {p.status !== 'open' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(p, 'open')}>
                          <Unlock className="me-1 h-3 w-3" />{isAr ? 'فتح' : 'Open'}
                        </Button>
                      )}
                      {p.status !== 'soft_closed' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(p, 'soft_closed')}>
                          <Lock className="me-1 h-3 w-3" />{isAr ? 'إقفال مؤقت' : 'Soft close'}
                        </Button>
                      )}
                      {p.status !== 'closed' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(p, 'closed')}>
                          <CheckCircle2 className="me-1 h-3 w-3" />{isAr ? 'إقفال نهائي' : 'Close'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
