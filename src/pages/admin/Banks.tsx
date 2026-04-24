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

interface Bank {
  id: string;
  country: string;
  bank_code: string;
  bank_name: string;
  swift_code: string | null;
  branch_name: string | null;
  account_number: string | null;
  is_active: boolean;
}

export default function Banks() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<Bank>>({});

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['banks', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.from('banks').select('*').eq('company_id', activeCompanyId).order('bank_code');
      if (error) throw error;
      return data as Bank[];
    },
    enabled: !!activeCompanyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (row: Partial<Bank>) => {
      const payload = { country: row.country, bank_code: row.bank_code, bank_name: row.bank_name, swift_code: row.swift_code || null, branch_name: row.branch_name || null, account_number: row.account_number || null, is_active: row.is_active };
      if (row.id) {
        const { error } = await supabase.from('banks').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banks').insert({ ...payload, company_id: activeCompanyId! } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banks'] }); setEditingId(null); setIsAdding(false); setForm({}); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('banks').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banks'] }); toast.success('Deleted'); },
  });

  const startAdd = () => { setIsAdding(true); setForm({ country: 'SA', bank_code: '', bank_name: '', swift_code: '', branch_name: '', account_number: '', is_active: true }); };
  const startEdit = (row: Bank) => { setEditingId(row.id); setForm({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setIsAdding(false); setForm({}); };

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  const editRow = (key: string) => (
    <TableRow key={key}>
      <TableCell><Input value={form.country || ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="h-8 w-16" /></TableCell>
      <TableCell><Input value={form.bank_code || ''} onChange={e => setForm(f => ({ ...f, bank_code: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input value={form.bank_name || ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input value={form.swift_code || ''} onChange={e => setForm(f => ({ ...f, swift_code: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input value={form.branch_name || ''} onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))} className="h-8" /></TableCell>
      <TableCell><Input value={form.account_number || ''} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} className="h-8" /></TableCell>
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
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'البنوك' : 'Banks'}</h1>
          <p className="text-muted-foreground text-sm">Manage bank definitions and SWIFT codes</p>
        </div>
        <Button onClick={startAdd} disabled={isAdding} size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead><TableHead>Bank Code</TableHead><TableHead>Bank Name</TableHead>
              <TableHead>SWIFT</TableHead><TableHead>Branch</TableHead><TableHead>Account</TableHead>
              <TableHead>Active</TableHead><TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && editRow('new')}
            {banks.map(row => editingId === row.id ? editRow(row.id) : (
              <TableRow key={row.id}>
                <TableCell>{row.country}</TableCell>
                <TableCell className="font-mono">{row.bank_code}</TableCell>
                <TableCell>{row.bank_name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{row.swift_code || '—'}</TableCell>
                <TableCell>{row.branch_name || '—'}</TableCell>
                <TableCell className="font-mono">{row.account_number || '—'}</TableCell>
                <TableCell>{row.is_active ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && banks.length === 0 && !isAdding && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No banks defined.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
