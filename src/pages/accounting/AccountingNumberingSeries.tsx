/**
 * Numbering Series — manage atomic document numbering. Allocation uses
 * the `acct_alloc_next_number` SQL function so concurrent posts cannot
 * produce duplicates.
 */
import { useEffect, useState } from 'react';
import { Plus, Hash, Lock, Unlock, Wand2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { acctTables, acctRpc } from '@/integrations/supabase/acct-tables';
import type { AcctNumberingSeries } from '@/types/accounting-contracts';
import { recordSetupAudit } from '@/lib/setupAudit';

const seriesSchema = z.object({
  doc_type: z.string().trim().min(2, 'doc_type_required').max(50),
  series_name: z.string().trim().min(2, 'name_required').max(80),
  prefix: z.string().trim().max(20).optional().or(z.literal('')),
  suffix: z.string().trim().max(20).optional().or(z.literal('')),
  first_number: z.coerce.number().int().min(1),
  last_number: z.coerce.number().int().optional(),
  pad_length: z.coerce.number().int().min(1).max(12),
});
const ERR: Record<string, { en: string; ar: string }> = {
  doc_type_required: { en: 'Document type is required', ar: 'نوع المستند مطلوب' },
  name_required:     { en: 'Series name is required',    ar: 'اسم السلسلة مطلوب' },
};

export default function AccountingNumberingSeries() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctNumberingSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof seriesSchema>>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      doc_type: '', series_name: '', prefix: '', suffix: '',
      first_number: 1, pad_length: 6,
    },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.numberingSeries()
      .select('*').order('doc_type').order('series_name');
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctNumberingSeries[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (v: z.infer<typeof seriesSchema>) => {
    const payload = {
      doc_type: v.doc_type, series_name: v.series_name,
      prefix: v.prefix || null, suffix: v.suffix || null,
      first_number: v.first_number, next_number: v.first_number,
      last_number: v.last_number || null, pad_length: v.pad_length,
      is_default: false, is_locked: false, is_active: true,
    };
    const { data, error } = await acctTables.numberingSeries().insert(payload).select().single();
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'acct_numbering_series',
      entityId: (data as AcctNumberingSeries).id,
      entityLabel: `${v.doc_type} / ${v.series_name}`,
      action: 'create', newValues: payload,
    });
    toast({ title: isAr ? 'تم الإنشاء' : 'Series created' });
    setOpen(false); form.reset(); fetchRows();
  };

  const toggleLock = async (s: AcctNumberingSeries) => {
    const next = !s.is_locked;
    const { error } = await acctTables.numberingSeries().update({ is_locked: next }).eq('id', s.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'acct_numbering_series', entityId: s.id,
      entityLabel: `${s.doc_type} / ${s.series_name}`,
      action: 'update',
      oldValues: { is_locked: s.is_locked }, newValues: { is_locked: next },
    });
    fetchRows();
  };

  const previewNext = async (s: AcctNumberingSeries) => {
    const { data, error } = await acctRpc.allocNextNumber(s.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({ title: isAr ? 'الرقم المخصص' : 'Allocated number', description: data as string });
    fetchRows();
  };

  const tr = (k?: string) => (k && ERR[k] ? (isAr ? ERR[k].ar : ERR[k].en) : k ?? '');

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Hash className="h-7 w-7" />
            {isAr ? 'سلاسل الترقيم' : 'Numbering Series'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'تخصيص الأرقام ذري — لا يوجد تكرار حتى مع الترحيل المتزامن.'
                  : 'Atomic allocation — no duplicates even under concurrent posting.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'سلسلة جديدة' : 'New Series'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إنشاء سلسلة' : 'Create series'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField name="doc_type" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'نوع المستند' : 'Doc type'}</FormLabel>
                      <FormControl><Input placeholder="JE / INV / PO" {...field} /></FormControl>
                      <FormMessage>{tr(form.formState.errors.doc_type?.message)}</FormMessage>
                    </FormItem>
                  )} />
                  <FormField name="series_name" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'الاسم' : 'Name'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage>{tr(form.formState.errors.series_name?.message)}</FormMessage>
                    </FormItem>
                  )} />
                  <FormField name="prefix" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'بادئة' : 'Prefix'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="suffix" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'لاحقة' : 'Suffix'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="first_number" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'الرقم الأول' : 'First number'}</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="pad_length" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'طول التعبئة' : 'Pad length'}</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                  <Button type="submit">{isAr ? 'إنشاء' : 'Create'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle>{isAr ? 'السلاسل' : 'Series'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{isAr ? 'القالب' : 'Pattern'}</TableHead>
                <TableHead className="text-end">{isAr ? 'التالي' : 'Next'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'State'}</TableHead>
                <TableHead className="text-end">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سلاسل' : 'No series defined yet'}</TableCell></TableRow>
              ) : rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="outline">{s.doc_type}</Badge></TableCell>
                  <TableCell className="font-medium">{s.series_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {(s.prefix ?? '') + '0'.repeat(s.pad_length) + (s.suffix ?? '')}
                  </TableCell>
                  <TableCell className="text-end font-mono">{s.next_number}</TableCell>
                  <TableCell>
                    {s.is_locked
                      ? <Badge variant="destructive">{isAr ? 'مقفل' : 'Locked'}</Badge>
                      : <Badge variant="default">{isAr ? 'نشط' : 'Active'}</Badge>}
                  </TableCell>
                  <TableCell className="text-end space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => previewNext(s)} disabled={s.is_locked}>
                      <Wand2 className="me-1 h-3 w-3" />{isAr ? 'تخصيص' : 'Allocate'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleLock(s)}>
                      {s.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
