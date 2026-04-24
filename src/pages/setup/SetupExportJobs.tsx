/**
 * Data Exports — async export job tracker.
 *
 * Replaces the legacy /data-export redirect with a real workflow that
 * records every export run for audit and re-download. Heavy lifting
 * (actually generating the file) is delegated to existing report
 * generators; this surface persists the request and its result URL.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Download as DownloadIcon, ExternalLink } from 'lucide-react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { newTables } from '@/integrations/supabase/new-tables';
import type { SetupExportJob, SetupExportStatus } from '@/types/data-contracts';
import { recordSetupAudit } from '@/lib/setupAudit';

const exportSchema = z.object({
  job_name: z.string().trim().min(2, 'name_required').max(120),
  target_entity: z.string().trim().min(2, 'target_required').max(80),
  format: z.enum(['xlsx', 'csv', 'json', 'pdf']),
});
const ERR: Record<string, { en: string; ar: string }> = {
  name_required:   { en: 'Job name is required',      ar: 'اسم المهمة مطلوب' },
  target_required: { en: 'Target entity is required', ar: 'الكيان المستهدف مطلوب' },
};

const STATUS_VARIANT: Record<SetupExportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', running: 'default', completed: 'default', failed: 'destructive',
};

export default function SetupExportJobs() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<SetupExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof exportSchema>>({
    resolver: zodResolver(exportSchema),
    defaultValues: { job_name: '', target_entity: '', format: 'xlsx' },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await newTables.setupExportJobs()
      .select('*').order('created_at', { ascending: false }).limit(200);
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as SetupExportJob[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (values: z.infer<typeof exportSchema>) => {
    const payload = { ...values, status: 'pending' as const, filters: {} };
    const { data, error } = await newTables.setupExportJobs().insert(payload).select().single();
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'export_job',
      entityId: (data as SetupExportJob).id,
      entityLabel: values.job_name,
      action: 'create',
      newValues: payload,
    });
    toast({ title: isAr ? 'تم إنشاء المهمة' : 'Export job created' });
    setOpen(false); form.reset(); fetchRows();
  };

  const tr = (k?: string) => (k && ERR[k] ? (isAr ? ERR[k].ar : ERR[k].en) : k ?? '');

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DownloadIcon className="h-7 w-7" />
            {isAr ? 'مهام تصدير البيانات' : 'Data Export Jobs'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'سجل دائم لكل عمليات التصدير مع روابط التنزيل.' : 'Durable record of every export run with download links.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'مهمة جديدة' : 'New Job'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إنشاء مهمة تصدير' : 'Create export job'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                <FormField name="job_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'اسم المهمة' : 'Job name'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage>{tr(form.formState.errors.job_name?.message)}</FormMessage>
                  </FormItem>
                )} />
                <FormField name="target_entity" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'الكيان' : 'Target entity'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage>{tr(form.formState.errors.target_entity?.message)}</FormMessage>
                  </FormItem>
                )} />
                <FormField name="format" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'الصيغة' : 'Format'}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(['xlsx','csv','json','pdf'] as const).map((f) =>
                          <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
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
        <CardHeader className="pb-2"><CardTitle>{isAr ? 'المهام' : 'Jobs'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{isAr ? 'الكيان' : 'Entity'}</TableHead>
                <TableHead>{isAr ? 'الصيغة' : 'Format'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="text-end">{isAr ? 'الصفوف' : 'Rows'}</TableHead>
                <TableHead>{isAr ? 'الإنشاء' : 'Created'}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد مهام' : 'No export jobs yet'}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.job_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.target_entity}</TableCell>
                  <TableCell><Badge variant="outline">{r.format.toUpperCase()}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-end text-sm">{r.row_count.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="text-end">
                    {r.download_url && (
                      <a href={r.download_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                      </a>
                    )}
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
