import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface CostCode {
  id: string;
  code: string;
  division_number: number;
  title: string;
  description: string | null;
  parent_code: string | null;
  is_active: boolean;
  company_id: string | null;
  created_at: string;
}

export function useCostCodes() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const codes = useQuery({
    queryKey: ['cost-codes', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_cost_codes' as any).select('*').order('code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CostCode[];
    },
  });

  const createCode = useMutation({
    mutationFn: async (data: Partial<CostCode>) => {
      const { error } = await supabase.from('cpms_cost_codes' as any).insert({
        ...data,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-codes'] }); toast({ title: 'Cost code created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateCode = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_cost_codes' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-codes'] }); toast({ title: 'Cost code updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_cost_codes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-codes'] }); toast({ title: 'Cost code deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Build hierarchical structure
  const getHierarchy = (data: CostCode[]) => {
    const roots = data.filter(c => !c.parent_code);
    const getChildren = (parentCode: string): CostCode[] =>
      data.filter(c => c.parent_code === parentCode);
    return { roots, getChildren };
  };

  return { codes, createCode, updateCode, deleteCode, getHierarchy };
}

export function useCostCodeBudgets(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const budgets = useQuery({
    queryKey: ['cost-code-budgets', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_cost_code_budgets' as any)
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const upsertBudget = useMutation({
    mutationFn: async (data: { project_id: string; cost_code_id: string; budgeted_amount: number }) => {
      const { error } = await supabase.from('cpms_cost_code_budgets' as any).upsert(
        { ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) },
        { onConflict: 'project_id,cost_code_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-code-budgets'] }); toast({ title: 'Budget updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { budgets, upsertBudget };
}
