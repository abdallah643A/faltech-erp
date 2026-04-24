import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useLandedCostDocuments() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['landed-costs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('landed_cost_documents' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (doc: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('landed_cost_documents' as any).insert({ ...doc, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['landed-costs'] }); toast.success('Landed cost document created'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('landed_cost_documents' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['landed-costs'] }); toast.success('Updated'); },
  });

  return { ...query, create, update };
}

export function useLandedCostItems(landedCostId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['landed-cost-items', landedCostId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('landed_cost_items' as any).select('*').eq('landed_cost_id', landedCostId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!landedCostId,
  });

  const upsert = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await (supabase.from('landed_cost_items' as any).upsert(item).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landed-cost-items'] }),
  });

  return { ...query, upsert };
}

export function useLandedCostCosts(landedCostId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['landed-cost-costs', landedCostId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('landed_cost_costs' as any).select('*').eq('landed_cost_id', landedCostId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!landedCostId,
  });

  const upsert = useMutation({
    mutationFn: async (cost: any) => {
      const { data, error } = await (supabase.from('landed_cost_costs' as any).upsert(cost).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landed-cost-costs'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('landed_cost_costs' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landed-cost-costs'] }),
  });

  return { ...query, upsert, remove };
}
