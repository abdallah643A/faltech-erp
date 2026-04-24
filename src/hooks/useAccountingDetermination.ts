import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import type { AcctRule, AcctRuleLine, AcctRuleCondition } from '@/services/postingEngine';

export function useAccountingDetermination() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['acct-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('acct_determination_rules' as any).select('*') as any)
        .order('document_type').order('priority', { ascending: true });
      if (activeCompanyId) q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data as AcctRule[];
    },
  });

  const getRuleLines = async (ruleId: string): Promise<AcctRuleLine[]> => {
    const { data } = await supabase
      .from('acct_determination_lines' as any)
      .select('*')
      .eq('rule_id', ruleId)
      .order('line_order');
    return (data || []) as any[];
  };

  const getRuleConditions = async (ruleId: string): Promise<AcctRuleCondition[]> => {
    const { data } = await supabase
      .from('acct_determination_conditions' as any)
      .select('*')
      .eq('rule_id', ruleId);
    return (data || []) as any[];
  };

  const createRule = useMutation({
    mutationFn: async (input: { rule: Partial<AcctRule>; lines: Partial<AcctRuleLine>[]; conditions: Partial<AcctRuleCondition>[] }) => {
      const { data: rule, error } = await (supabase.from('acct_determination_rules' as any).insert({
        ...input.rule,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any).select().single();
      if (error) throw error;

      if (input.lines.length > 0) {
        const lines = input.lines.map((l, i) => ({ ...l, rule_id: rule.id, line_order: i + 1 }));
        const { error: le } = await supabase.from('acct_determination_lines' as any).insert(lines as any);
        if (le) throw le;
      }

      if (input.conditions.length > 0) {
        const conds = input.conditions.map(c => ({ ...c, rule_id: rule.id }));
        const { error: ce } = await supabase.from('acct_determination_conditions' as any).insert(conds as any);
        if (ce) throw ce;
      }

      // Audit log
      await supabase.from('acct_rule_audit_log' as any).insert({
        rule_id: rule.id, action: 'created', new_values: rule,
        changed_by: user?.id, changed_by_name: user?.email,
      } as any);

      return rule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acct-rules'] });
      toast({ title: 'Rule Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async (input: { id: string; rule: Partial<AcctRule>; lines: Partial<AcctRuleLine>[]; conditions: Partial<AcctRuleCondition>[] }) => {
      const { error } = await (supabase.from('acct_determination_rules' as any).update(input.rule) as any).eq('id', input.id);
      if (error) throw error;

      // Replace lines
      await supabase.from('acct_determination_lines' as any).delete().eq('rule_id', input.id);
      if (input.lines.length > 0) {
        const lines = input.lines.map((l, i) => ({ ...l, rule_id: input.id, line_order: i + 1 }));
        await supabase.from('acct_determination_lines' as any).insert(lines as any);
      }

      // Replace conditions
      await supabase.from('acct_determination_conditions' as any).delete().eq('rule_id', input.id);
      if (input.conditions.length > 0) {
        const conds = input.conditions.map(c => ({ ...c, rule_id: input.id }));
        await supabase.from('acct_determination_conditions' as any).insert(conds as any);
      }

      await supabase.from('acct_rule_audit_log' as any).insert({
        rule_id: input.id, action: 'updated', new_values: input.rule,
        changed_by: user?.id, changed_by_name: user?.email,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acct-rules'] });
      toast({ title: 'Rule Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('acct_rule_audit_log' as any).insert({
        rule_id: id, action: 'deleted', changed_by: user?.id, changed_by_name: user?.email,
      } as any);
      const { error } = await supabase.from('acct_determination_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acct-rules'] });
      toast({ title: 'Rule Deleted' });
    },
  });

  // Posting exceptions
  const { data: exceptions = [], isLoading: exceptionsLoading } = useQuery({
    queryKey: ['posting-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('acct_posting_exceptions' as any).select('*') as any)
        .order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await (supabase.from('acct_posting_exceptions' as any).update({
        status: 'resolved', resolved_by: user?.id, resolved_at: new Date().toISOString(), resolution_notes: notes,
      }) as any).eq('id', id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posting-exceptions'] });
      toast({ title: 'Exception Resolved' });
    },
  });

  // Audit log
  const { data: auditLog = [] } = useQuery({
    queryKey: ['acct-rule-audit'],
    queryFn: async () => {
      const { data } = await (supabase.from('acct_rule_audit_log' as any).select('*') as any)
        .order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  // Posting runs
  const { data: postingRuns = [] } = useQuery({
    queryKey: ['posting-runs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('acct_posting_runs' as any).select('*') as any)
        .order('created_at', { ascending: false }).limit(100);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  return {
    rules, isLoading, createRule, updateRule, deleteRule,
    getRuleLines, getRuleConditions,
    exceptions, exceptionsLoading, resolveException,
    auditLog, postingRuns,
  };
}
