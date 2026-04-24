import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, ListChecks, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

interface WorkItem {
  id: string;
  task_type: string;
  related_doc_type: string | null;
  related_doc_id: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  title: string;
  description: string | null;
}

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in_progress', 'done'];

export default function WorkList() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { users } = useUsers();
  const [isAdding, setIsAdding] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ title: '', priority: 'medium', assigned_to: '', assigned_to_name: '', due_date: '', description: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-work-items', activeCompanyId, filterStatus, filterAssigned],
    queryFn: async () => {
      let q = (supabase as any).from('admin_work_items').select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false });
      if (filterStatus) q = q.eq('status', filterStatus);
      if (filterAssigned) q = q.eq('assigned_to', filterAssigned);
      const { data, error } = await q;
      if (error) throw error;
      return data as WorkItem[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const user = users.find(u => u.user_id === newRow.assigned_to);
      const { error } = await (supabase as any).from('admin_work_items').insert({
        title: newRow.title,
        priority: newRow.priority,
        assigned_to: newRow.assigned_to || null,
        assigned_to_name: user?.full_name || null,
        due_date: newRow.due_date || null,
        description: newRow.description || null,
        company_id: activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-work-items'] });
      setIsAdding(false);
      setNewRow({ title: '', priority: 'medium', assigned_to: '', assigned_to_name: '', due_date: '', description: '' });
      toast.success('Task created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('admin_work_items').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-work-items'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('admin_work_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-work-items'] });
      setSelectedId(null);
      toast.success('Task deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-destructive/10 text-destructive';
    if (p === 'medium') return 'bg-yellow-500/10 text-yellow-700';
    return 'bg-muted text-muted-foreground';
  };

  const statusColor = (s: string) => {
    if (s === 'done') return 'bg-green-500/10 text-green-700';
    if (s === 'in_progress') return 'bg-blue-500/10 text-blue-700';
    return 'bg-muted text-muted-foreground';
  };

  const selected = items.find(i => i.id === selectedId);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListChecks className="h-6 w-6" />
            {language === 'ar' ? 'قائمة العمل والمتابعة' : 'Work List & Tracking'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'متابعة المهام والأعمال' : 'Track tasks and work items'}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'مهمة جديدة' : 'New Task'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select className="block w-36 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Assigned To</label>
          <select className="block w-48 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
            <option value="">All</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card">
          {isAdding && (
            <div className="p-4 border-b bg-muted/30 space-y-3">
              <Input placeholder="Task title" value={newRow.title} onChange={e => setNewRow({ ...newRow, title: e.target.value })} className="h-9" />
              <div className="grid grid-cols-3 gap-3">
                <select className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={newRow.priority} onChange={e => setNewRow({ ...newRow, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={newRow.assigned_to} onChange={e => setNewRow({ ...newRow, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
                </select>
                <Input type="date" value={newRow.due_date} onChange={e => setNewRow({ ...newRow, due_date: e.target.value })} className="h-8" />
              </div>
              <Input placeholder="Description (optional)" value={newRow.description} onChange={e => setNewRow({ ...newRow, description: e.target.value })} className="h-9" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addMutation.mutate()} disabled={!newRow.title}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'المهمة' : 'Task'}</TableHead>
                <TableHead>{language === 'ar' ? 'مسند إلى' : 'Assigned To'}</TableHead>
                <TableHead>{language === 'ar' ? 'الاستحقاق' : 'Due Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items.length === 0 && !isAdding ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No work items</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className={selectedId === item.id ? 'bg-accent' : 'cursor-pointer'} onClick={() => setSelectedId(item.id)}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground">{item.assigned_to_name || '—'}</TableCell>
                  <TableCell>{item.due_date || '—'}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityColor(item.priority)}`}>{item.priority}</span></TableCell>
                  <TableCell>
                    <select className={`text-xs px-2 py-0.5 rounded capitalize border-0 ${statusColor(item.status)}`}
                      value={item.status} onClick={e => e.stopPropagation()}
                      onChange={e => updateStatusMutation.mutate({ id: item.id, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Detail Panel */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          {selected ? (
            <>
              <h3 className="font-semibold text-lg">{selected.title}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{selected.assigned_to_name || 'Unassigned'}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{selected.due_date || 'No due date'}</span></div>
                <div><span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityColor(selected.priority)}`}>{selected.priority}</span></div>
                <div><span className={`text-xs px-2 py-0.5 rounded capitalize ${statusColor(selected.status)}`}>{selected.status.replace('_', ' ')}</span></div>
                {selected.description && <div className="pt-2 border-t"><p className="text-muted-foreground">{selected.description}</p></div>}
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{language === 'ar' ? 'اختر مهمة لعرض التفاصيل' : 'Select a task to view details'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
