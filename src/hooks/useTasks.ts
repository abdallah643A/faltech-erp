import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Task {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  business_partner_id: string | null;
  project_id: string | null;
  employee_id: string | null;
  sales_order_id: string | null;
  purchase_order_id: string | null;
  // Joined
  assignee_name?: string | null;
  creator_name?: string | null;
  related_name?: string | null;
  related_type?: string | null;
}

export interface TaskInput {
  type: string;
  subject: string;
  description?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
  lead_id?: string;
  opportunity_id?: string;
  business_partner_id?: string;
  project_id?: string;
  employee_id?: string;
  sales_order_id?: string;
  purchase_order_id?: string;
}

function resolveRelation(task: any): { related_name: string | null; related_type: string | null } {
  // We'll resolve names after fetching
  if (task.lead_id) return { related_name: null, related_type: 'Lead' };
  if (task.opportunity_id) return { related_name: null, related_type: 'Opportunity' };
  if (task.business_partner_id) return { related_name: null, related_type: 'Customer' };
  if (task.project_id) return { related_name: null, related_type: 'Project' };
  if (task.employee_id) return { related_name: null, related_type: 'Employee' };
  if (task.sales_order_id) return { related_name: null, related_type: 'Sales Order' };
  if (task.purchase_order_id) return { related_name: null, related_type: 'Purchase Order' };
  return { related_name: null, related_type: null };
}

export function useTasks(filters?: {
  status?: string;
  type?: string;
  assignedTo?: string;
  relatedType?: string;
  relatedId?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', activeCompanyId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCompanyId) params['company_id'] = activeCompanyId;
      if (filters?.status && filters.status !== 'all') params['status'] = filters.status;
      if (filters?.type && filters.type !== 'all') params['type'] = filters.type;
      if (filters?.assignedTo) params['assigned_to'] = filters.assignedTo;

      if (filters?.relatedType && filters?.relatedId) {
        const fieldMap: Record<string, string> = {
          Lead: 'lead_id', Opportunity: 'opportunity_id', Customer: 'business_partner_id',
          Project: 'project_id', Employee: 'employee_id',
          'Sales Order': 'sales_order_id', 'Purchase Order': 'purchase_order_id',
        };
        const field = fieldMap[filters.relatedType];
        if (field) params[field] = filters.relatedId;
      }

      let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters using match to avoid deep type instantiation
      if (Object.keys(params).length > 0) {
        query = query.match(params) as any;
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch assignee & creator names
      const userIds = [...new Set([
        ...(data || []).filter(t => t.assigned_to).map(t => t.assigned_to!),
        ...(data || []).filter(t => t.created_by).map(t => t.created_by!),
      ])];

      let profiles: Array<{ user_id: string; full_name: string | null; email: string }> = [];
      if (userIds.length > 0) {
        const { data: pd } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
        profiles = pd || [];
      }

      return (data || []).map(t => {
        const rel = resolveRelation(t);
        const assignee = profiles.find(p => p.user_id === t.assigned_to);
        const creator = profiles.find(p => p.user_id === t.created_by);
        return {
          ...t,
          assignee_name: assignee?.full_name || assignee?.email || null,
          creator_name: creator?.full_name || creator?.email || null,
          ...rel,
        } as Task;
      });
    },
  });

  const createTask = useMutation({
    mutationFn: async (input: TaskInput) => {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          type: input.type || 'task',
          subject: input.subject,
          description: input.description || null,
          priority: input.priority || 'medium',
          due_date: input.due_date || null,
          assigned_to: input.assigned_to || user?.id || null,
          created_by: user?.id || null,
          company_id: activeCompanyId || null,
          lead_id: input.lead_id || null,
          opportunity_id: input.opportunity_id || null,
          business_partner_id: input.business_partner_id || null,
          project_id: input.project_id || null,
          employee_id: input.employee_id || null,
          sales_order_id: input.sales_order_id || null,
          purchase_order_id: input.purchase_order_id || null,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['global-feed-activities'] });
      toast({ title: 'Task created successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const clean: Record<string, unknown> = { ...updates };
      delete clean.assignee_name;
      delete clean.creator_name;
      delete clean.related_name;
      delete clean.related_type;
      const { data, error } = await supabase.from('activities').update(clean).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: 'Task updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('activities')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: 'Task completed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reopenTask = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('activities')
        .update({ status: 'pending', completed_at: null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task reopened' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: 'Task deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Computed stats
  const now = new Date();
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now).length,
  };

  return { tasks, isLoading, error, stats, createTask, updateTask, completeTask, reopenTask, deleteTask };
}
