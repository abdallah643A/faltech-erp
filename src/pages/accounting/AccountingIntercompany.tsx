/**
 * Intercompany — view auto-mirror links and manually trigger a mirror.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Building2, Plus } from 'lucide-react';
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
import { acctTables, acctRpc } from '@/integrations/supabase/acct-tables';
import { supabase } from '@/integrations/supabase/client';
import type { AcctIntercompanyLink, IcLinkStatus } from '@/types/accounting-contracts';

const STATUS_VARIANT: Record<IcLinkStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default', reversed: 'destructive', reconciled: 'outline',
};

const mirrorSchema = z.object({
  origin_je_id: z.string().uuid(),
  partner_company_id: z.string().uuid(),
  notes: z.string().max(300).optional().or(z.literal('')),
});

export default function AccountingIntercompany() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();

  const [rows, setRows] = useState<AcctIntercompanyLink[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof mirrorSchema>>({
    resolver: zodResolver(mirrorSchema),
    defaultValues: { origin_je_id: '', partner_company_id: '', notes: '' },
  });

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await acctTables.intercompanyLinks()
      .select('*').order('created_at', { ascending: false }).limit(200);
    if (error) toast({ variant: 'destructive', title: error.message });
    else setRows((data ?? []) as AcctIntercompanyLink[]);
    setLoading(false);
  };
  const fetchCompanies = async () => {
    const { data } = await supabase.from('sap_companies').select('id, company_name').order('company_name');
    setCompanies((data ?? []).map((c) => ({ id: c.id, name: c.company_name })));
  };
  useEffect(() => { fetchRows(); fetchCompanies(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onMirror = async (v: z.infer<typeof mirrorSchema>) => {
    const { data, error } = await acctRpc.mirrorIntercompany(v.origin_je_id, v.partner_company_id, v.notes);
    if (error) { toast({ variant: 'destructive', title: error.message }); return; }
    toast({
      title: isAr ? 'تم إنشاء قيد المرآة' : 'Mirror entry created',
      description: isAr ? `قيد: ${data}` : `JE: ${data}`,
    });
    setOpen(false); form.reset(); fetchRows();
  };

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7" />
            {isAr ? 'العمليات بين الشركات' : 'Intercompany Operations'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'تتبع قيود المرآة بين شركات المجموعة. الإلغاء يعكس كلا الطرفين.'
                  : 'Track mirror entries across group companies. Reversals affect both sides.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="me-2 h-4 w-4" />{isAr ? 'قيد مرآة' : 'Mirror JE'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'إنشاء قيد مرآة يدوي' : 'Manual mirror entry'}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onMirror)} className="space-y-3">
                <FormField name="origin_je_id" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'معرّف القيد المصدر' : 'Origin JE ID'}</FormLabel>
                    <FormControl><Input placeholder="uuid" {...field} /></FormControl>
                    <FormMessage /></FormItem>
                )} />
                <FormField name="partner_company_id" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'الشركة الشريكة' : 'Partner company'}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage /></FormItem>
                )} />
                <FormField name="notes" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>{isAr ? 'ملاحظات' : 'Notes'}</FormLabel>
                    <FormControl><Input {...field} /></FormControl></FormItem>
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
        <CardHeader className="pb-2"><CardTitle>{isAr ? 'الروابط' : 'Links'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'تاريخ' : 'Date'}</TableHead>
                <TableHead>{isAr ? 'من شركة' : 'From'}</TableHead>
                <TableHead>{isAr ? 'إلى شركة' : 'To'}</TableHead>
                <TableHead className="text-end">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد روابط' : 'No intercompany links yet'}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="text-sm">{companyName(r.origin_company_id)}</TableCell>
                  <TableCell className="text-sm">{companyName(r.mirror_company_id)}</TableCell>
                  <TableCell className="text-end font-mono">{r.total_amount.toLocaleString()} {r.currency}</TableCell>
                  <TableCell><Badge variant="outline">{r.link_type}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
