import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  business_partner_id: string | null;
  project_id?: string | null;
  employee_id?: string | null;
  sales_order_id?: string | null;
  purchase_order_id?: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  priority: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string | null;
}

export interface ActivityInput {
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  lead_id?: string;
  opportunity_id?: string;
  business_partner_id?: string;
  due_date?: string;
  assigned_to?: string;
  priority?: string;
}

export function useActivities(entityType?: 'lead' | 'opportunity' | 'business_partner', entityId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', entityType, entityId, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      if (entityType === 'lead' && entityId) {
        query = query.eq('lead_id', entityId);
      } else if (entityType === 'opportunity' && entityId) {
        query = query.eq('opportunity_id', entityId);
      } else if (entityType === 'business_partner' && entityId) {
        query = query.eq('business_partner_id', entityId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !entityType || !!entityId,
  });

  const createActivity = useMutation({
    mutationFn: async (activity: ActivityInput) => {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...activity,
          created_by: user?.id,
          assigned_to: activity.assigned_to || user?.id,
          priority: activity.priority || 'medium',
          company_id: activeCompanyId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity Created",
        description: "The activity has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Activity> & { id: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity Updated",
        description: "The activity has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeActivity = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('activities')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity Completed",
        description: "The activity has been marked as complete.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity Deleted",
        description: "The activity has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    activities,
    isLoading,
    error,
    createActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
  };
}
