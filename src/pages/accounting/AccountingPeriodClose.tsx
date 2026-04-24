/**
 * Period-Close Checklist — controller's checklist of reconciliations,
 * accruals, and reviews per fiscal period.
 */
import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { acctTables } from '@/integrations/supabase/acct-tables';
import type { AcctPeriod, AcctCloseChecklistItem, CloseChecklistStatus } from '@/types/accounting-contracts';

const CATEGORIES = ['reconciliation','accrual','depreciation','tax','review','reporting'] as const;
const STATUS_VARIANT: Record<CloseChecklistStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', in_progress: 'default', completed: 'default', blocked: 'destructive', skipped: 'outline',
};

const taskSchema = z.object({
  task_title: z.string().trim().min(2).max(160),
  task_title_ar: z.string().trim().max(160).optional().or(z.literal('')),
  category: z.enum(CATEGORIES),
  owner_name: z.string().trim().max(120).optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});

export default function AccountingPeriodClose() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [periods, setPeriods] = useState<AcctPeriod[]>([]);
  const [tasks, setTasks] = useState<AcctCloseChecklistItem[]>([]);
  const [periodId, setPeriodId] = useState<string>('');
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { task_title: '', task_title_ar: '', category: 'reconciliation', owner_name: '', due_date: '', description: '' },
  });

  const loadPeriods = async () => {
    const { data } = await acctTables.periods().select('*')
      .order('fiscal_year', { ascending: false }).order('period_number', { ascending: false }).limit(24);
    const list = (data ?? []) as AcctPeriod[];
    setPeriods(list);
    if (list.length && !periodId) setPeriodId(list[0].id);
  };
  const loadTasks = async (pid: string) => {
    if (!pid) { setTasks([]); return; }
    const { data } = await acctTables.closeChecklist().select('*')
      .eq('period_id', pid).order('sort_order').order('created_at', { ascending: false });
    setTasks((data ?? []) as AcctCloseChecklistItem[]);
  };
  useEffect(() => { loadPeriods(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { loadTasks(periodId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodId]);

  const onCreate = async (v: z.infer<typeof taskSchema>) => {
    if (!periodId) return;
    const payload = {
      period_id: periodId,
      task_title: v.task_title,
      task_title_ar: v.task_title_ar || null,
      category: v.category,
      owner_name: v.owner_name || null,
      due_date: v.due_date || null,
      description: v.description || null,
      status: 'pending' as const,
    };
    const { error } = await acctTables.closeChecklist().insert(payload);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({ title: isAr ? 'تمت الإضافة' : 'Task added' });
    setOpen(false); form.reset(); loadTasks(periodId);
  };

  const updateStatus = async (t: AcctCloseChecklistItem, status: CloseChecklistStatus) => {
    const patch: Partial<AcctCloseChecklistItem> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await acctTables.closeChecklist().update(patch).eq('id', t.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    loadTasks(periodId);
  };

  const completion = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round(100 * tasks.filter((t) => t.status === 'completed').length / tasks.length);
  }, [tasks]);

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" />
            {isAr ? 'قائمة إقفال الفترة' : 'Period-Close Checklist'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'تأكد من إكمال جميع المهام قبل إقفال الفترة.' : 'Make sure every task is closed before locking the period.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-56"><SelectValue placeholder={isAr ? 'اختر فترة' : 'Select period'} /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.period_name} · {p.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!periodId}><Plus className="me-2 h-4 w-4" />{isAr ? 'مهمة' : 'Task'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{isAr ? 'إضافة مهمة' : 'Add task'}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
                  <FormField name="task_title" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'العنوان' : 'Title'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="task_title_ar" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'العنوان (عربي)' : 'Title (AR)'}</FormLabel>
                      <FormControl><Input dir="rtl" {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField name="category" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>{isAr ? 'التصنيف' : 'Category'}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select></FormItem>
                    )} />
                    <FormField name="due_date" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>{isAr ? 'الاستحقاق' : 'Due'}</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField name="owner_name" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'المسؤول' : 'Owner'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField name="description" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'الوصف' : 'Description'}</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
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
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isAr ? 'تقدم الإقفال' : 'Close progress'} — {completion}%</CardTitle></CardHeader>
        <CardContent><Progress value={completion} /></CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'العنوان' : 'Title'}</TableHead>
                <TableHead>{isAr ? 'التصنيف' : 'Category'}</TableHead>
                <TableHead>{isAr ? 'المسؤول' : 'Owner'}</TableHead>
                <TableHead>{isAr ? 'الاستحقاق' : 'Due'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="text-end">{isAr ? 'تحديث' : 'Update'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!periodId ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'اختر فترة لعرض المهام' : 'Select a period to see tasks'}
                </TableCell></TableRow>
              ) : tasks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'لا توجد مهام بعد' : 'No tasks yet — add your first one'}
                </TableCell></TableRow>
              ) : tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{isAr && t.task_title_ar ? t.task_title_ar : t.task_title}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell className="text-sm">{t.owner_name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{t.due_date ?? '—'}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge></TableCell>
                  <TableCell className="text-end">
                    <Select value={t.status} onValueChange={(v) => updateStatus(t, v as CloseChecklistStatus)}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['pending','in_progress','completed','blocked','skipped'] as CloseChecklistStatus[]).map((s) =>
                          <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
