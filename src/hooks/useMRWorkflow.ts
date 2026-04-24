import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface MRWorkflowSetting {
  id: string;
  approval_level: number;
  role_required: 'admin' | 'manager' | 'sales_rep' | 'user' | null;
  position_title: string | null;
  department: string | null;
  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MRApprover {
  id: string;
  approval_level: number;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  is_active: boolean;
  created_at: string;
}

export function useMRWorkflowSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['mr-workflow-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mr_workflow_settings')
        .select('*')
        .order('approval_level');

      if (error) throw error;
      return data as MRWorkflowSetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async (data: Partial<MRWorkflowSetting> & { id: string }) => {
      const { error } = await supabase
        .from('mr_workflow_settings')
        .update({
          role_required: data.role_required,
          position_title: data.position_title || null,
          department: data.department || null,
          min_amount: data.min_amount || 0,
          max_amount: data.max_amount || null,
          is_active: data.is_active,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mr-workflow-settings'] });
      toast({ title: 'Workflow setting updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating setting', description: error.message, variant: 'destructive' });
    },
  });

  return { settings, isLoading, updateSetting };
}

export function useMRApprovers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvers, isLoading } = useQuery({
    queryKey: ['mr-approvers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mr_approvers')
        .select('*')
        .order('approval_level');

      if (error) throw error;
      return data as MRApprover[];
    },
  });

  const addApprover = useMutation({
    mutationFn: async (data: { approval_level: number; user_id: string; user_name: string; user_email: string }) => {
      const { error } = await supabase
        .from('mr_approvers')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mr-approvers'] });
      toast({ title: 'Approver added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding approver', description: error.message, variant: 'destructive' });
    },
  });

  const removeApprover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mr_approvers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mr-approvers'] });
      toast({ title: 'Approver removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing approver', description: error.message, variant: 'destructive' });
    },
  });

  return { approvers, isLoading, addApprover, removeApprover };
}

export function useMRApprovalActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const getApprovalStatus = (mr: any) => {
    if (mr.approved_at_3) return { level: 3, status: 'fully_approved' };
    if (mr.approved_at_2) return { level: 2, status: 'pending_level_3' };
    if (mr.approved_at_1) return { level: 1, status: 'pending_level_2' };
    if (mr.status === 'pending') return { level: 0, status: 'pending_level_1' };
    return { level: 0, status: 'draft' };
  };

  const submitForApproval = useMutation({
    mutationFn: async (mrId: string) => {
      const { error } = await supabase
        .from('material_requests')
        .update({
          status: 'pending',
          requested_by_id: user?.id,
          requested_by_name: profile?.full_name,
          requested_by_email: profile?.email,
          requested_at: new Date().toISOString(),
        })
        .eq('id', mrId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Request submitted for approval' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
    },
  });

  const approveLevel1 = useMutation({
    mutationFn: async (mrId: string) => {
      const { error } = await supabase
        .from('material_requests')
        .update({
          approved_by_1_id: user?.id,
          approved_by_1_name: profile?.full_name,
          approved_by_1_email: profile?.email,
          approved_at_1: new Date().toISOString(),
        })
        .eq('id', mrId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Level 1 approval granted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving', description: error.message, variant: 'destructive' });
    },
  });

  const approveLevel2 = useMutation({
    mutationFn: async (mrId: string) => {
      const { error } = await supabase
        .from('material_requests')
        .update({
          approved_by_2_id: user?.id,
          approved_by_2_name: profile?.full_name,
          approved_by_2_email: profile?.email,
          approved_at_2: new Date().toISOString(),
        })
        .eq('id', mrId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Level 2 approval granted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving', description: error.message, variant: 'destructive' });
    },
  });

  const approveLevel3 = useMutation({
    mutationFn: async (mrId: string) => {
      const { error } = await supabase
        .from('material_requests')
        .update({
          approved_by_3_id: user?.id,
          approved_by_3_name: profile?.full_name,
          approved_by_3_email: profile?.email,
          approved_at_3: new Date().toISOString(),
          status: 'approved',
        })
        .eq('id', mrId);

      if (error) throw error;

      // Auto-complete procurement: find the MR's project, match to a sales order, and advance the phase
      const { data: mr } = await supabase
        .from('material_requests')
        .select('project_name')
        .eq('id', mrId)
        .single();

      if (mr?.project_name) {
        // Find matching procurement alert for this project
        const { data: alerts } = await supabase
          .from('finance_alerts')
          .select('id, project_id, sales_order:sales_orders(customer_name)')
          .eq('alert_type', 'procurement_start')
          .eq('status', 'pending');

        const matchingAlert = alerts?.find(
          (a: any) => a.sales_order?.customer_name === mr.project_name
        );

        if (matchingAlert?.project_id) {
          // Complete procurement phase and resolve alert
          await supabase.rpc('complete_procurement_phase', { p_project_id: matchingAlert.project_id });
          await supabase
            .from('finance_alerts')
            .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
            .eq('id', matchingAlert.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-alerts'] });
      toast({ title: 'Final approval granted - Procurement completed & next stage opened' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving', description: error.message, variant: 'destructive' });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (mrId: string) => {
      const { error } = await supabase
        .from('material_requests')
        .update({
          status: 'rejected',
          reviewed_by_id: user?.id,
          reviewed_by_name: profile?.full_name,
          reviewed_by_email: profile?.email,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', mrId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-requests'] });
      toast({ title: 'Request rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error rejecting', description: error.message, variant: 'destructive' });
    },
  });

  return {
    getApprovalStatus,
    submitForApproval,
    approveLevel1,
    approveLevel2,
    approveLevel3,
    rejectRequest,
  };
}
