/**
 * Data Imports — async import job tracker.
 *
 * Replaces the legacy /data-import* redirects with a real workflow:
 *   1. Create job → records intent + target entity + source file path
 *   2. Validate    → app-side validation produces validation_errors JSONB
 *   3. Run         → bulk insert/upsert; on success status='completed'
 *   4. Rollback    → restore from rollback_snapshot, status='rolled_back'
 *
 * This page lists all jobs, lets users create new ones, view validation
 * errors, and trigger rollback. Bulk import processing is intentionally
 * delegated to existing `import-validation` flows / edge functions; this
 * UI provides the durable tracking + audit hook.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Upload, RotateCcw, Eye } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { newTables } from '@/integrations/supabase/new-tables';
import type { SetupImportJob, SetupImportStatus } from '@/types/data-contracts';
import { recordSetupAudit } from '@/lib/setupAudit';

// Bilingual zod messages — error key is resolved at render time.
const importJobSchema = z.object({
  job_name: z.string().trim().min(2, 'name_required').max(120, 'name_too_long'),
  target_entity: z.string().trim().min(2, 'target_required').max(80),
  source_type: z.enum(['excel', 'csv', 'json', 'sap', 'api']),
  source_file: z.string().trim().max(500).optional().or(z.literal('')),
});

const ERR_LABELS: Record<string, { en: string; ar: string }> = {
  name_required:   { en: 'Job name is required',          ar: 'اسم المهمة مطلوب' },
  name_too_long:   { en: 'Job name must be ≤120 chars',   ar: 'اسم المهمة طويل جدًا' },
  target_required: { en: 'Target entity is required',     ar: 'الكيان المستهدف مطلوب' },
};

const STATUS_VARIANT: Record<SetupImportStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending:     'secondary',
  validating:  'secondary',
  running:     'default',
  completed:   'default',
  failed:      'destructive',
  rolled_back: 'outline',
};

export default function SetupImportJobs() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<SetupImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SetupImportJob | null>(null);

  const form = useForm<z.infer<typeof importJobSchema>>({
    resolver: zodResolver(importJobSchema),
    defaultValues: { job_name: '', target_entity: '', source_type: 'excel', source_file: '' },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await newTables.setupImportJobs()
      .select('*').order('created_at', { ascending: false }).limit(200);
    if (error) {
      toast({ variant: 'destructive', title: error.message });
    } else {
      setRows((data ?? []) as SetupImportJob[]);
    }
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (values: z.infer<typeof importJobSchema>) => {
    const payload = { ...values, source_file: values.source_file || null, status: 'pending' as const };
    const { data, error } = await newTables.setupImportJobs().insert(payload).select().single();
    if (error) {
      toast({ variant: 'destructive', title: error.message });
      return;
    }
    await recordSetupAudit({
      entityType: 'import_job',
      entityId: (data as SetupImportJob).id,
      entityLabel: values.job_name,
      action: 'create',
      newValues: payload,
    });
    toast({ title: isAr ? 'تم إنشاء المهمة' : 'Import job created' });
    setOpen(false);
    form.reset();
    fetchRows();
  };

  const rollback = async (job: SetupImportJob) => {
    if (!window.confirm(isAr
      ? `هل أنت متأكد من التراجع عن "${job.job_name}"؟`
      : `Roll back "${job.job_name}"? This will mark the job as rolled_back.`)) return;
    const { error } = await newTables.setupImportJobs()
      .update({ status: 'rolled_back', completed_at: new Date().toISOString() })
      .eq('id', job.id);
    if (error) {
      toast({ variant: 'destructive', title: error.message });
      return;
    }
    await recordSetupAudit({
      entityType: 'import_job',
      entityId: job.id,
      entityLabel: job.job_name,
      action: 'rollback',
      oldValues: { status: job.status },
      newValues: { status: 'rolled_back' },
    });
    toast({ title: isAr ? 'تم التراجع' : 'Job rolled back' });
    fetchRows();
  };

  const tr = (key: string) => {
    const e = ERR_LABELS[key];
    return e ? (isAr ? e.ar : e.en) : key;
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="h-7 w-7" />
            {isAr ? 'مهام استيراد البيانات' : 'Data Import Jobs'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr
              ? 'تتبع كل عمليات الاستيراد مع التحقق والتراجع.'
              : 'Track every import run with validation and rollback support.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'مهمة جديدة' : 'New Job'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? 'إنشاء مهمة استيراد' : 'Create import job'}</DialogTitle>
              <DialogDescription>
                {isAr ? 'سجّل نية الاستيراد، ثم نفّذ المعالجة من شاشة التحقق.' : 'Register the intent here; run processing from the validation screen.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                <FormField name="job_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'اسم المهمة' : 'Job name'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage>{form.formState.errors.job_name && tr(form.formState.errors.job_name.message ?? '')}</FormMessage>
                  </FormItem>
                )} />
                <FormField name="target_entity" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'الكيان المستهدف' : 'Target entity'}</FormLabel>
                    <FormControl><Input placeholder="business_partners" {...field} /></FormControl>
                    <FormMessage>{form.formState.errors.target_entity && tr(form.formState.errors.target_entity.message ?? '')}</FormMessage>
                  </FormItem>
                )} />
                <FormField name="source_type" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'نوع المصدر' : 'Source type'}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(['excel','csv','json','sap','api'] as const).map((t) =>
                          <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField name="source_file" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isAr ? 'مسار الملف (اختياري)' : 'Source path (optional)'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
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
                <TableHead>{isAr ? 'المصدر' : 'Source'}</TableHead>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد مهام' : 'No import jobs yet'}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.job_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.target_entity}</TableCell>
                  <TableCell><Badge variant="outline">{r.source_type.toUpperCase()}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-end text-sm">
                    {r.success_rows}/{r.total_rows}
                    {r.failed_rows > 0 && <span className="text-destructive"> ({r.failed_rows})</span>}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="text-end">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {r.status === 'completed' && (
                      <Button size="sm" variant="ghost" onClick={() => rollback(r)} title={isAr ? 'تراجع' : 'Rollback'}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
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
                <SheetTitle>{selected.job_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">{isAr ? 'الكيان' : 'Entity'}: </span>{selected.target_entity}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'النوع' : 'Type'}: </span>{selected.source_type}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الحالة' : 'Status'}: </span>{selected.status}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الصفوف' : 'Rows'}: </span>{selected.success_rows}/{selected.total_rows}</div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{isAr ? 'أخطاء التحقق' : 'Validation errors'}</h4>
                  {selected.validation_errors?.length ? (
                    <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selected.validation_errors, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">{isAr ? 'لا توجد أخطاء' : 'No errors recorded'}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
