import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, Puzzle, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Addon {
  id: string;
  addon_name: string;
  version: string;
  status: string;
  installed_date: string;
  publisher: string | null;
  description: string | null;
}

export default function AddonManager() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({ addon_name: '', version: '1.0.0', publisher: '', description: '' });

  const { data: addons = [], isLoading } = useQuery({
    queryKey: ['admin-addons', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_addons').select('*').eq('company_id', activeCompanyId!).order('addon_name');
      if (error) throw error;
      return data as Addon[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('admin_addons').insert({
        addon_name: newRow.addon_name,
        version: newRow.version,
        publisher: newRow.publisher || null,
        description: newRow.description || null,
        status: 'inactive',
        company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      setIsAdding(false);
      setNewRow({ addon_name: '', version: '1.0.0', publisher: '', description: '' });
      toast.success('Add-on registered');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from('admin_addons').update({ status: active ? 'active' : 'inactive' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('admin_addons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      toast.success('Add-on removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Puzzle className="h-6 w-6" />
            {language === 'ar' ? 'مدير الإضافات' : 'Add-on Manager'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'تثبيت وإدارة الإضافات' : 'Install and manage add-ons'}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'إضافة جديدة' : 'Install Add-on'}
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {isAdding && (
          <div className="p-4 border-b bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Add-on Name" value={newRow.addon_name} onChange={e => setNewRow({ ...newRow, addon_name: e.target.value })} className="h-9" />
              <Input placeholder="Version" value={newRow.version} onChange={e => setNewRow({ ...newRow, version: e.target.value })} className="h-9" />
              <Input placeholder="Publisher" value={newRow.publisher} onChange={e => setNewRow({ ...newRow, publisher: e.target.value })} className="h-9" />
              <Input placeholder="Description" value={newRow.description} onChange={e => setNewRow({ ...newRow, description: e.target.value })} className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addMutation.mutate()} disabled={!newRow.addon_name}><Save className="h-3.5 w-3.5 mr-1" /> Install</Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'اسم الإضافة' : 'Add-on Name'}</TableHead>
              <TableHead>{language === 'ar' ? 'الإصدار' : 'Version'}</TableHead>
              <TableHead>{language === 'ar' ? 'الناشر' : 'Publisher'}</TableHead>
              <TableHead>{language === 'ar' ? 'تاريخ التثبيت' : 'Installed'}</TableHead>
              <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : addons.length === 0 && !isAdding ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No add-ons installed</TableCell></TableRow>
            ) : addons.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{a.addon_name}</p>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{a.version}</TableCell>
                <TableCell className="text-muted-foreground">{a.publisher || '—'}</TableCell>
                <TableCell>{a.installed_date}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={a.status === 'active'} onCheckedChange={v => toggleMutation.mutate({ id: a.id, active: v })} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Settings className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
