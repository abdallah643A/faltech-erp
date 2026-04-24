import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useProjectControlAlerts(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const alerts = useQuery({
    queryKey: ['project-control-alerts', projectId],
    queryFn: async () => {
      let q = supabase.from('project_control_alerts' as any).select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId) as any;
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createAlert = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('project_control_alerts' as any).insert(data) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-control-alerts'] }),
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('project_control_alerts' as any).update({
        status: 'acknowledged', acknowledged_by: user?.id, acknowledged_at: new Date().toISOString()
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-control-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('project_control_alerts' as any).update({
        status: 'resolved', resolved_by: user?.id, resolved_at: new Date().toISOString()
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-control-alerts'] });
      toast({ title: 'Alert resolved' });
    },
  });

  return { alerts, createAlert, acknowledgeAlert, resolveAlert };
}

export function useThresholds(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const thresholds = useQuery({
    queryKey: ['project-thresholds', projectId],
    queryFn: async () => {
      let q = supabase.from('project_control_thresholds' as any).select('*');
      if (projectId) q = q.or(`project_id.eq.${projectId},is_global.eq.true`) as any;
      else q = q.eq('is_global', true) as any;
      const { data, error } = await (q as any);
      if (error) throw error;
      return (data as any[])?.[0] || {
        cpi_warning: 0.95, cpi_critical: 0.85,
        spi_warning: 0.95, spi_critical: 0.85,
        budget_variance_warning: 5, budget_variance_critical: 10,
      };
    },
  });

  const saveThresholds = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('project_control_thresholds' as any).upsert(data) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-thresholds'] });
      toast({ title: 'Thresholds saved' });
    },
  });

  return { thresholds, saveThresholds };
}

export function useVarianceExplanations(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const explanations = useQuery({
    queryKey: ['variance-explanations', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('variance_explanations' as any)
        .select('*').eq('project_id', projectId!).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addExplanation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('variance_explanations' as any).insert({
        ...data, submitted_by: user?.id
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variance-explanations'] });
      toast({ title: 'Variance explanation submitted' });
    },
  });

  return { explanations, addExplanation };
}

export function useProjectBaselines(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const baselines = useQuery({
    queryKey: ['project-baselines', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('project_baselines' as any)
        .select('*').eq('project_id', projectId!).order('baseline_number') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createBaseline = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('project_baselines' as any).insert({
        ...data, created_by: user?.id
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-baselines'] });
      toast({ title: 'Baseline created' });
    },
  });

  return { baselines, createBaseline };
}

export function useBudgetTransfers(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const transfers = useQuery({
    queryKey: ['budget-transfers', projectId],
    queryFn: async () => {
      let q = supabase.from('budget_transfers' as any).select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId) as any;
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('budget_transfers' as any).insert({
        ...data,
        transfer_number: `BT-${Date.now().toString().slice(-6)}`,
        requested_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transfers'] });
      toast({ title: 'Budget transfer requested' });
    },
  });

  const approveTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('budget_transfers' as any).update({
        status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString()
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transfers'] });
      toast({ title: 'Transfer approved' });
    },
  });

  const rejectTransfer = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await (supabase.from('budget_transfers' as any).update({
        status: 'rejected', rejection_reason: reason, approved_by: user?.id, approved_at: new Date().toISOString()
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-transfers'] });
      toast({ title: 'Transfer rejected' });
    },
  });

  return { transfers, createTransfer, approveTransfer, rejectTransfer };
}

export function useContingencyReserves(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const reserves = useQuery({
    queryKey: ['contingency-reserves', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('contingency_reserves' as any)
        .select('*').eq('project_id', projectId!) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const releases = useQuery({
    queryKey: ['contingency-releases', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('contingency_releases' as any)
        .select('*').eq('project_id', projectId!).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createReserve = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('contingency_reserves' as any).insert({
        ...data, current_amount: data.original_amount, created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contingency-reserves'] });
      toast({ title: 'Reserve created' });
    },
  });

  const requestRelease = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('contingency_releases' as any).insert({
        ...data, created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contingency-releases'] });
      toast({ title: 'Release requested' });
    },
  });

  const approveRelease = useMutation({
    mutationFn: async (releaseId: string) => {
      const { data: release } = await (supabase.from('contingency_releases' as any)
        .select('*').eq('id', releaseId).single() as any);
      if (!release) throw new Error('Release not found');
      
      await (supabase.from('contingency_releases' as any).update({
        status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString()
      }).eq('id', releaseId) as any);

      const { data: reserve } = await (supabase.from('contingency_reserves' as any)
        .select('*').eq('id', release.reserve_id).single() as any);
      if (reserve) {
        await (supabase.from('contingency_reserves' as any).update({
          current_amount: reserve.current_amount - release.amount,
          released_amount: reserve.released_amount + release.amount,
        }).eq('id', reserve.id) as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contingency-reserves'] });
      qc.invalidateQueries({ queryKey: ['contingency-releases'] });
      toast({ title: 'Release approved' });
    },
  });

  return { reserves, releases, createReserve, requestRelease, approveRelease };
}

export function useFinancialCommitments(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const commitments = useQuery({
    queryKey: ['financial-commitments', projectId],
    queryFn: async () => {
      let q = supabase.from('financial_commitments' as any).select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId) as any;
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addCommitment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('financial_commitments' as any).insert({
        ...data, created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-commitments'] });
      toast({ title: 'Commitment tracked' });
    },
  });

  const updateCommitment = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('financial_commitments' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-commitments'] });
      toast({ title: 'Commitment updated' });
    },
  });

  return { commitments, addCommitment, updateCommitment };
}

export function useFinancialScenarios(projectId?: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const scenarios = useQuery({
    queryKey: ['financial-scenarios', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('financial_scenarios' as any)
        .select('*').eq('project_id', projectId!).order('scenario_name') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('financial_scenarios' as any).insert({
        ...data, created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-scenarios'] });
      toast({ title: 'Scenario created' });
    },
  });

  const updateScenario = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('financial_scenarios' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-scenarios'] });
      toast({ title: 'Scenario updated' });
    },
  });

  return { scenarios, createScenario, updateScenario };
}

// RAG status calculation helper
export function calculateRAG(cpi: number, spi: number, thresholds: any) {
  const cpw = thresholds?.cpi_warning ?? 0.95;
  const cpc = thresholds?.cpi_critical ?? 0.85;
  const spw = thresholds?.spi_warning ?? 0.95;
  const spc = thresholds?.spi_critical ?? 0.85;

  if (cpi < cpc || spi < spc) return 'red';
  if (cpi < cpw || spi < spw) return 'amber';
  return 'green';
}
