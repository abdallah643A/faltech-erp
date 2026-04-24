import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useStoreTasks(filters?: { category?: string; shift?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['store-tasks', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_store_tasks').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.category && filters.category !== 'all') q = q.eq('checklist_category', filters.category);
      if (filters?.shift && filters.shift !== 'all') q = q.eq('shift', filters.shift);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id } as any;
      const { error } = await supabase.from('pos_store_tasks').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-tasks'] }); toast({ title: 'Task created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pos_store_tasks').update({
        is_completed: true, completed_at: new Date().toISOString(), completed_by: user?.id,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-tasks'] }); toast({ title: 'Task completed' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.is_completed).length,
    pending: tasks.filter(t => !t.is_completed).length,
    completionRate: tasks.length ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0,
  };

  return { tasks, isLoading, stats, createTask, completeTask };
}
