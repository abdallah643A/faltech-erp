import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeaveType {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  default_days_per_year?: number | null;
  is_paid?: boolean | null;
  is_active?: boolean | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  // Workflow fields
  approval_stage: string | null;
  direct_manager_id: string | null;
  direct_manager_approved_at: string | null;
  direct_manager_notes: string | null;
  dept_manager_id: string | null;
  dept_manager_approved_at: string | null;
  dept_manager_notes: string | null;
  hr_manager_id: string | null;
  hr_manager_approved_at: string | null;
  hr_manager_notes: string | null;
  // Joined data
  employee?: { id: string; first_name: string; last_name: string; employee_code: string; manager_id?: string | null; department_id?: string | null } | null;
  leave_type?: LeaveType | null;
  reviewer?: { id: string; first_name: string; last_name: string } | null;
  direct_manager?: { id: string; first_name: string; last_name: string } | null;
  dept_manager?: { id: string; first_name: string; last_name: string } | null;
  hr_manager?: { id: string; first_name: string; last_name: string } | null;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number | null;
  used_days: number | null;
  pending_days: number | null;
  carried_over_days: number | null;
  leave_type?: LeaveType | null;
}

export interface ApprovalChain {
  direct_manager_id: string | null;
  direct_manager_name: string | null;
  dept_manager_id: string | null;
  dept_manager_name: string | null;
  hr_manager_id: string | null;
  hr_manager_name: string | null;
}

export function useLeaveTypes() {
  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as LeaveType[];
    },
  });

  return { leaveTypes, isLoading };
}

export function useLeaveRequests(employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, employee_code, manager_id, department_id),
          leave_type:leave_types(id, name, code, is_paid),
          reviewer:employees!leave_requests_reviewed_by_fkey(id, first_name, last_name),
          direct_manager:employees!leave_requests_direct_manager_id_fkey(id, first_name, last_name),
          dept_manager:employees!leave_requests_dept_manager_id_fkey(id, first_name, last_name),
          hr_manager:employees!leave_requests_hr_manager_id_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const createLeaveRequest = useMutation({
    mutationFn: async (request: {
      employee_id: string;
      leave_type_id: string;
      start_date: string;
      end_date: string;
      total_days: number;
      reason?: string;
    }) => {
      // Get approval chain for this employee
      const { data: chainData, error: chainError } = await supabase
        .rpc('get_leave_approval_chain', { p_employee_id: request.employee_id });
      
      if (chainError) throw chainError;
      
      const chain = chainData?.[0] as ApprovalChain | undefined;
      
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...request,
          approval_stage: 'pending_direct_manager',
          direct_manager_id: chain?.direct_manager_id || null,
          dept_manager_id: chain?.dept_manager_id || null,
          hr_manager_id: chain?.hr_manager_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: 'Leave request submitted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error submitting leave request', description: error.message, variant: 'destructive' });
    },
  });

  const approveLeaveStage = useMutation({
    mutationFn: async ({ 
      id, 
      stage, 
      notes 
    }: { 
      id: string; 
      stage: 'direct_manager' | 'dept_manager' | 'hr_manager'; 
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      let updateData: Record<string, unknown> = {};
      let nextStage: string;
      
      if (stage === 'direct_manager') {
        updateData = {
          direct_manager_approved_at: now,
          direct_manager_notes: notes || null,
          approval_stage: 'pending_dept_manager',
        };
        nextStage = 'pending_dept_manager';
      } else if (stage === 'dept_manager') {
        updateData = {
          dept_manager_approved_at: now,
          dept_manager_notes: notes || null,
          approval_stage: 'pending_hr_manager',
        };
        nextStage = 'pending_hr_manager';
      } else {
        updateData = {
          hr_manager_approved_at: now,
          hr_manager_notes: notes || null,
          approval_stage: 'approved',
          status: 'approved',
          reviewed_at: now,
        };
        nextStage = 'approved';
      }
      
      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      const stage = data.approval_stage;
      if (stage === 'approved') {
        toast({ title: 'Leave request fully approved!' });
      } else {
        toast({ title: 'Approval recorded, moved to next stage' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving leave request', description: error.message, variant: 'destructive' });
    },
  });

  const rejectLeaveRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approval_stage: 'rejected',
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: 'Leave request rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error rejecting leave request', description: error.message, variant: 'destructive' });
    },
  });

  const updateLeaveRequest = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; review_notes?: string; reviewed_by?: string }) => {
      const updateData = {
        ...updates,
        reviewed_at: updates.status ? new Date().toISOString() : undefined,
      };
      
      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: 'Leave request updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating leave request', description: error.message, variant: 'destructive' });
    },
  });

  return { 
    leaveRequests, 
    isLoading, 
    createLeaveRequest, 
    updateLeaveRequest,
    approveLeaveStage,
    rejectLeaveRequest,
  };
}

export function useLeaveBalances(employeeId?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();
  
  const { data: leaveBalances = [], isLoading } = useQuery({
    queryKey: ['leave-balances', employeeId, currentYear],
    queryFn: async () => {
      let query = supabase
        .from('leave_balances')
        .select(`
          *,
          leave_type:leave_types(id, name, code, is_paid)
        `)
        .eq('year', currentYear);
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LeaveBalance[];
    },
  });

  return { leaveBalances, isLoading };
}

export function useHRManagers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hrManagers = [], isLoading } = useQuery({
    queryKey: ['hr-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_managers')
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const addHRManager = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase
        .from('hr_managers')
        .insert({ employee_id: employeeId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-managers'] });
      toast({ title: 'HR Manager added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding HR Manager', description: error.message, variant: 'destructive' });
    },
  });

  const removeHRManager = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_managers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-managers'] });
      toast({ title: 'HR Manager removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing HR Manager', description: error.message, variant: 'destructive' });
    },
  });

  return { hrManagers, isLoading, addHRManager, removeHRManager };
}
