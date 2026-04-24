import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { AdvancedCriterion, AdvancedRule, RuleAccount } from '@/services/sapPostingEngine';

export function useGLAdvancedRules() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Criteria
  const { data: criteria = [], isLoading: criteriaLoading } = useQuery({
    queryKey: ['gl-criteria'],
    queryFn: async () => {
      const { data } = await (supabase.from('gl_advanced_criteria' as any).select('*') as any)
        .order('priority_order');
      return (data || []) as AdvancedCriterion[];
    },
  });

  const updateCriterion = useMutation({
    mutationFn: async (input: { id: string; is_active?: boolean; priority_order?: number }) => {
      const { error } = await (supabase.from('gl_advanced_criteria' as any).update(input) as any).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gl-criteria'] }),
  });

  // Rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['gl-advanced-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('gl_advanced_rules' as any).select('*') as any)
        .order('priority', { ascending: true });
      if (activeCompanyId) q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data as AdvancedRule[];
    },
  });

  const getRuleAccounts = async (ruleId: string): Promise<RuleAccount[]> => {
    const { data } = await supabase
      .from('gl_advanced_rule_accounts' as any)
      .select('*')
      .eq('rule_id', ruleId);
    return (data || []) as any[];
  };

  const createRule = useMutation({
    mutationFn: async (input: { rule: Partial<AdvancedRule>; accounts: RuleAccount[] }) => {
      const { data: rule, error } = await (supabase.from('gl_advanced_rules' as any).insert({
        ...input.rule,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any).select().single();
      if (error) throw error;

      if (input.accounts.length > 0) {
        const accts = input.accounts.map(a => ({ ...a, rule_id: (rule as any).id }));
        await supabase.from('gl_advanced_rule_accounts' as any).insert(accts as any);
      }
      return rule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gl-advanced-rules'] });
      toast({ title: 'Rule Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async (input: { id: string; rule: Partial<AdvancedRule>; accounts: RuleAccount[] }) => {
      const { error } = await (supabase.from('gl_advanced_rules' as any).update(input.rule) as any).eq('id', input.id);
      if (error) throw error;

      await supabase.from('gl_advanced_rule_accounts' as any).delete().eq('rule_id', input.id);
      if (input.accounts.length > 0) {
        const accts = input.accounts.map(a => ({ ...a, rule_id: input.id }));
        await supabase.from('gl_advanced_rule_accounts' as any).insert(accts as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gl-advanced-rules'] });
      toast({ title: 'Rule Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gl_advanced_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gl-advanced-rules'] });
      toast({ title: 'Rule Deleted' });
    },
  });

  // Posting logs
  const { data: postingLogs = [] } = useQuery({
    queryKey: ['gl-posting-logs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('gl_posting_log' as any).select('*') as any)
        .order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const getPostingLogLines = async (logId: string) => {
    const { data } = await supabase
      .from('gl_posting_log_lines' as any)
      .select('*')
      .eq('log_id', logId)
      .order('line_order');
    return data || [];
  };

  return {
    criteria, criteriaLoading, updateCriterion,
    rules, rulesLoading, getRuleAccounts,
    createRule, updateRule, deleteRule,
    postingLogs, getPostingLogLines,
  };
}
