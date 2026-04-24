import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface SalesTarget {
  id: string;
  user_id: string | null;
  user_name: string;
  period: string;
  period_start: string;
  period_end: string;
  sales_target: number;
  sales_actual: number;
  collection_target: number;
  collection_actual: number;
  branch_id: string | null;
  sales_employee_id: string | null;
  sales_employee_name: string | null;
  company_id: string | null;
  region_id: string | null;
  business_line_id: string | null;
  business_line_code: string | null;
  business_line_name: string | null;
  target_type: string;
  sap_doc_entry: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetFilters {
  period?: string;
  salesEmployeeId?: string;
  branchIds?: string[];
  companyIds?: string[];
  regionIds?: string[];
  businessLineId?: string;
  targetType?: string;
}

export function useTargets(filters: TargetFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['sales-targets', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('sales_targets').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      
      if (filters.period && filters.period !== 'all') {
        q = q.eq('period', filters.period);
      }
      if (filters.salesEmployeeId) {
        q = q.eq('sales_employee_id', filters.salesEmployeeId);
      }
      if (filters.branchIds && filters.branchIds.length > 0) {
        q = q.in('branch_id', filters.branchIds);
      }
      if (filters.companyIds && filters.companyIds.length > 0) {
        q = q.in('company_id', filters.companyIds);
      }
      if (filters.regionIds && filters.regionIds.length > 0) {
        q = q.in('region_id', filters.regionIds);
      }
      if (filters.businessLineId) {
        q = q.eq('business_line_id', filters.businessLineId);
      }
      if (filters.targetType && filters.targetType !== 'all') {
        q = q.eq('target_type', filters.targetType);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data as SalesTarget[];
    },
  });

  const createTarget = useMutation({
    mutationFn: async (target: Partial<SalesTarget>) => {
      const { data, error } = await supabase.from('sales_targets').insert({ ...target, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      toast({ title: 'Target created successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTarget = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesTarget> & { id: string }) => {
      const { data, error } = await supabase.from('sales_targets').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      toast({ title: 'Target updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteTarget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] });
      toast({ title: 'Target deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createTarget, updateTarget, deleteTarget };
}
