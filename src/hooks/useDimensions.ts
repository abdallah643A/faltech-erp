import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export type DimensionType = 'employees' | 'branches' | 'business_line' | 'factory';

export interface Dimension {
  id: string;
  dimension_type: DimensionType;
  cost_center: string;
  name: string;
  dimension_code: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  sap_doc_entry: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
}

export type DimensionInsert = Omit<Dimension, 'id' | 'created_at' | 'updated_at' | 'sap_doc_entry' | 'sync_status' | 'last_synced_at'>;

export function useDimensions(type?: DimensionType) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: dimensions = [], isLoading } = useQuery({
    queryKey: ['dimensions', type, activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('dimensions').select('*').order('cost_center');
      if (type) query = query.eq('dimension_type', type);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Dimension[];
    },
    enabled: !!user,
  });

  const createDimension = useMutation({
    mutationFn: async (dim: DimensionInsert) => {
      const { data, error } = await supabase
        .from('dimensions')
        .insert({ ...dim, created_by: user?.id, company_id: dim.company_id || activeCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      toast({ title: 'Success', description: 'Dimension created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateDimension = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<DimensionInsert>) => {
      const { data, error } = await supabase
        .from('dimensions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      toast({ title: 'Success', description: 'Dimension updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDimension = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dimensions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      toast({ title: 'Deleted', description: 'Dimension deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Get active dimensions for dropdowns
  const activeDimensions = dimensions.filter(d => d.is_active);

  return { dimensions, activeDimensions, isLoading, createDimension, updateDimension, deleteDimension };
}
