import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DesignBOM {
  id: string;
  project_id: string;
  bom_number: string | null;
  title: string;
  description: string | null;
  revision_number: number;
  status: string;
  total_material_cost: number;
  total_labor_cost: number;
  total_overhead_cost: number;
  total_cost: number;
  currency: string;
  prepared_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BOMItem {
  id: string;
  bom_id: string;
  line_number: number;
  item_code: string | null;
  item_description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier: string | null;
  lead_time_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface CostVariance {
  id: string;
  project_id: string;
  bom_id: string | null;
  original_estimated_cost: number;
  revised_cost: number;
  variance_amount: number;
  variance_percentage: number;
  variance_reason: string | null;
  category: string;
  status: string;
  requires_additional_payment: boolean;
  additional_amount: number;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDesignBOMs(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: boms, isLoading } = useQuery({
    queryKey: ['design-boms', projectId],
    queryFn: async () => {
      let query = supabase.from('design_bom').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DesignBOM[];
    },
  });

  const createBOM = useMutation({
    mutationFn: async (bom: Partial<DesignBOM> & { project_id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const bomNumber = `BOM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from('design_bom')
        .insert([{ ...bom, bom_number: bom.bom_number || bomNumber, created_by: user?.id, prepared_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data as DesignBOM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-boms'] });
      toast({ title: 'BOM created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating BOM', description: error.message, variant: 'destructive' });
    },
  });

  const updateBOM = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DesignBOM> & { id: string }) => {
      const { data, error } = await supabase.from('design_bom').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-boms'] });
      toast({ title: 'BOM updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating BOM', description: error.message, variant: 'destructive' });
    },
  });

  const approveBOM = useMutation({
    mutationFn: async (bomId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('design_bom')
        .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', bomId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-boms'] });
      toast({ title: 'BOM approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving BOM', description: error.message, variant: 'destructive' });
    },
  });

  return { boms, isLoading, createBOM, updateBOM, approveBOM };
}

export function useBOMItems(bomId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['bom-items', bomId],
    queryFn: async () => {
      if (!bomId) return [];
      const { data, error } = await supabase.from('design_bom_items').select('*').eq('bom_id', bomId).order('line_number');
      if (error) throw error;
      return data as BOMItem[];
    },
    enabled: !!bomId,
  });

  const addItem = useMutation({
    mutationFn: async (item: Partial<BOMItem> & { bom_id: string; item_description: string; line_number: number }) => {
      const { data, error } = await supabase.from('design_bom_items').insert([item]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items', bomId] });
      toast({ title: 'Item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BOMItem> & { id: string }) => {
      const { data, error } = await supabase.from('design_bom_items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items', bomId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating item', description: error.message, variant: 'destructive' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('design_bom_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items', bomId] });
      toast({ title: 'Item removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing item', description: error.message, variant: 'destructive' });
    },
  });

  return { items, isLoading, addItem, updateItem, deleteItem };
}

export function useCostVariances(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: variances, isLoading } = useQuery({
    queryKey: ['cost-variances', projectId],
    queryFn: async () => {
      let query = supabase.from('cost_variances').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CostVariance[];
    },
  });

  const createVariance = useMutation({
    mutationFn: async (variance: Partial<CostVariance> & { project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const varianceAmount = (variance.revised_cost || 0) - (variance.original_estimated_cost || 0);
      const variancePercentage = (variance.original_estimated_cost || 0) > 0
        ? ((varianceAmount / (variance.original_estimated_cost || 1)) * 100)
        : 0;
      const { data, error } = await supabase
        .from('cost_variances')
        .insert([{
          ...variance,
          variance_amount: varianceAmount,
          variance_percentage: variancePercentage,
          submitted_by: user?.id,
          submitted_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-variances'] });
      toast({ title: 'Cost variance submitted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting variance', description: error.message, variant: 'destructive' });
    },
  });

  const approveVariance = useMutation({
    mutationFn: async (varianceId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('cost_variances')
        .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', varianceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-variances'] });
      toast({ title: 'Variance approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving variance', description: error.message, variant: 'destructive' });
    },
  });

  const rejectVariance = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('cost_variances')
        .update({ status: 'rejected', approved_by: user?.id, approved_at: new Date().toISOString(), rejection_reason: reason })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-variances'] });
      toast({ title: 'Variance rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error rejecting variance', description: error.message, variant: 'destructive' });
    },
  });

  return { variances, isLoading, createVariance, approveVariance, rejectVariance };
}
