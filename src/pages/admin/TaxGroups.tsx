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

interface TaxGroup {
  id: string;
  tax_code: string;
  tax_name: string;
  tax_rate: number;
  tax_type: string;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
}

const TAX_TYPES = ['VAT', 'Regular', 'Exempt', 'Zero-Rated'];

export default function TaxGroups() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<TaxGroup>>({});

  const { data: taxGroups = [], isLoading } = useQuery({
    queryKey: ['tax_groups', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from('tax_groups')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('tax_code');
      if (error) throw error;
      return data as TaxGroup[];
    },
    enabled: !!activeCompanyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (row: Partial<TaxGroup>) => {
      if (row.id) {
        const { error } = await supabase.from('tax_groups').update({
          tax_code: row.tax_code,
          tax_name: row.tax_name,
          tax_rate: row.tax_rate,
          tax_type: row.tax_type,
          valid_from: row.valid_from || null,
          valid_to: row.valid_to || null,
          is_active: row.is_active,
        }).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tax_groups').insert({
          company_id: activeCompanyId!,
          tax_code: row.tax_code!,
          tax_name: row.tax_name!,
          tax_rate: row.tax_rate ?? 0,
          tax_type: row.tax_type ?? 'VAT',
          valid_from: row.valid_from || null,
          valid_to: row.valid_to || null,
          is_active: row.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_groups'] });
      setEditingId(null);
      setIsAdding(false);
      setForm({});
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tax_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_groups'] });
      toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
    },
  });

  const startAdd = () => {
    setIsAdding(true);
    setForm({ tax_code: '', tax_name: '', tax_rate: 15, tax_type: 'VAT', is_active: true });
  };

  const startEdit = (row: TaxGroup) => {
    setEditingId(row.id);
    setForm({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setForm({});
  };

  if (!activeCompanyId) {
    return <div className="p-6 text-muted-foreground">Please select a company first.</div>;
  }

  return (
    <div className="space-y-4 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'مجموعات الضرائب' : 'Tax Groups'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة أكواد ومعدلات الضرائب' : 'Manage tax codes and rates'}</p>
        </div>
        <Button onClick={startAdd} disabled={isAdding} size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>

      <div className="border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tax Code</TableHead>
              <TableHead>Tax Name</TableHead>
              <TableHead>Rate (%)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Valid From</TableHead>
              <TableHead>Valid To</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell><Input value={form.tax_code || ''} onChange={e => setForm(f => ({ ...f, tax_code: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input value={form.tax_name || ''} onChange={e => setForm(f => ({ ...f, tax_name: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input type="number" value={form.tax_rate ?? ''} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="h-8 w-20" /></TableCell>
                <TableCell>
                  <select value={form.tax_type || 'VAT'} onChange={e => setForm(f => ({ ...f, tax_type: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background">
                    {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </TableCell>
                <TableCell><Input type="date" value={form.valid_from || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input type="date" value={form.valid_to || ''} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveMutation.mutate(form)}><Save className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            )}
            {taxGroups.map(row => editingId === row.id ? (
              <TableRow key={row.id}>
                <TableCell><Input value={form.tax_code || ''} onChange={e => setForm(f => ({ ...f, tax_code: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input value={form.tax_name || ''} onChange={e => setForm(f => ({ ...f, tax_name: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input type="number" value={form.tax_rate ?? ''} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="h-8 w-20" /></TableCell>
                <TableCell>
                  <select value={form.tax_type || 'VAT'} onChange={e => setForm(f => ({ ...f, tax_type: e.target.value }))} className="h-8 border rounded px-2 text-sm bg-background">
                    {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </TableCell>
                <TableCell><Input type="date" value={form.valid_from || ''} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input type="date" value={form.valid_to || ''} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveMutation.mutate(form)}><Save className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.tax_code}</TableCell>
                <TableCell>{row.tax_name}</TableCell>
                <TableCell>{row.tax_rate}%</TableCell>
                <TableCell><span className="px-2 py-0.5 rounded text-xs bg-muted">{row.tax_type}</span></TableCell>
                <TableCell className="text-muted-foreground">{row.valid_from || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{row.valid_to || '—'}</TableCell>
                <TableCell>{row.is_active ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && taxGroups.length === 0 && !isAdding && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No tax groups defined. Click "Add" to create one.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
