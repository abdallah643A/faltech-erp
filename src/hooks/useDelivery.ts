import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryOrder {
  id: string;
  project_id: string;
  delivery_number: string | null;
  status: string;
  delivery_type: string;
  scheduled_date: string | null;
  actual_delivery_date: string | null;
  origin_address: string | null;
  destination_address: string | null;
  transport_method: string | null;
  transport_company: string | null;
  tracking_number: string | null;
  estimated_weight: number | null;
  estimated_dimensions: string | null;
  special_handling_notes: string | null;
  delivery_contact_name: string | null;
  delivery_contact_phone: string | null;
  received_by_name: string | null;
  received_at: string | null;
  delivery_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallationTask {
  id: string;
  project_id: string;
  delivery_order_id: string | null;
  task_number: string | null;
  title: string;
  description: string | null;
  task_type: string;
  sequence_number: number;
  status: string;
  assigned_team: string | null;
  assigned_to: string | null;
  estimated_hours: number;
  actual_hours: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  safety_requirements: string | null;
  tools_required: string | null;
  completion_photos: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSignoff {
  id: string;
  project_id: string;
  signoff_type: string;
  title: string;
  description: string | null;
  checklist: any[];
  status: string;
  customer_name: string | null;
  customer_title: string | null;
  customer_signature_url: string | null;
  customer_signed_at: string | null;
  internal_approved_by: string | null;
  internal_approved_at: string | null;
  punch_list_items: any[];
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_terms: string | null;
  satisfaction_score: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeliveryOrders(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['delivery-orders', projectId],
    queryFn: async () => {
      let query = supabase.from('delivery_orders').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DeliveryOrder[];
    },
  });

  const createDelivery = useMutation({
    mutationFn: async (delivery: Partial<DeliveryOrder> & { project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const deliveryNumber = `DEL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from('delivery_orders')
        .insert([{ ...delivery, delivery_number: delivery.delivery_number || deliveryNumber, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      toast({ title: 'Delivery order created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating delivery', description: error.message, variant: 'destructive' });
    },
  });

  const updateDelivery = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryOrder> & { id: string }) => {
      const { data, error } = await supabase.from('delivery_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      toast({ title: 'Delivery updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating delivery', description: error.message, variant: 'destructive' });
    },
  });

  return { deliveries, isLoading, createDelivery, updateDelivery };
}

export function useInstallationTasks(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['installation-tasks', projectId],
    queryFn: async () => {
      let query = supabase.from('installation_tasks').select('*').order('sequence_number');
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as InstallationTask[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<InstallationTask> & { project_id: string; title: string }) => {
      const taskNumber = `INST-${String(Date.now()).slice(-6)}`;
      const { data, error } = await supabase
        .from('installation_tasks')
        .insert([{ ...task, task_number: task.task_number || taskNumber }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-tasks'] });
      toast({ title: 'Installation task created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InstallationTask> & { id: string }) => {
      const { data, error } = await supabase.from('installation_tasks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-tasks'] });
      toast({ title: 'Task updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
    },
  });

  return { tasks, isLoading, createTask, updateTask };
}

export function useProjectSignoffs(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: signoffs, isLoading } = useQuery({
    queryKey: ['project-signoffs', projectId],
    queryFn: async () => {
      let query = supabase.from('project_signoffs').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectSignoff[];
    },
  });

  const createSignoff = useMutation({
    mutationFn: async (signoff: Partial<ProjectSignoff> & { project_id: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('project_signoffs')
        .insert([{ ...signoff, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-signoffs'] });
      toast({ title: 'Sign-off created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating sign-off', description: error.message, variant: 'destructive' });
    },
  });

  const updateSignoff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectSignoff> & { id: string }) => {
      const { data, error } = await supabase.from('project_signoffs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-signoffs'] });
      toast({ title: 'Sign-off updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating sign-off', description: error.message, variant: 'destructive' });
    },
  });

  return { signoffs, isLoading, createSignoff, updateSignoff };
}
