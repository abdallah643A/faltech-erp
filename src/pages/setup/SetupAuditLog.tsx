/**
 * Setup Audit Log — read-only viewer for `setup_audit_log`.
 * Filterable by entity type / action / date range and shows old vs new
 * values for each change. The underlying table has no UPDATE/DELETE
 * policies so the trail is tamper-proof.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, History as HistoryIcon, Download } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { newTables } from '@/integrations/supabase/new-tables';
import type { SetupAuditLogEntry, SetupAuditAction } from '@/types/data-contracts';
import { useToast } from '@/hooks/use-toast';

const ACTION_VARIANT: Record<SetupAuditAction, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  publish: 'default',
  rollback: 'outline',
  import: 'secondary',
  export: 'outline',
};

export default function SetupAuditLog() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<SetupAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selected, setSelected] = useState<SetupAuditLogEntry | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await newTables
      .setupAuditLog()
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(500);
    if (error) {
      toast({
        variant: 'destructive',
        title: isAr ? 'تعذّر تحميل السجل' : 'Failed to load audit log',
        description: error.message,
      });
    } else {
      setRows((data ?? []) as SetupAuditLogEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const entityTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_type))).sort(),
    [rows],
  );

  const filtered = useMemo(() => rows.filter((r) => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (entityFilter !== 'all' && r.entity_type !== entityFilter) return false;
    if (search) {
      const haystack = [
        r.entity_label, r.entity_type, r.performed_by_name, r.reason,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, actionFilter, entityFilter, search]);

  const exportCsv = () => {
    const header = ['When', 'Entity', 'Action', 'Label', 'Changed Fields', 'By', 'Reason'];
    const escape = (v: unknown) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) => [
        r.performed_at, r.entity_type, r.action,
        r.entity_label ?? '', (r.changed_fields ?? []).join(';'),
        r.performed_by_name ?? '', r.reason ?? '',
      ].map(escape).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `setup-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HistoryIcon className="h-7 w-7" />
            {isAr ? 'سجل تدقيق الإعدادات' : 'Setup Audit Log'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr
              ? 'سجل دائم لكل تغيير في الإعدادات. غير قابل للتعديل أو الحذف.'
              : 'Immutable trail of every configuration change. Cannot be altered or deleted.'}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="me-2 h-4 w-4" />
          {isAr ? 'تصدير CSV' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isAr ? 'تصفية' : 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder={isAr ? 'بحث...' : 'Search…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'جميع الكيانات' : 'All entities'}</SelectItem>
              {entityTypes.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'جميع الإجراءات' : 'All actions'}</SelectItem>
              {(['create','update','delete','publish','rollback','import','export'] as const).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
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
                <TableHead>{isAr ? 'الكيان' : 'Entity'}</TableHead>
                <TableHead>{isAr ? 'الإجراء' : 'Action'}</TableHead>
                <TableHead>{isAr ? 'العنوان' : 'Label'}</TableHead>
                <TableHead>{isAr ? 'الحقول' : 'Fields'}</TableHead>
                <TableHead>{isAr ? 'بواسطة' : 'By'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'جارٍ التحميل...' : 'Loading…'}
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'لا توجد سجلات' : 'No audit entries yet'}
                </TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(r.performed_at), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_type}</TableCell>
                  <TableCell><Badge variant={ACTION_VARIANT[r.action]}>{r.action}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate">{r.entity_label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(r.changed_fields ?? []).slice(0, 3).join(', ')}
                    {(r.changed_fields?.length ?? 0) > 3 ? '…' : ''}
                  </TableCell>
                  <TableCell className="text-sm">{r.performed_by_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side={isAr ? 'left' : 'right'} className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.entity_type} • <span className="capitalize">{selected.action}</span>
                </SheetTitle>
                <SheetDescription>
                  {selected.entity_label ?? '—'} · {format(new Date(selected.performed_at), 'PPpp')}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selected.reason && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">{isAr ? 'السبب' : 'Reason'}</h4>
                    <p className="text-sm text-muted-foreground">{selected.reason}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-2">{isAr ? 'القيمة السابقة' : 'Old values'}</h4>
                  <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.old_values ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">{isAr ? 'القيمة الجديدة' : 'New values'}</h4>
                  <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.new_values ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
