import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CopilotModule = 'crm' | 'finance' | 'procurement' | 'cpms' | 'inventory' | 'hr' | 'executive';
export type CopilotCapability = 'next_best_action' | 'anomaly' | 'forecast' | 'narrative' | 'decision_support';

export interface CopilotSuggestion {
  id: string;
  run_id: string | null;
  company_id: string | null;
  module: CopilotModule;
  capability: CopilotCapability;
  title: string;
  summary: string;
  explanation: string;
  evidence: Record<string, any>;
  recommended_action: Record<string, any> | null;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  draft_payload?: Record<string, any>;
  draft_entity_type?: string | null;
  draft_entity_id?: string | null;
  requires_review?: boolean;
  approved_for_execution?: boolean;
  permission_scope?: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_at: string | null;
  created_at: string;
}

interface GenerateVars {
  module: CopilotModule;
  capability: CopilotCapability;
  context?: Record<string, any>;
  prompt?: string;
}

/**
 * useAICopilot
 * --------------------------------
 * Single hook governing every copilot interaction across modules:
 *  - generate(): invokes ai-copilot edge function, queues suggestions
 *  - suggestions: pending queue scoped to the active company + module
 *  - review(): approve/reject with notes (writes audit row)
 *  - execute(): mark a suggestion executed (the consumer is responsible
 *    for the actual side-effect; this hook just records the commitment).
 */
export function useAICopilot(module?: CopilotModule) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const suggestions = useQuery({
    queryKey: ['copilot-suggestions', activeCompanyId, module ?? 'all'],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = (supabase.from('ai_copilot_suggestions' as any) as any)
        .select('*').eq('company_id', activeCompanyId).order('created_at', { ascending: false }).limit(100);
      if (module) q = q.eq('module', module);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CopilotSuggestion[];
    },
  });

  const generate = useMutation({
    mutationFn: async (vars: GenerateVars) => {
      const { data, error } = await supabase.functions.invoke('ai-copilot-router', {
        body: { ...vars, company_id: activeCompanyId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { run_id: string; suggestions: CopilotSuggestion[]; count: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['copilot-suggestions', activeCompanyId] });
      toast.success(`Generated ${d.count} suggestion${d.count === 1 ? '' : 's'}`);
    },
    onError: (e: any) => toast.error(e.message ?? 'Copilot failed'),
  });

  const review = useMutation({
    mutationFn: async (vars: { id: string; status: 'approved' | 'rejected'; notes?: string }) => {
      const { error } = await (supabase.from('ai_copilot_suggestions' as any) as any)
        .update({
          status: vars.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: vars.notes ?? null,
        }).eq('id', vars.id);
      if (error) throw error;
      await (supabase.from('ai_copilot_audit_log' as any) as any).insert({
        suggestion_id: vars.id, company_id: activeCompanyId,
        event: vars.status, actor_id: user?.id, payload: { notes: vars.notes ?? null },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['copilot-suggestions', activeCompanyId] });
      toast.success(vars.status === 'approved' ? 'Suggestion approved' : 'Suggestion rejected');
    },
    onError: (e: any) => toast.error(e.message ?? 'Review failed'),
  });

  const execute = useMutation({
    mutationFn: async (vars: { id: string; result?: Record<string, any> }) => {
      const { error } = await (supabase.from('ai_copilot_suggestions' as any) as any)
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_result: vars.result ?? {},
        }).eq('id', vars.id);
      if (error) throw error;
      await (supabase.from('ai_copilot_audit_log' as any) as any).insert({
        suggestion_id: vars.id, company_id: activeCompanyId,
        event: 'executed', actor_id: user?.id, payload: vars.result ?? {},
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['copilot-suggestions', activeCompanyId] });
      toast.success('Action executed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Execution failed'),
  });

  return { suggestions, generate, review, execute };
}
