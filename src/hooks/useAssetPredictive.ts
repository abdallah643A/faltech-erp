import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type PredictiveSignal = {
  id: string;
  equipment_id: string | null;
  asset_id: string | null;
  signal_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  detection_source: string;
  title: string;
  description: string | null;
  recommended_action: string | null;
  predicted_failure_date: string | null;
  status: string;
  detected_value: number | null;
  threshold_value: number | null;
  resolved_at: string | null;
  created_at: string;
  metadata: any;
};

export type ReplacementRoadmapItem = {
  id: string;
  equipment_id: string | null;
  asset_id: string | null;
  plan_year: number;
  decision: 'replace' | 'refurbish' | 'retain' | 'dispose';
  estimated_replacement_cost: number;
  estimated_refurbish_cost: number;
  estimated_salvage_value: number;
  annual_maintenance_cost: number;
  expected_life_extension_years: number;
  refurbish_roi: number;
  replace_roi: number;
  recommendation: string | null;
  priority: string;
  status: string;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
};

export type VendorScorecardMetric = {
  id: string;
  vendor_id: string | null;
  vendor_name: string;
  period_year: number;
  period_month: number | null;
  total_jobs: number;
  on_time_jobs: number;
  rework_jobs: number;
  avg_response_hours: number;
  avg_repair_quality: number;
  sla_compliance_pct: number;
  user_feedback_avg: number;
  total_spend: number;
  overall_score: number;
  grade: string | null;
};

export const usePredictiveSignals = (status: string = 'open') => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['predictive-signals', activeCompanyId, status],
    queryFn: async () => {
      let q = supabase.from('asset_predictive_signals' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as unknown as PredictiveSignal[];
    },
  });
};

export const usePredictiveRuns = () => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['predictive-runs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_predictive_runs' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.order('started_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
};

export const useRunPredictiveEngine = () => {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('asset-predictive-engine', {
        body: { company_id: activeCompanyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['predictive-signals'] });
      qc.invalidateQueries({ queryKey: ['predictive-runs'] });
      toast({
        title: 'Predictive scan completed',
        description: `Scanned ${data?.assets_scanned || 0} assets, created ${data?.signals_created || 0} signals`,
      });
    },
    onError: (e: any) => toast({ title: 'Scan failed', description: e.message, variant: 'destructive' }),
  });
};

export const useResolveSignal = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('asset_predictive_signals' as any)
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['predictive-signals'] });
      toast({ title: 'Signal resolved' });
    },
  });
};

export const useReplacementRoadmap = (year?: number) => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['replacement-roadmap', activeCompanyId, year],
    queryFn: async () => {
      let q = supabase.from('asset_replacement_roadmap' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (year) q = q.eq('plan_year', year);
      const { data, error } = await q.order('plan_year').order('priority');
      if (error) throw error;
      return (data || []) as unknown as ReplacementRoadmapItem[];
    },
  });
};

export const useUpsertRoadmapItem = () => {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (item: Partial<ReplacementRoadmapItem> & { plan_year: number }) => {
      // Compute ROI: replace_roi = lifetime_savings/replacement_cost; refurbish_roi = lifetime_savings/refurbish_cost
      const replaceCost = item.estimated_replacement_cost || 0;
      const refurbCost = item.estimated_refurbish_cost || 0;
      const annualMaint = item.annual_maintenance_cost || 0;
      const lifeExt = item.expected_life_extension_years || 5;
      const lifetimeSavings = annualMaint * lifeExt;
      const replace_roi = replaceCost > 0 ? (lifetimeSavings - replaceCost) / replaceCost : 0;
      const refurbish_roi = refurbCost > 0 ? (lifetimeSavings - refurbCost) / refurbCost : 0;
      const recommendation = refurbish_roi > replace_roi ? 'refurbish' : 'replace';

      const payload = {
        ...item,
        company_id: activeCompanyId,
        replace_roi,
        refurbish_roi,
        recommendation,
        created_by: user?.id,
      };
      const { error } = item.id
        ? await supabase.from('asset_replacement_roadmap' as any).update(payload as any).eq('id', item.id)
        : await supabase.from('asset_replacement_roadmap' as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['replacement-roadmap'] });
      toast({ title: 'Roadmap item saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useApproveRoadmapItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('asset_replacement_roadmap' as any)
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? user?.id : null,
          rejection_reason: approved ? null : reason,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['replacement-roadmap'] });
      toast({ title: 'Decision recorded' });
    },
  });
};

export const useVendorScorecards = (year?: number) => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['vendor-scorecards', activeCompanyId, year],
    queryFn: async () => {
      let q = supabase.from('asset_vendor_scorecard_metrics' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (year) q = q.eq('period_year', year);
      const { data, error } = await q.order('overall_score', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as unknown as VendorScorecardMetric[];
    },
  });
};

export const useUpsertVendorScorecard = () => {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (m: Partial<VendorScorecardMetric> & { vendor_name: string; period_year: number }) => {
      const totalJobs = m.total_jobs || 0;
      const onTimePct = totalJobs ? (m.on_time_jobs || 0) / totalJobs : 0;
      const reworkPenalty = totalJobs ? ((m.rework_jobs || 0) / totalJobs) * 100 : 0;
      const overall_score = Math.max(
        0,
        Math.round(
          onTimePct * 30 +
            (m.sla_compliance_pct || 0) * 0.25 +
            (m.avg_repair_quality || 0) * 5 +
            (m.user_feedback_avg || 0) * 5 -
            reworkPenalty * 0.5,
        ),
      );
      const grade =
        overall_score >= 85 ? 'A' : overall_score >= 70 ? 'B' : overall_score >= 55 ? 'C' : overall_score >= 40 ? 'D' : 'F';
      const payload = { ...m, company_id: activeCompanyId, overall_score, grade };
      const { error } = m.id
        ? await supabase.from('asset_vendor_scorecard_metrics' as any).update(payload as any).eq('id', m.id)
        : await supabase.from('asset_vendor_scorecard_metrics' as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-scorecards'] });
      toast({ title: 'Scorecard updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
