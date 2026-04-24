/**
 * Recurring JEs — list templates and trigger generation manually.
 * A daily cron at 02:00 UTC invokes `acct_run_due_recurring_jes()`.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Repeat, Play } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { acctTables, acctRpc } from '@/integrations/supabase/acct-tables';
import type { AcctRecurringTemplate, RecurringFrequency } from '@/types/accounting-contracts';

const FREQS: RecurringFrequency[] = ['monthly','quarterly','semi_annual','yearly'];
const tplSchema = z.object({
  template_name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  frequency: z.enum(['monthly','quarterly','semi_annual','yearly']),
  start_date: z.string().min(4),
  end_date: z.string().optional().or(z.literal('')),
  next_run_date: z.string().min(4),
  auto_post: z.boolean(),
});

export default function AccountingRecurringJEs() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctRecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof tplSchema>>({
    resolver: zodResolver(tplSchema),
    defaultValues: {
      template_name: '', description: '', frequency: 'monthly',
      start_date: '', end_date: '', next_run_date: '', auto_post: false,
    },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.recurringTemplates()
      .select('*').order('next_run_date');
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctRecurringTemplate[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (v: z.infer<typeof tplSchema>) => {
    const payload = {
      template_name: v.template_name,
      description: v.description || null,
      frequency: v.frequency,
      start_date: v.start_date,
      end_date: v.end_date || null,
      next_run_date: v.next_run_date,
      auto_post: v.auto_post,
      is_active: true,
    };
    const { error } = await acctTables.recurringTemplates().insert(payload);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({ title: isAr ? 'تم الإنشاء' : 'Template created' });
    setOpen(false); form.reset(); fetchRows();
  };

  const runNow = async (t: AcctRecurringTemplate) => {
    const { data, error } = await acctRpc.runRecurring(t.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({
      title: isAr ? 'تم التوليد' : 'Generated',
      description: isAr ? `قيد جديد: ${data}` : `New JE: ${data}`,
    });
    fetchRows();
  };

  const toggleActive = async (t: AcctRecurringTemplate) => {
    const { error } = await acctTables.recurringTemplates()
      .update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    fetchRows();
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="h-7 w-7" />
            {isAr ? 'القيود المتكررة' : 'Recurring Journal Entries'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'يتم تشغيل القوالب المستحقة تلقائيًا يوميًا الساعة 02:00 UTC.'
                  : 'Due templates run automatically every day at 02:00 UTC.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'قالب جديد' : 'New Template'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إنشاء قالب' : 'Create template'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
                <FormField name="template_name" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'الاسم' : 'Name'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'الوصف' : 'Description'}</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField name="frequency" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'التكرار' : 'Frequency'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select></FormItem>
                  )} />
                  <FormField name="next_run_date" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'التشغيل التالي' : 'Next run'}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="start_date" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'البداية' : 'Start'}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="end_date" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'النهاية' : 'End (optional)'}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField name="auto_post" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>{isAr ? 'ترحيل تلقائي' : 'Auto-post'}</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {isAr ? 'إذا تم التفعيل، سيتم ترحيل القيد المُولّد فورًا.'
                              : 'When on, generated entry posts immediately (still subject to balance + period rules).'}
                      </p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
        <CardHeader className="pb-2"><CardTitle>{isAr ? 'القوالب' : 'Templates'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{isAr ? 'التكرار' : 'Frequency'}</TableHead>
                <TableHead>{isAr ? 'التشغيل التالي' : 'Next run'}</TableHead>
                <TableHead>{isAr ? 'آخر تشغيل' : 'Last run'}</TableHead>
                <TableHead className="text-end">{isAr ? 'مرات' : 'Runs'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'State'}</TableHead>
                <TableHead className="text-end">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد قوالب' : 'No recurring templates yet'}</TableCell></TableRow>
              ) : rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.template_name}</div>
                    {t.auto_post && <Badge variant="secondary" className="mt-1 text-xs">{isAr ? 'ترحيل تلقائي' : 'Auto-post'}</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{t.frequency}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(t.next_run_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="text-sm">{t.last_run_date ? format(new Date(t.last_run_date), 'yyyy-MM-dd') : '—'}</TableCell>
                  <TableCell className="text-end">{t.total_runs}{t.max_runs ? `/${t.max_runs}` : ''}</TableCell>
                  <TableCell>
                    {t.is_active
                      ? <Badge variant="default">{isAr ? 'نشط' : 'Active'}</Badge>
                      : <Badge variant="outline">{isAr ? 'متوقف' : 'Paused'}</Badge>}
                  </TableCell>
                  <TableCell className="text-end space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => runNow(t)} disabled={!t.is_active}>
                      <Play className="me-1 h-3 w-3" />{isAr ? 'تشغيل' : 'Run'}
                    </Button>
                    <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
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
