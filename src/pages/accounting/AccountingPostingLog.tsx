/**
 * Posting Audit Log — append-only trail of every JE post / reversal /
 * period-lock / IC mirror / recurring run. Cannot be edited or deleted.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { History, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { acctTables } from '@/integrations/supabase/acct-tables';
import type { AcctPostingLogEntry, PostingLogAction } from '@/types/accounting-contracts';

const ACTIONS: PostingLogAction[] = [
  'post','reverse','period_lock','period_unlock',
  'period_close','period_reopen','recurring_run','intercompany_mirror',
];
const VARIANT: Record<PostingLogAction, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  post: 'default', reverse: 'destructive',
  period_lock: 'secondary', period_unlock: 'outline',
  period_close: 'destructive', period_reopen: 'outline',
  recurring_run: 'secondary', intercompany_mirror: 'default',
};

export default function AccountingPostingLog() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctPostingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.postingLog()
      .select('*').order('performed_at', { ascending: false }).limit(500);
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctPostingLogEntry[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (search) {
      const hay = [r.doc_number, r.action, r.performed_by_name, r.reason].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, actionFilter, search]);

  const exportCsv = () => {
    const header = ['When','Action','Doc','Posting Date','Debit','Credit','Balanced','By','Reason'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) => [
        r.performed_at, r.action, r.doc_number ?? '', r.posting_date ?? '',
        r.total_debit ?? '', r.total_credit ?? '', r.is_balanced ?? '',
        r.performed_by_name ?? '', r.reason ?? '',
      ].map(esc).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `posting-log-${format(new Date(),'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-7 w-7" />
            {isAr ? 'سجل ترحيل القيود' : 'Posting Audit Log'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'سجل دائم غير قابل للتعديل لكل ترحيل أو عكس أو تغيير فترة.'
                  : 'Tamper-proof trail of every post, reversal, and period change.'}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="me-2 h-4 w-4" />{isAr ? 'تصدير CSV' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{isAr ? 'تصفية' : 'Filters'}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder={isAr ? 'بحث...' : 'Search…'}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'جميع الإجراءات' : 'All actions'}</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الوقت' : 'When'}</TableHead>
                <TableHead>{isAr ? 'الإجراء' : 'Action'}</TableHead>
                <TableHead>{isAr ? 'مستند' : 'Doc'}</TableHead>
                <TableHead>{isAr ? 'تاريخ الترحيل' : 'Posting'}</TableHead>
                <TableHead className="text-end">{isAr ? 'مدين' : 'Debit'}</TableHead>
                <TableHead className="text-end">{isAr ? 'دائن' : 'Credit'}</TableHead>
                <TableHead>{isAr ? 'متوازن' : 'Bal'}</TableHead>
                <TableHead>{isAr ? 'بواسطة' : 'By'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No log entries yet'}</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">{format(new Date(r.performed_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell><Badge variant={VARIANT[r.action]}>{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.doc_number ?? '—'}</TableCell>
                  <TableCell className="text-sm">{r.posting_date ?? '—'}</TableCell>
                  <TableCell className="text-end font-mono">{r.total_debit?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-end font-mono">{r.total_credit?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell>
                    {r.is_balanced === true ? <Badge variant="default">✓</Badge>
                      : r.is_balanced === false ? <Badge variant="destructive">✗</Badge>
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{r.performed_by_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
