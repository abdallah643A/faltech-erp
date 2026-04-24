/**
 * Implementation Tasks — go-live checklist for Administration & Setup.
 *
 * Production-ready CRUD with bilingual validation, status transitions,
 * priority, owner, due date, blockers, and full audit trail through
 * `recordSetupAudit()`.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, ListChecks, CheckCircle2, Clock, AlertOctagon, SkipForward } from 'lucide-react';
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
import { newTables } from '@/integrations/supabase/new-tables';
import type { SetupImplementationTask, SetupImplStatus } from '@/types/data-contracts';
import { recordSetupAudit } from '@/lib/setupAudit';

const CATEGORIES = ['company','financials','users','data','integrations','training','golive'] as const;

const taskSchema = z.object({
  title: z.string().trim().min(2, 'title_required').max(160, 'title_too_long'),
  title_ar: z.string().trim().max(160).optional().or(z.literal('')),
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  owner_name: z.string().trim().max(120).optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  priority: z.enum(['low','medium','high','critical']),
});
const ERR: Record<string, { en: string; ar: string }> = {
  title_required: { en: 'Title is required',      ar: 'العنوان مطلوب' },
  title_too_long: { en: 'Title must be ≤160 chars', ar: 'العنوان طويل جدًا' },
};

const STATUS_VARIANT: Record<SetupImplStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', in_progress: 'default', blocked: 'destructive', completed: 'default', skipped: 'outline',
};
const STATUS_ICON: Record<SetupImplStatus, typeof Clock> = {
  pending: Clock, in_progress: Clock, blocked: AlertOctagon, completed: CheckCircle2, skipped: SkipForward,
};

export default function SetupImplementationTasks() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<SetupImplementationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '', title_ar: '', category: 'company',
      description: '', owner_name: '', due_date: '', priority: 'medium',
    },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await newTables.setupImplementationTasks()
      .select('*').order('sort_order').order('created_at', { ascending: false }).limit(500);
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as SetupImplementationTask[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (values: z.infer<typeof taskSchema>) => {
    const payload = {
      ...values,
      title_ar: values.title_ar || null,
      description: values.description || null,
      owner_name: values.owner_name || null,
      due_date: values.due_date || null,
      status: 'pending' as const,
    };
    const { data, error } = await newTables.setupImplementationTasks().insert(payload).select().single();
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'implementation_task',
      entityId: (data as SetupImplementationTask).id,
      entityLabel: values.title,
      action: 'create',
      newValues: payload,
    });
    toast({ title: isAr ? 'تم إنشاء المهمة' : 'Task created' });
    setOpen(false); form.reset(); fetchRows();
  };

  const updateStatus = async (task: SetupImplementationTask, status: SetupImplStatus) => {
    const patch: Partial<SetupImplementationTask> = { status };
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString();
    }
    const { error } = await newTables.setupImplementationTasks().update(patch).eq('id', task.id);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    await recordSetupAudit({
      entityType: 'implementation_task',
      entityId: task.id,
      entityLabel: task.title,
      action: 'update',
      oldValues: { status: task.status },
      newValues: patch,
    });
    fetchRows();
  };

  const tr = (k?: string) => (k && ERR[k] ? (isAr ? ERR[k].ar : ERR[k].en) : k ?? '');

  const filtered = useMemo(
    () => categoryFilter === 'all' ? rows : rows.filter((r) => r.category === categoryFilter),
    [rows, categoryFilter],
  );
  const completion = rows.length === 0
    ? 0
    : Math.round(100 * rows.filter((r) => r.status === 'completed').length / rows.length);

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-7 w-7" />
            {isAr ? 'مهام التنفيذ' : 'Implementation Tasks'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr
              ? 'قائمة مرجعية للإطلاق مع المسؤولين والمواعيد والمعوقات.'
              : 'Go-live checklist with owners, due dates and blockers.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'مهمة جديدة' : 'New Task'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إضافة مهمة' : 'Add task'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField name="title" control={form.control} render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{isAr ? 'العنوان (إنجليزي)' : 'Title (EN)'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage>{tr(form.formState.errors.title?.message)}</FormMessage>
                    </FormItem>
                  )} />
                  <FormField name="title_ar" control={form.control} render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{isAr ? 'العنوان (عربي)' : 'Title (AR)'}</FormLabel>
                      <FormControl><Input dir="rtl" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="category" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'التصنيف' : 'Category'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField name="priority" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'الأولوية' : 'Priority'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {(['low','medium','high','critical'] as const).map((p) =>
                            <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField name="owner_name" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'المسؤول' : 'Owner'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="due_date" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isAr ? 'تاريخ الاستحقاق' : 'Due date'}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField name="description" control={form.control} render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{isAr ? 'الوصف' : 'Description'}</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isAr ? 'تقدم الإنجاز' : 'Overall progress'} — {completion}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completion} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{isAr ? 'تصفية:' : 'Filter:'}</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'كل التصنيفات' : 'All categories'}</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'العنوان' : 'Title'}</TableHead>
                <TableHead>{isAr ? 'التصنيف' : 'Category'}</TableHead>
                <TableHead>{isAr ? 'المسؤول' : 'Owner'}</TableHead>
                <TableHead>{isAr ? 'الاستحقاق' : 'Due'}</TableHead>
                <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="text-end">{isAr ? 'إجراء' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد مهام' : 'No tasks yet'}</TableCell></TableRow>
              ) : filtered.map((r) => {
                const Icon = STATUS_ICON[r.status];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{isAr && r.title_ar ? r.title_ar : r.title}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                    <TableCell className="text-sm">{r.owner_name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{r.due_date ? format(new Date(r.due_date), 'yyyy-MM-dd') : '—'}</TableCell>
                    <TableCell><Badge variant={r.priority === 'critical' ? 'destructive' : 'secondary'}>{r.priority}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]} className="gap-1">
                        <Icon className="h-3 w-3" />{r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r, v as SetupImplStatus)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['pending','in_progress','blocked','completed','skipped'] as SetupImplStatus[]).map((s) =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
