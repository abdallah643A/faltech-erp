import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

export function useScheduleRuns() {
  const qc = useQueryClient();
  const runs = useQuery({
    queryKey: ['mfg-schedule-runs'],
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_schedule_runs').select('*').order('run_date', { ascending: false }).limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const runSchedule = useMutation({
    mutationFn: async (input: { horizon_start: string; horizon_end: string; strategy: 'forward' | 'backward'; notes?: string }) => {
      const { data, error } = await sb.rpc('mfg_run_finite_schedule', {
        p_horizon_start: input.horizon_start,
        p_horizon_end: input.horizon_end,
        p_strategy: input.strategy,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Schedule generated'); qc.invalidateQueries({ queryKey: ['mfg-schedule-runs'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { runs: runs.data, isLoading: runs.isLoading, runSchedule };
}

export function useScheduledOperations(runId?: string) {
  return useQuery({
    queryKey: ['mfg-scheduled-ops', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_scheduled_operations').select('*').eq('run_id', runId).order('scheduled_start');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSimulationScenarios() {
  const qc = useQueryClient();
  const scenarios = useQuery({
    queryKey: ['mfg-sim-scenarios'],
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_simulation_scenarios').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (input: { scenario_name: string; description?: string; base_run_id: string; capacity_multiplier: number }) => {
      const { data, error } = await sb.from('mfg_simulation_scenarios').insert({
        scenario_name: input.scenario_name,
        description: input.description,
        base_run_id: input.base_run_id,
        changes: { capacity_multiplier: input.capacity_multiplier },
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('Scenario created'); qc.invalidateQueries({ queryKey: ['mfg-sim-scenarios'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const runSimulation = useMutation({
    mutationFn: async (scenario_id: string) => {
      const { error } = await sb.rpc('mfg_run_simulation', { p_scenario_id: scenario_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Simulation complete'); qc.invalidateQueries({ queryKey: ['mfg-sim-scenarios'] }); qc.invalidateQueries({ queryKey: ['mfg-sim-results'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { scenarios: scenarios.data, isLoading: scenarios.isLoading, createScenario, runSimulation };
}

export function useSimulationResults(scenarioId?: string) {
  return useQuery({
    queryKey: ['mfg-sim-results', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await sb.from('mfg_simulation_results').select('*').eq('scenario_id', scenarioId).order('scenario_load_hours', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}
