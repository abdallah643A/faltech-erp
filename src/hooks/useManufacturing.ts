import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ProductionOrder {
  id: string;
  project_id: string;
  order_number: string | null;
  title: string;
  description: string | null;
  bom_id: string | null;
  priority: string;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  quantity_planned: number;
  quantity_completed: number;
  quantity_rejected: number;
  assigned_to: string | null;
  production_line: string | null;
  shift: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  production_order_id: string;
  work_order_number: string | null;
  title: string;
  description: string | null;
  work_type: string;
  sequence_number: number;
  status: string;
  estimated_hours: number;
  actual_hours: number;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QCCheckpoint {
  id: string;
  production_order_id: string | null;
  work_order_id: string | null;
  checkpoint_name: string;
  checkpoint_type: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  result: string | null;
  inspector_id: string | null;
  inspected_at: string | null;
  pass_fail: boolean | null;
  defect_description: string | null;
  corrective_action: string | null;
  photos_urls: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useProductionOrders(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['production-orders', projectId, activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('production_orders').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ProductionOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: Partial<ProductionOrder> & { project_id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from('production_orders')
        .insert([{ ...order, order_number: order.order_number || orderNumber, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Production order created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating order', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionOrder> & { id: string }) => {
      const { data, error } = await supabase.from('production_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Order updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating order', description: error.message, variant: 'destructive' });
    },
  });

  return { orders, isLoading, createOrder, updateOrder };
}

export function useWorkOrders(productionOrderId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', productionOrderId],
    queryFn: async () => {
      if (!productionOrderId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .order('sequence_number');
      if (error) throw error;
      return data as WorkOrder[];
    },
    enabled: !!productionOrderId,
  });

  const createWorkOrder = useMutation({
    mutationFn: async (wo: Partial<WorkOrder> & { production_order_id: string; title: string }) => {
      const woNumber = `WO-${String(Date.now()).slice(-6)}`;
      const { data, error } = await supabase
        .from('work_orders')
        .insert([{ ...wo, work_order_number: wo.work_order_number || woNumber }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating work order', description: error.message, variant: 'destructive' });
    },
  });

  const updateWorkOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkOrder> & { id: string }) => {
      const { data, error } = await supabase.from('work_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating work order', description: error.message, variant: 'destructive' });
    },
  });

  return { workOrders, isLoading, createWorkOrder, updateWorkOrder };
}

export function useQCCheckpoints(productionOrderId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['qc-checkpoints', productionOrderId],
    queryFn: async () => {
      if (!productionOrderId) return [];
      const { data, error } = await supabase
        .from('qc_checkpoints')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .order('created_at');
      if (error) throw error;
      return data as QCCheckpoint[];
    },
    enabled: !!productionOrderId,
  });

  const createCheckpoint = useMutation({
    mutationFn: async (cp: Partial<QCCheckpoint> & { checkpoint_name: string }) => {
      const { data, error } = await supabase.from('qc_checkpoints').insert([cp]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-checkpoints'] });
      toast({ title: 'QC checkpoint created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating checkpoint', description: error.message, variant: 'destructive' });
    },
  });

  const updateCheckpoint = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QCCheckpoint> & { id: string }) => {
      const { data, error } = await supabase.from('qc_checkpoints').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-checkpoints'] });
      toast({ title: 'Checkpoint updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating checkpoint', description: error.message, variant: 'destructive' });
    },
  });

  return { checkpoints, isLoading, createCheckpoint, updateCheckpoint };
}
