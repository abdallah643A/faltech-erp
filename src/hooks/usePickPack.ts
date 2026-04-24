import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function usePickLists() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: pickLists, isLoading } = useQuery({
    queryKey: ['pick-lists', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('pick_lists' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createPickList = useMutation({
    mutationFn: async (pl: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const pickNumber = `PK-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('pick_lists' as any).insert({ ...pl, pick_number: pickNumber, created_by: user?.id }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pick-lists'] }); toast({ title: 'Pick list created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updatePickList = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('pick_lists' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pick-lists'] }); toast({ title: 'Pick list updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { pickLists, isLoading, createPickList, updatePickList };
}

export function usePickListLines(pickListId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: lines, isLoading } = useQuery({
    queryKey: ['pick-list-lines', pickListId],
    queryFn: async () => {
      if (!pickListId) return [];
      const { data, error } = await (supabase.from('pick_list_lines' as any).select('*').eq('pick_list_id', pickListId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!pickListId,
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('pick_list_lines' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pick-list-lines'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { lines, isLoading, updateLine };
}
