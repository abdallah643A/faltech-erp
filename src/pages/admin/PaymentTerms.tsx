import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Save, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentTerm {
  id: string;
  terms_code: string;
  terms_name: string;
  due_days: number;
  cash_discount_percent: number;
  installments: number;
  starting_from: string;
  is_active: boolean;
}

export default function PaymentTerms() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<PaymentTerm>>({});

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['payment_terms', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.from('payment_terms').select('*').eq('company_id', activeCompanyId).order('terms_code');
      if (error) throw error;
      return data as PaymentTerm[];
    },
    enabled: !!activeCompanyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (row: Partial<PaymentTerm>) => {
      if (row.id) {
        const { error } = await supabase.from('payment_terms').update({
          terms_code: row.terms_code, terms_name: row.terms_name, due_days: row.due_days,
          cash_discount_percent: row.cash_discount_percent, installments: row.installments,
          starting_from: row.starting_from, is_active: row.is_active,
        }).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_terms').insert({
          company_id: activeCompanyId!, terms_code: row.terms_code!, terms_name: row.terms_name!,
          due_days: row.due_days ?? 0, cash_discount_percent: row.cash_discount_percent ?? 0,
          installments: row.installments ?? 1, starting_from: row.starting_from ?? 'doc_date',
          is_active: row.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_terms'] });
      setEditingId(null); setIsAdding(false); setForm({});
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payment_terms'] }); toast.success('Deleted'); },
  });

  const startAdd = () => { setIsAdding(true); setForm({ terms_code: '', terms_name: '', due_days: 30, cash_discount_percent: 0, installments: 1, starting_from: 'doc_date', is_active: true }); };
  const startEdit = (row: PaymentTerm) => { setEditingId(row.id); setForm({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setIsAdding(false); setForm({}); };

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  const renderRow = (isNew: boolean, row?: PaymentTerm) => (
    <TableRow key={isNew ? 'new' : row!.id}>
      <TableCell><Input value={form.terms_code || ''} onChange={e => setForm(f => ({ ...f, terms_code: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input value={form.terms_name || ''} onChange={e => setForm(f => ({ ...f, terms_name: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input type="number" value={form.due_days ?? ''} onChange={e => setForm(f => ({ ...f, due_days: parseInt(e.target.value) }))} className="h-8 w-20" /></TableCell>
      <TableCell><Input type="number" value={form.cash_discount_percent ?? ''} onChange={e => setForm(f => ({ ...f, cash_discount_percent: parseFloat(e.target.value) }))} className="h-8 w-20" /></TableCell>
      <TableCell><Input type="number" value={form.installments ?? ''} onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value) }))} className="h-8 w-16" /></TableCell>
      <TableCell>
        <select value={form.starting_from || 'doc_date'} onChange={e => setForm(f => ({ ...f, starting_from: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background">
          <option value="doc_date">Doc Date</option><option value="posting_date">Posting Date</option>
        </select>
      </TableCell>
      <TableCell><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /></TableCell>
      <TableCell className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveMutation.mutate(form)}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</h1>
          <p className="text-muted-foreground text-sm">Define payment terms and installment schedules</p>
        </div>
        <Button onClick={startAdd} disabled={isAdding} size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Due Days</TableHead>
              <TableHead>Discount %</TableHead><TableHead>Install.</TableHead><TableHead>Starting From</TableHead>
              <TableHead>Active</TableHead><TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && renderRow(true)}
            {terms.map(row => editingId === row.id ? renderRow(false, row) : (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.terms_code}</TableCell>
                <TableCell>{row.terms_name}</TableCell>
                <TableCell>{row.due_days}</TableCell>
                <TableCell>{row.cash_discount_percent}%</TableCell>
                <TableCell>{row.installments}</TableCell>
                <TableCell className="text-muted-foreground">{row.starting_from === 'doc_date' ? 'Doc Date' : 'Posting Date'}</TableCell>
                <TableCell>{row.is_active ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && terms.length === 0 && !isAdding && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payment terms defined.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
