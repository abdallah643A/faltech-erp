import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Opportunity {
  id: string;
  name: string;
  company: string;
  business_partner_id: string | null;
  value: number;
  probability: number;
  stage: string;
  expected_close: string | null;
  owner_id: string | null;
  owner_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields
  industry: string | null;
  source: string | null;
  territory: number | null;
  contact_person: string | null;
  interest_field: string | null;
  closing_type: string | null;
  reason: string | null;
  remarks: string | null;
  start_date: string | null;
  project_code: string | null;
  customer_code: string | null;
  sales_employee_code: number | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  weighted_amount: number | null;
  max_local_total: number | null;
  current_stage_no: number | null;
  branch_id: string | null;
  company_id: string | null;
}

export type OpportunityInsert = Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>;
export type OpportunityUpdate = Partial<OpportunityInsert>;

export function useOpportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: opportunities = [], isLoading, error, refetch } = useQuery({
    queryKey: ['opportunities', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!user,
    refetchOnMount: 'always',
  });

  const createOpportunity = useMutation({
    mutationFn: async (opportunity: OpportunityInsert) => {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          ...opportunity,
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: 'Success',
        description: 'Opportunity created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & OpportunityUpdate) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: 'Success',
        description: 'Opportunity updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: 'Deleted',
        description: 'Opportunity deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    opportunities,
    isLoading,
    error,
    refetch,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
}
