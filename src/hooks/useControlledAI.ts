import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CopilotCapability, CopilotModule, CopilotSuggestion } from '@/hooks/useAICopilot';

export type ControlledAIModule = Exclude<CopilotModule, 'executive'>;
export type ControlledAICapability = CopilotCapability | 'decision_support';
export type ControlledAIStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'executed' | 'superseded';

export const CONTROLLED_AI_MODULES: { value: ControlledAIModule; label: string }[] = [
  { value: 'finance', label: 'Finance' },
  { value: 'crm', label: 'CRM' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'cpms', label: 'CPMS' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'hr', label: 'HR' },
];

export const CONTROLLED_AI_CAPABILITIES: { value: ControlledAICapability; label: string }[] = [
  { value: 'anomaly', label: 'Anomaly detection' },
  { value: 'forecast', label: 'Forecasting' },
  { value: 'narrative', label: 'Narrative reporting' },
  { value: 'next_best_action', label: 'Next best action' },
  { value: 'decision_support', label: 'Decision support' },
];

export interface ForecastRun {
  id: string;
  module: ControlledAIModule;
  forecast_name: string;
  confidence: number | null;
  explanation: string | null;
  forecast_output: Record<string, any>;
  assumptions: Record<string, any>;
  status: ControlledAIStatus;
  created_at: string;
}

export interface NarrativeReport {
  id: string;
  module: ControlledAIModule;
  report_name: string;
  narrative: string;
  highlights: any[];
  risks: any[];
  recommendations: any[];
  evidence: Record<string, any>;
  confidence: number | null;
  status: ControlledAIStatus;
  created_at: string;
}

export interface DecisionCase {
  id: string;
  module: ControlledAIModule;
  case_title: string;
  case_type: string;
  options: any[];
  recommendation: Record<string, any>;
  evidence: Record<string, any>;
  risk_level: string;
  confidence: number | null;
  draft_payload: Record<string, any>;
  status: ControlledAIStatus;
  created_at: string;
}

interface GenerateControlledVars {
  module: ControlledAIModule;
  capability: ControlledAICapability;
  prompt?: string;
  context?: Record<string, any>;
}

const scopedQueryKey = (name: string, companyId?: string | null) => [name, companyId ?? 'all'];

export function useControlledAI() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const suggestions = useQuery({
    queryKey: scopedQueryKey('controlled-ai-suggestions', activeCompanyId),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ai_copilot_suggestions' as any) as any)
        .select('*')
        .eq('company_id', activeCompanyId)
        .in('module', CONTROLLED_AI_MODULES.map((m) => m.value))
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CopilotSuggestion[];
    },
  });

  const forecasts = useQuery({
    queryKey: scopedQueryKey('controlled-ai-forecasts', activeCompanyId),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ai_forecast_runs' as any) as any)
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ForecastRun[];
    },
  });

  const narratives = useQuery({
    queryKey: scopedQueryKey('controlled-ai-narratives', activeCompanyId),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ai_narrative_reports' as any) as any)
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as NarrativeReport[];
    },
  });

  const decisions = useQuery({
    queryKey: scopedQueryKey('controlled-ai-decisions', activeCompanyId),
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('ai_decision_support_cases' as any) as any)
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as DecisionCase[];
    },
  });

  const permissions = useQuery({
    queryKey: ['controlled-ai-permissions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ai_copilot_permissions' as any) as any)
        .select('*')
        .in('module', CONTROLLED_AI_MODULES.map((m) => m.value));
      if (error) throw error;
      return data ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async (vars: GenerateControlledVars) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data, error } = await supabase.functions.invoke('ai-copilot-router', {
        body: {
          ...vars,
          company_id: activeCompanyId,
          context: {
            requested_by: user?.id,
            governance: 'single_approval_required_before_live_effect',
            auto_create_drafts: true,
            ...(vars.context ?? {}),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { run_id: string; count: number };
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('AI draft queued for review');
    },
    onError: (e: any) => toast.error(e.message ?? 'AI generation failed'),
  });

  const reviewSuggestion = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) => {
      const { error } = await (supabase.from('ai_copilot_suggestions' as any) as any)
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
        .eq('id', id);
      if (error) throw error;
      await (supabase.from('ai_copilot_audit_log' as any) as any).insert({
        suggestion_id: id,
        company_id: activeCompanyId,
        event: status,
        actor_id: user?.id,
        payload: { notes: notes ?? null, single_approval: true },
      });
    },
    onSuccess: () => { invalidateAll(); toast.success('Review saved'); },
    onError: (e: any) => toast.error(e.message ?? 'Review failed'),
  });

  const reviewRecord = useMutation({
    mutationFn: async ({ table, id, status, notes }: { table: 'ai_forecast_runs' | 'ai_narrative_reports' | 'ai_decision_support_cases'; id: string; status: ControlledAIStatus; notes?: string }) => {
      const { error } = await (supabase.from(table as any) as any)
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
        .eq('id', id);
      if (error) throw error;
      await (supabase.from('ai_copilot_audit_log' as any) as any).insert({
        company_id: activeCompanyId,
        event: `review_${table}`,
        actor_id: user?.id,
        payload: { id, status, notes: notes ?? null },
      });
    },
    onSuccess: () => { invalidateAll(); toast.success('Review saved'); },
    onError: (e: any) => toast.error(e.message ?? 'Review failed'),
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: scopedQueryKey('controlled-ai-suggestions', activeCompanyId) });
    qc.invalidateQueries({ queryKey: scopedQueryKey('controlled-ai-forecasts', activeCompanyId) });
    qc.invalidateQueries({ queryKey: scopedQueryKey('controlled-ai-narratives', activeCompanyId) });
    qc.invalidateQueries({ queryKey: scopedQueryKey('controlled-ai-decisions', activeCompanyId) });
  }

  const metrics = useMemo(() => {
    const allSuggestions = suggestions.data ?? [];
    const reviewRecords = [...(forecasts.data ?? []), ...(narratives.data ?? []), ...(decisions.data ?? [])];
    const pendingSuggestions = allSuggestions.filter((s) => s.status === 'pending').length;
    const pendingRecords = reviewRecords.filter((r) => r.status === 'pending_review').length;
    return {
      generated: allSuggestions.length + reviewRecords.length,
      pending: pendingSuggestions + pendingRecords,
      approved: allSuggestions.filter((s) => s.status === 'approved').length + reviewRecords.filter((r) => r.status === 'approved').length,
      highRisk: allSuggestions.filter((s) => s.risk_level === 'high').length + (decisions.data ?? []).filter((d) => d.risk_level === 'high').length,
    };
  }, [suggestions.data, forecasts.data, narratives.data, decisions.data]);

  return { suggestions, forecasts, narratives, decisions, permissions, generate, reviewSuggestion, reviewRecord, metrics };
}
