import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useEffect } from 'react';

// ---------- Loyalty Tiers ----------
export function useLoyaltyTiers() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-loyalty-tiers', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_loyalty_tiers' as any).select('*')
        .eq('company_id', activeCompanyId!).order('display_order'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useLoyaltyTierMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const upsert = useMutation({
    mutationFn: async (tier: any) => {
      const { error } = await (supabase.from('rest_loyalty_tiers' as any).upsert({
        company_id: activeCompanyId, ...tier,
      }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rest-loyalty-tiers'] }); toast({ title: 'Tier saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ---------- Loyalty Rewards ----------
export function useLoyaltyRewards() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-loyalty-rewards', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_loyalty_rewards' as any).select('*')
        .eq('company_id', activeCompanyId!).eq('is_active', true).order('points_cost'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useLoyaltyRewardMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const create = useMutation({
    mutationFn: async (reward: any) => {
      const { error } = await (supabase.from('rest_loyalty_rewards' as any).insert({
        company_id: activeCompanyId, ...reward,
      }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rest-loyalty-rewards'] }); toast({ title: 'Reward created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create };
}

// ---------- Loyalty Campaigns ----------
export function useLoyaltyCampaigns() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-loyalty-campaigns', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_loyalty_campaigns' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useLoyaltyCampaignMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const create = useMutation({
    mutationFn: async (camp: any) => {
      const { error } = await (supabase.from('rest_loyalty_campaigns' as any).insert({
        company_id: activeCompanyId, ...camp,
      }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rest-loyalty-campaigns'] }); toast({ title: 'Campaign created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create };
}

// ---------- Branch Benchmarks ----------
export function useBranchBenchmarks(periodStart?: string, periodEnd?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-branch-benchmarks', activeCompanyId, periodStart, periodEnd],
    queryFn: async () => {
      let q = (supabase.from('rest_branch_benchmarks' as any).select('*, rest_branches(branch_name)')
        .eq('company_id', activeCompanyId!));
      if (periodStart) q = q.gte('period_start', periodStart);
      if (periodEnd) q = q.lte('period_end', periodEnd);
      const { data, error } = await q.order('rank_in_company', { ascending: true, nullsFirst: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useComputeBenchmark() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      const { data, error } = await (supabase as any).rpc('rest_compute_branch_benchmark', {
        p_company_id: activeCompanyId, p_period_start: start, p_period_end: end,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count: any) => {
      qc.invalidateQueries({ queryKey: ['rest-branch-benchmarks'] });
      toast({ title: 'Benchmark computed', description: `${count} branches updated` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// ---------- Role Dashboards ----------
export function useRoleDashboards() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-role-dashboards', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_role_dashboards' as any).select('*')
        .eq('company_id', activeCompanyId!));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useRoleDashboardMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const upsert = useMutation({
    mutationFn: async (cfg: any) => {
      const { error } = await (supabase.from('rest_role_dashboards' as any).upsert({
        company_id: activeCompanyId, ...cfg,
      }, { onConflict: 'company_id,role_code' }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rest-role-dashboards'] }); toast({ title: 'Dashboard saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ---------- KDS Stations Status ----------
export function useKDSStationStatus(branchId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['rest-kds-stations', activeCompanyId, branchId],
    queryFn: async () => {
      let q = (supabase.from('rest_kds_station_status' as any).select('*')
        .eq('company_id', activeCompanyId!));
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q.order('station_name');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 15000,
  });
  useEffect(() => {
    if (!activeCompanyId) return;
    const ch = supabase.channel('kds-stations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rest_kds_station_status' },
        () => qc.invalidateQueries({ queryKey: ['rest-kds-stations'] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeCompanyId]);
  return query;
}

// ---------- Aggregator Webhooks ----------
export function useAggregatorWebhooks() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-agg-webhooks', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('rest_aggregator_webhooks' as any).select('*')
        .eq('company_id', activeCompanyId!).order('received_at', { ascending: false }).limit(100));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

// ---------- Recipe Variance ----------
export function useRecipeVariance(branchId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['rest-recipe-variance', activeCompanyId, branchId],
    queryFn: async () => {
      let q = (supabase.from('rest_recipe_variance' as any).select('*')
        .eq('company_id', activeCompanyId!));
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q.order('variance_cost', { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}
