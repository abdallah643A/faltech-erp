import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useDunningLevels() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: levels, isLoading } = useQuery({
    queryKey: ['dunning-levels', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('dunning_levels' as any).select('*').order('level_number') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createLevel = useMutation({
    mutationFn: async (level: any) => {
      const { data, error } = await (supabase.from('dunning_levels' as any).insert(level).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dunning-levels'] }); toast({ title: 'Dunning level created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { levels, isLoading, createLevel };
}

export function useDunningRuns() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['dunning-runs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('dunning_runs' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRun = useMutation({
    mutationFn: async (run: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const runNumber = `DUN-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('dunning_runs' as any).insert({ ...run, run_number: runNumber, created_by: user?.id }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dunning-runs'] }); toast({ title: 'Dunning run created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRun = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('dunning_runs' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dunning-runs'] }); toast({ title: 'Dunning run updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { runs, isLoading, createRun, updateRun };
}

export function useDunningLetters(runId?: string) {
  const { data: letters, isLoading } = useQuery({
    queryKey: ['dunning-letters', runId],
    queryFn: async () => {
      let q = (supabase.from('dunning_letters' as any).select('*') as any);
      if (runId) q = q.eq('dunning_run_id', runId);
      const { data, error } = await q.order('total_overdue', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return { letters, isLoading };
}
