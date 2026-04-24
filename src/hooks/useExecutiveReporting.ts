import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * useExecutiveReporting
 * --------------------------------
 * Centralized hook for the Executive Reporting suite:
 *  - Cross-company KPI snapshots & drilldowns
 *  - Board pack registry + generation trigger
 *  - Management decision log
 *  - Strategic goals + progress
 *  - Risk register + actions
 *  - Document expiry watchlist
 *  - Scheduled email/WhatsApp summaries
 *  - Role-based widget configs
 *  - AI narrative insights
 */
export function useExecutiveReporting() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const ck = (k: string) => [k, activeCompanyId];

  // -------- KPI snapshots --------
  const kpiSnapshots = useQuery({
    queryKey: ck('exec-kpis'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_kpi_snapshots' as any) as any)
        .select('*').order('period_start', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const computeKpiSnapshot = useMutation({
    mutationFn: async (vars: { period_start: string; period_end: string }) => {
      const { data, error } = await (supabase.rpc as any)('exec_compute_kpi_snapshot', {
        p_company_id: activeCompanyId, p_period_start: vars.period_start, p_period_end: vars.period_end,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-kpis') }); toast.success('KPI snapshot computed'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  // -------- Board packs --------
  const boardPacks = useQuery({
    queryKey: ck('exec-board-packs'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_board_packs' as any) as any)
        .select('*').order('period_end', { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const generateBoardPack = useMutation({
    mutationFn: async (vars: { title: string; period_start: string; period_end: string; sections?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('exec-generate-board-pack', {
        body: { company_id: activeCompanyId, ...vars },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-board-packs') }); toast.success('Board pack generated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed to generate'),
  });

  // -------- Decision log --------
  const decisions = useQuery({
    queryKey: ck('exec-decisions'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_decision_log' as any) as any)
        .select('*').order('decision_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertDecision = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, company_id: activeCompanyId, created_by: row.id ? undefined : user?.id };
      const { error } = await (supabase.from('exec_decision_log' as any) as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-decisions') }); toast.success('Decision saved'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const deleteDecision = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('exec_decision_log' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-decisions') }); toast.success('Deleted'); },
  });

  // -------- Strategic goals --------
  const goals = useQuery({
    queryKey: ck('exec-goals'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_strategic_goals' as any) as any)
        .select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertGoal = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, company_id: activeCompanyId, created_by: row.id ? undefined : user?.id };
      const { error } = await (supabase.from('exec_strategic_goals' as any) as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-goals') }); toast.success('Goal saved'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const recordGoalProgress = useMutation({
    mutationFn: async (vars: { goal_id: string; value: number; status?: string; comment?: string }) => {
      const { error: insErr } = await (supabase.from('exec_goal_progress' as any) as any).insert({
        ...vars, recorded_by: user?.id,
      });
      if (insErr) throw insErr;
      const { error: updErr } = await (supabase.from('exec_strategic_goals' as any) as any)
        .update({ current_value: vars.value, status: vars.status }).eq('id', vars.goal_id);
      if (updErr) throw updErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-goals') }); toast.success('Progress recorded'); },
  });

  // -------- Risk register --------
  const risks = useQuery({
    queryKey: ck('exec-risks'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_risk_register' as any) as any)
        .select('*').order('inherent_score', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertRisk = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, company_id: activeCompanyId, created_by: row.id ? undefined : user?.id };
      const { error } = await (supabase.from('exec_risk_register' as any) as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-risks') }); toast.success('Risk saved'); },
  });

  const transitionRiskStatus = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const patch: any = { status: vars.status };
      if (vars.status === 'closed') patch.closed_date = new Date().toISOString().slice(0, 10);
      const { error } = await (supabase.from('exec_risk_register' as any) as any).update(patch).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-risks') }); toast.success('Status updated'); },
  });

  // -------- Document expiry --------
  const docExpiry = useQuery({
    queryKey: ck('exec-doc-expiry'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_document_expiry_watch' as any) as any)
        .select('*').order('expiry_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const refreshDocExpiry = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('exec_refresh_document_expiry', {
        p_company_id: activeCompanyId, p_horizon_days: 90,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-doc-expiry') }); toast.success('Watchlist refreshed'); },
  });

  // -------- Schedules --------
  const schedules = useQuery({
    queryKey: ck('exec-schedules'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_summary_schedules' as any) as any)
        .select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertSchedule = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, company_id: activeCompanyId, created_by: row.id ? undefined : user?.id };
      const { error } = await (supabase.from('exec_summary_schedules' as any) as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-schedules') }); toast.success('Schedule saved'); },
  });

  // -------- Role-based widgets --------
  const widgetConfigs = useQuery({
    queryKey: ck('exec-widget-configs'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_role_widget_configs' as any) as any)
        .select('*').order('display_order');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertWidgetConfig = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await (supabase.from('exec_role_widget_configs' as any) as any)
        .upsert({ ...row, company_id: activeCompanyId }, { onConflict: 'company_id,role,widget_key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ck('exec-widget-configs') }),
  });

  // -------- AI narrative insights --------
  const aiInsights = useQuery({
    queryKey: ck('exec-ai-insights'),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('exec_ai_insights' as any) as any)
        .select('*').order('generated_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const generateInsight = useMutation({
    mutationFn: async (vars: { insight_type: string; scope?: string; context?: any }) => {
      const { data, error } = await supabase.functions.invoke('exec-generate-insight', {
        body: { company_id: activeCompanyId, ...vars },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ck('exec-ai-insights') }); toast.success('Insight generated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return {
    kpiSnapshots, computeKpiSnapshot,
    boardPacks, generateBoardPack,
    decisions, upsertDecision, deleteDecision,
    goals, upsertGoal, recordGoalProgress,
    risks, upsertRisk, transitionRiskStatus,
    docExpiry, refreshDocExpiry,
    schedules, upsertSchedule,
    widgetConfigs, upsertWidgetConfig,
    aiInsights, generateInsight,
  };
}
