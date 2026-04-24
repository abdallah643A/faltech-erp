import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newTables } from '@/integrations/supabase/new-tables';
import type { DocumentNumbering as DocNumberingRow } from '@/types/data-contracts';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, X, Hash } from 'lucide-react';
import { toast } from 'sonner';

type DocNumbering = Pick<
  DocNumberingRow,
  'id' | 'doc_type' | 'series_name' | 'first_number' | 'last_number' | 'next_number' | 'is_default' | 'is_locked'
>;

const DOC_TYPES = [
  'Journal Entry', 'AR Invoice', 'AP Invoice', 'Sales Order', 'Purchase Order',
  'Delivery', 'Goods Receipt', 'Goods Issue', 'Incoming Payment', 'Outgoing Payment',
  'Credit Memo', 'Sales Quotation', 'Purchase Request', 'Return', 'Inventory Transfer',
];

export default function DocumentNumbering() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({ doc_type: DOC_TYPES[0], series_name: 'Primary', first_number: 1, last_number: '', next_number: 1 });

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['document-numbering', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await newTables
        .documentNumbering()
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('doc_type');
      if (error) throw error;
      return (data ?? []) as DocNumbering[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await newTables.documentNumbering().insert({
        doc_type: newRow.doc_type,
        series_name: newRow.series_name,
        first_number: newRow.first_number,
        last_number: newRow.last_number ? Number(newRow.last_number) : null,
        next_number: newRow.next_number,
        company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numbering'] });
      setIsAdding(false);
      setNewRow({ doc_type: DOC_TYPES[0], series_name: 'Primary', first_number: 1, last_number: '', next_number: 1 });
      toast.success('Series added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await newTables.documentNumbering().update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-numbering'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await newTables.documentNumbering().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-numbering'] });
      toast.success('Series deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Hash className="h-6 w-6" />
            {language === 'ar' ? 'ترقيم المستندات' : 'Document Numbering'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'ar' ? 'إدارة سلاسل الترقيم لكل نوع مستند' : 'Manage numbering series per document type'}
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'سلسلة جديدة' : 'Add Series'}
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'نوع المستند' : 'Document Type'}</TableHead>
              <TableHead>{language === 'ar' ? 'اسم السلسلة' : 'Series Name'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'أول رقم' : 'First #'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'آخر رقم' : 'Last #'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'الرقم التالي' : 'Next #'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'افتراضي' : 'Default'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'مقفل' : 'Locked'}</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell>
                  <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={newRow.doc_type} onChange={e => setNewRow({ ...newRow, doc_type: e.target.value })}>
                    {DOC_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  </select>
                </TableCell>
                <TableCell><Input value={newRow.series_name} onChange={e => setNewRow({ ...newRow, series_name: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input type="number" value={newRow.first_number} onChange={e => setNewRow({ ...newRow, first_number: Number(e.target.value) })} className="h-8 w-20 text-center" /></TableCell>
                <TableCell><Input type="number" value={newRow.last_number} onChange={e => setNewRow({ ...newRow, last_number: e.target.value })} className="h-8 w-20 text-center" placeholder="∞" /></TableCell>
                <TableCell><Input type="number" value={newRow.next_number} onChange={e => setNewRow({ ...newRow, next_number: Number(e.target.value) })} className="h-8 w-20 text-center" /></TableCell>
                <TableCell />
                <TableCell />
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addMutation.mutate()}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : series.length === 0 && !isAdding ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No numbering series configured</TableCell></TableRow>
            ) : (
              series.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.doc_type}</TableCell>
                  <TableCell>{s.series_name}</TableCell>
                  <TableCell className="text-center">{s.first_number}</TableCell>
                  <TableCell className="text-center">{s.last_number ?? '∞'}</TableCell>
                  <TableCell className="text-center font-mono">{s.next_number}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={s.is_default} onCheckedChange={v => toggleMutation.mutate({ id: s.id, field: 'is_default', value: v })} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={s.is_locked} onCheckedChange={v => toggleMutation.mutate({ id: s.id, field: 'is_locked', value: v })} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
