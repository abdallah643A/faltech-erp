import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, X, Key, Users, Calendar, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface License {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  license_type: string;
  assigned_date: string;
  last_login: string | null;
}

const LICENSE_TYPES = ['Professional', 'Limited', 'CRM', 'Starter'];

export default function LicenseAdministration() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { users } = useUsers();
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({ user_id: '', license_type: 'Professional' });

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['admin-licenses', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_licenses').select('*').eq('company_id', activeCompanyId!).order('assigned_date', { ascending: false });
      if (error) throw error;
      return data as License[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const user = users.find(u => u.user_id === newRow.user_id);
      const { error } = await (supabase as any).from('admin_licenses').insert({
        user_id: newRow.user_id,
        user_name: user?.full_name || '',
        user_email: user?.email || '',
        license_type: newRow.license_type,
        company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      setIsAdding(false);
      setNewRow({ user_id: '', license_type: 'Professional' });
      toast.success('License allocated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('admin_licenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
      toast.success('License removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const typeCounts = LICENSE_TYPES.reduce((acc, t) => {
    acc[t] = licenses.filter(l => l.license_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-6 w-6" />
            {language === 'ar' ? 'إدارة التراخيص' : 'License Administration'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة تخصيص التراخيص للمستخدمين' : 'Manage user license allocations'}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'تخصيص ترخيص' : 'Allocate License'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {LICENSE_TYPES.map(t => (
          <Card key={t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{t}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{typeCounts[t] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* License Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
              <TableHead>{language === 'ar' ? 'البريد' : 'Email'}</TableHead>
              <TableHead>{language === 'ar' ? 'نوع الترخيص' : 'License Type'}</TableHead>
              <TableHead>{language === 'ar' ? 'تاريخ التخصيص' : 'Assigned Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'آخر دخول' : 'Last Login'}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell colSpan={2}>
                  <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={newRow.user_id} onChange={e => setNewRow({ ...newRow, user_id: e.target.value })}>
                    <option value="">— Select User —</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
                  </select>
                </TableCell>
                <TableCell>
                  <select className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={newRow.license_type} onChange={e => setNewRow({ ...newRow, license_type: e.target.value })}>
                    {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addMutation.mutate()} disabled={!newRow.user_id}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : licenses.length === 0 && !isAdding ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No licenses allocated</TableCell></TableRow>
            ) : licenses.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.user_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{l.user_email || '—'}</TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{l.license_type}</span>
                </TableCell>
                <TableCell>{l.assigned_date}</TableCell>
                <TableCell className="text-muted-foreground">{l.last_login ? new Date(l.last_login).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(l.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
