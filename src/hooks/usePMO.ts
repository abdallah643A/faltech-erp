import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

function makeListHook<T>(table: string, key: string, projectFilter = false) {
  return (projectId?: string) =>
    useQuery({
      queryKey: [key, projectId],
      queryFn: async () => {
        let q = sb.from(table).select('*').order('created_at', { ascending: false });
        if (projectFilter && projectId) q = q.eq('project_id', projectId);
        const { data, error } = await q;
        if (error) throw error;
        return data as T[];
      },
    });
}

function makeCreateHook(table: string, invalidateKeys: string[]) {
  return () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (values: any) => {
        const { data, error } = await sb.from(table).insert(values).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
        toast.success('Saved');
      },
      onError: (e: any) => toast.error(e.message),
    });
  };
}

export const usePortfolios = makeListHook<any>('pmo_portfolios', 'pmo-portfolios');
export const useCreatePortfolio = makeCreateHook('pmo_portfolios', ['pmo-portfolios']);

export const useBaselines = makeListHook<any>('pmo_baselines', 'pmo-baselines', true);
export const useCreateBaseline = makeCreateHook('pmo_baselines', ['pmo-baselines']);

export const useDependencies = makeListHook<any>('pmo_dependencies', 'pmo-deps', true);
export const useCreateDependency = makeCreateHook('pmo_dependencies', ['pmo-deps']);

export const useResourceAssignments = makeListHook<any>('pmo_resource_assignments', 'pmo-resources', true);
export const useCreateResourceAssignment = makeCreateHook('pmo_resource_assignments', ['pmo-resources']);

export const useRaidLog = makeListHook<any>('pmo_raid_log', 'pmo-raid', true);
export const useCreateRaid = makeCreateHook('pmo_raid_log', ['pmo-raid']);

export const useBudgetActuals = makeListHook<any>('pmo_budget_actuals', 'pmo-bva', true);
export const useCreateBudgetActual = makeCreateHook('pmo_budget_actuals', ['pmo-bva']);

export const useStageGates = makeListHook<any>('pmo_stage_gates', 'pmo-gates', true);
export const useCreateStageGate = makeCreateHook('pmo_stage_gates', ['pmo-gates']);

export const useHealthSnapshots = (projectId?: string) =>
  useQuery({
    queryKey: ['pmo-health', projectId],
    queryFn: async () => {
      let q = sb.from('pmo_health_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(30);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

export const useComputeHealth = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await sb.rpc('pmo_compute_health', { p_project_id: projectId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Health computed'); qc.invalidateQueries({ queryKey: ['pmo-health'] }); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useProjectsList = () =>
  useQuery({
    queryKey: ['pmo-projects-list'],
    queryFn: async () => {
      const { data, error } = await sb.from('projects').select('id, project_name, project_code, status').order('project_name').limit(200);
      if (error) return [];
      return data as any[];
    },
  });
