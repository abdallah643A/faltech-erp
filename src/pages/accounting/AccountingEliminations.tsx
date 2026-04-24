/**
 * Consolidation Eliminations — list and add elimination entries used
 * during consolidation runs.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Layers, Plus } from 'lucide-react';
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
import type { AcctElimination, EliminationType } from '@/types/accounting-contracts';

const TYPES: EliminationType[] = ['ic_revenue','ic_cogs','ic_ar_ap','ic_loan','investment','other'];
const elimSchema = z.object({
  fiscal_year: z.coerce.number().int().min(2000).max(2100),
  period_number: z.coerce.number().int().min(1).max(12).optional(),
  elimination_type: z.enum(['ic_revenue','ic_cogs','ic_ar_ap','ic_loan','investment','other']),
  account_code: z.string().trim().min(1).max(40),
  description: z.string().max(300).optional().or(z.literal('')),
  debit_amount: z.coerce.number().min(0).default(0),
  credit_amount: z.coerce.number().min(0).default(0),
});

export default function AccountingEliminations() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctElimination[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof elimSchema>>({
    resolver: zodResolver(elimSchema),
    defaultValues: {
      fiscal_year: new Date().getFullYear(), elimination_type: 'ic_revenue',
      account_code: '', description: '', debit_amount: 0, credit_amount: 0,
    },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.eliminations()
      .select('*').order('fiscal_year', { ascending: false })
      .order('period_number', { ascending: false }).limit(200);
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctElimination[]);
    setLoading(false);
  };
  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onCreate = async (v: z.infer<typeof elimSchema>) => {
    const payload = {
      fiscal_year: v.fiscal_year,
      period_number: v.period_number ?? null,
      elimination_type: v.elimination_type,
      account_code: v.account_code,
      description: v.description || null,
      debit_amount: v.debit_amount,
      credit_amount: v.credit_amount,
    };
    const { error } = await acctTables.eliminations().insert(payload);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({ title: isAr ? 'تم الإنشاء' : 'Elimination created' });
    setOpen(false); form.reset(); fetchRows();
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7" />
            {isAr ? 'استبعادات التوحيد' : 'Consolidation Eliminations'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'إدارة قيود الاستبعاد المطبقة عند توحيد القوائم.'
                  : 'Manage elimination entries applied during consolidation.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'استبعاد جديد' : 'New Elimination'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إضافة استبعاد' : 'Add elimination'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField name="fiscal_year" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'السنة المالية' : 'Fiscal year'}</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField name="period_number" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'رقم الفترة' : 'Period (1-12)'}</FormLabel>
                      <FormControl><Input type="number" min={1} max={12} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField name="elimination_type" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'النوع' : 'Type'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select></FormItem>
                  )} />
                  <FormField name="account_code" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'رمز الحساب' : 'Account code'}</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="debit_amount" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'مدين' : 'Debit'}</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField name="credit_amount" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>{isAr ? 'دائن' : 'Credit'}</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField name="description" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'الوصف' : 'Description'}</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'تاريخ' : 'When'}</TableHead>
                <TableHead>{isAr ? 'فترة' : 'Period'}</TableHead>
                <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{isAr ? 'الحساب' : 'Account'}</TableHead>
                <TableHead className="text-end">{isAr ? 'مدين' : 'Debit'}</TableHead>
                <TableHead className="text-end">{isAr ? 'دائن' : 'Credit'}</TableHead>
                <TableHead>{isAr ? 'الوصف' : 'Description'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد استبعادات' : 'No eliminations yet'}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="text-sm">FY {r.fiscal_year}{r.period_number ? ` · P${r.period_number}` : ''}</TableCell>
                  <TableCell><Badge variant="outline">{r.elimination_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                  <TableCell className="text-end font-mono">{r.debit_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-end font-mono">{r.credit_amount.toLocaleString()}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm">{r.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
