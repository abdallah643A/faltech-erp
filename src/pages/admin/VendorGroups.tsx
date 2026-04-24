import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Group { id: string; group_code: number; group_name: string; notes: string | null; }

export default function VendorGroups() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Partial<Group>>({});

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['vendor_groups', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.from('vendor_groups').select('*').eq('company_id', activeCompanyId).order('group_code');
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!activeCompanyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (row: Partial<Group>) => {
      if (row.id) {
        const { error } = await supabase.from('vendor_groups').update({ group_name: row.group_name, notes: row.notes || null }).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vendor_groups').insert({ company_id: activeCompanyId!, group_name: row.group_name!, notes: row.notes || null });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendor_groups'] }); setEditingId(null); setIsAdding(false); setForm({}); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('vendor_groups').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendor_groups'] }); toast.success('Deleted'); },
  });

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  return (
    <div className="space-y-4 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'مجموعات الموردين' : 'Vendor Groups'}</h1>
          <p className="text-muted-foreground text-sm">Classify vendors into groups</p>
        </div>
        <Button onClick={() => { setIsAdding(true); setForm({ group_name: '', notes: '' }); }} disabled={isAdding} size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="border rounded-lg bg-background">
        <Table>
          <TableHeader><TableRow><TableHead className="w-20">Code</TableHead><TableHead>Group Name</TableHead><TableHead>Notes</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell className="text-muted-foreground">Auto</TableCell>
                <TableCell><Input value={form.group_name || ''} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8" /></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveMutation.mutate(form)}><Save className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setIsAdding(false); setForm({}); }}><X className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            )}
            {groups.map(row => editingId === row.id ? (
              <TableRow key={row.id}>
                <TableCell>{row.group_code}</TableCell>
                <TableCell><Input value={form.group_name || ''} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} className="h-8" /></TableCell>
                <TableCell><Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8" /></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveMutation.mutate(form)}><Save className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(null); setForm({}); }}><X className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.group_code}</TableCell>
                <TableCell>{row.group_name}</TableCell>
                <TableCell className="text-muted-foreground">{row.notes || '—'}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(row.id); setForm({ ...row }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && groups.length === 0 && !isAdding && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No vendor groups defined.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
