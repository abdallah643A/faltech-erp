import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

export const useCapacityForecasts = () =>
  useQuery({
    queryKey: ['pmo-capacity'],
    queryFn: async () => {
      const { data, error } = await sb.from('pmo_capacity_forecasts').select('*').order('computed_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

export const useComputeCapacity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      const { data, error } = await sb.rpc('pmo_compute_capacity', { p_start: start, p_end: end });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => { toast.success(`Computed ${n} resource rows`); qc.invalidateQueries({ queryKey: ['pmo-capacity'] }); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useScenarios = () =>
  useQuery({
    queryKey: ['pmo-scenarios'],
    queryFn: async () => {
      const { data, error } = await sb.from('pmo_scenarios').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

export const useCreateScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await sb.from('pmo_scenarios').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Scenario created'); qc.invalidateQueries({ queryKey: ['pmo-scenarios'] }); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useScenarioAdjustments = (scenarioId?: string) =>
  useQuery({
    queryKey: ['pmo-scenario-adj', scenarioId],
    queryFn: async () => {
      if (!scenarioId) return [];
      const { data, error } = await sb.from('pmo_scenario_adjustments').select('*').eq('scenario_id', scenarioId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!scenarioId,
  });

export const useAddAdjustment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await sb.from('pmo_scenario_adjustments').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v: any) => { toast.success('Adjustment added'); qc.invalidateQueries({ queryKey: ['pmo-scenario-adj', v.scenario_id] }); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useApplyScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const { data, error } = await sb.rpc('pmo_apply_scenario', { p_scenario_id: scenarioId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Scenario computed'); qc.invalidateQueries({ queryKey: ['pmo-scenarios'] }); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useNarratives = (projectId?: string) =>
  useQuery({
    queryKey: ['pmo-narratives', projectId],
    queryFn: async () => {
      let q = sb.from('pmo_health_narratives').select('*').order('generated_at', { ascending: false }).limit(50);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

export const useSaveNarrative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await sb.from('pmo_health_narratives').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Narrative saved'); qc.invalidateQueries({ queryKey: ['pmo-narratives'] }); },
    onError: (e: any) => toast.error(e.message),
  });
};
