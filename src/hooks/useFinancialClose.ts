import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ClosePeriod {
  id: string;
  company_id: string | null;
  period_type: string;
  fiscal_year: number;
  period_number: number;
  period_label: string | null;
  status: string;
  readiness_score: number;
  total_tasks: number;
  completed_tasks: number;
  exception_count: number;
  target_close_date: string | null;
  actual_close_date: string | null;
  started_by: string | null;
  started_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CloseTask {
  id: string;
  close_period_id: string;
  company_id: string | null;
  task_name: string;
  description: string | null;
  category: string;
  function_area: string;
  status: string;
  priority: string;
  owner_id: string | null;
  owner_name: string | null;
  sla_hours: number;
  sla_deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  blocker_reason: string | null;
  evidence_notes: string | null;
  evidence_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface CloseException {
  id: string;
  close_period_id: string;
  company_id: string | null;
  exception_type: string;
  severity: string;
  title: string;
  description: string | null;
  source_table: string | null;
  source_id: string | null;
  source_reference: string | null;
  auto_detected: boolean;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CloseSignoff {
  id: string;
  close_period_id: string;
  company_id: string | null;
  signoff_level: number;
  signoff_role: string;
  signer_id: string | null;
  signer_name: string | null;
  status: string;
  comments: string | null;
  signed_at: string | null;
  created_at: string;
}

const QK = 'financial-close';

export function useFinancialClose() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  // Periods
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: [QK, 'periods', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('close_periods').select('*').order('fiscal_year', { ascending: false }).order('period_number', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ClosePeriod[];
    },
  });

  // Tasks for a period
  const useCloseTasks = (periodId: string | null) => useQuery({
    queryKey: [QK, 'tasks', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase.from('close_tasks').select('*').eq('close_period_id', periodId!).order('sort_order');
      if (error) throw error;
      return data as CloseTask[];
    },
  });

  // Exceptions for a period
  const useCloseExceptions = (periodId: string | null) => useQuery({
    queryKey: [QK, 'exceptions', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase.from('close_exceptions').select('*').eq('close_period_id', periodId!).order('severity').order('created_at', { ascending: false });
      if (error) throw error;
      return data as CloseException[];
    },
  });

  // Signoffs for a period
  const useCloseSignoffs = (periodId: string | null) => useQuery({
    queryKey: [QK, 'signoffs', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase.from('close_signoffs').select('*').eq('close_period_id', periodId!).order('signoff_level');
      if (error) throw error;
      return data as CloseSignoff[];
    },
  });

  // All exceptions across periods for dashboard
  const { data: allExceptions = [] } = useQuery({
    queryKey: [QK, 'all-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('close_exceptions').select('*').order('created_at', { ascending: false }).limit(100);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CloseException[];
    },
  });

  // Create period
  const createPeriod = useMutation({
    mutationFn: async (data: { period_type: string; fiscal_year: number; period_number: number; period_label?: string; target_close_date?: string }) => {
      const { error } = await supabase.from('close_periods').insert({
        ...data,
        started_by: user?.id,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Close Period Created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create default tasks for a period
  const initializePeriodTasks = useMutation({
    mutationFn: async (periodId: string) => {
      const defaultTasks = [
        { task_name: 'Post all sub-ledger entries', category: 'subledger', function_area: 'finance', sort_order: 1, sla_hours: 8 },
        { task_name: 'Complete bank reconciliation', category: 'reconciliation', function_area: 'finance', sort_order: 2, sla_hours: 8 },
        { task_name: 'Review and post accruals', category: 'accruals', function_area: 'finance', sort_order: 3, sla_hours: 12 },
        { task_name: 'Run depreciation', category: 'depreciation', function_area: 'finance', sort_order: 4, sla_hours: 4 },
        { task_name: 'Post payroll journal entries', category: 'payroll', function_area: 'hr', sort_order: 5, sla_hours: 8 },
        { task_name: 'Reconcile intercompany balances', category: 'intercompany', function_area: 'finance', sort_order: 6, sla_hours: 16 },
        { task_name: 'Review AP aging and cutoff', category: 'ap_review', function_area: 'procurement', sort_order: 7, sla_hours: 8 },
        { task_name: 'Review AR aging and collections', category: 'ar_review', function_area: 'sales', sort_order: 8, sla_hours: 8 },
        { task_name: 'Inventory valuation review', category: 'inventory', function_area: 'inventory', sort_order: 9, sla_hours: 12 },
        { task_name: 'Review budget variances', category: 'variance', function_area: 'finance', sort_order: 10, sla_hours: 8 },
        { task_name: 'Prepare trial balance', category: 'reporting', function_area: 'finance', sort_order: 11, sla_hours: 4 },
        { task_name: 'Generate financial statements', category: 'reporting', function_area: 'finance', sort_order: 12, sla_hours: 8 },
        { task_name: 'Controller review and sign-off', category: 'signoff', function_area: 'finance', sort_order: 13, sla_hours: 24, priority: 'high' },
        { task_name: 'Finance Manager sign-off', category: 'signoff', function_area: 'finance', sort_order: 14, sla_hours: 24, priority: 'high' },
        { task_name: 'CFO final sign-off', category: 'signoff', function_area: 'finance', sort_order: 15, sla_hours: 48, priority: 'critical' },
      ].map(t => ({
        ...t,
        close_period_id: periodId,
        priority: (t as any).priority || 'medium',
        status: 'pending',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }));
      const { error } = await supabase.from('close_tasks').insert(defaultTasks);
      if (error) throw error;

      // Create default signoffs
      const signoffs = [
        { signoff_level: 1, signoff_role: 'Controller' },
        { signoff_level: 2, signoff_role: 'Finance Manager' },
        { signoff_level: 3, signoff_role: 'CFO' },
      ].map(s => ({
        ...s,
        close_period_id: periodId,
        status: 'pending',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }));
      await supabase.from('close_signoffs').insert(signoffs);

      // Update period task count
      await supabase.from('close_periods').update({ total_tasks: defaultTasks.length }).eq('id', periodId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Close tasks initialized' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status, blocker_reason }: { id: string; status: string; blocker_reason?: string }) => {
      const updates: any = { status };
      if (status === 'in_progress' && !updates.started_at) updates.started_at = new Date().toISOString();
      if (status === 'completed') { updates.completed_at = new Date().toISOString(); updates.completed_by = user?.id; }
      if (status === 'blocked') updates.blocker_reason = blocker_reason || null;
      const { error } = await supabase.from('close_tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CloseTask> & { id: string }) => {
      const { error } = await supabase.from('close_tasks').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Resolve exception
  const resolveException = useMutation({
    mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
      const { error } = await supabase.from('close_exceptions').update({
        status: 'resolved',
        resolution_notes,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Exception Resolved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Sign off
  const signOff = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { error } = await supabase.from('close_signoffs').update({
        status: 'approved',
        signer_id: user?.id,
        signed_at: new Date().toISOString(),
        comments: comments || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Sign-off Approved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Reject sign off
  const rejectSignoff = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const { error } = await supabase.from('close_signoffs').update({
        status: 'rejected',
        signer_id: user?.id,
        signed_at: new Date().toISOString(),
        comments,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Sign-off Rejected' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Complete period
  const completePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase.from('close_periods').update({
        status: 'completed',
        completed_by: user?.id,
        completed_at: new Date().toISOString(),
        actual_close_date: new Date().toISOString().split('T')[0],
        readiness_score: 100,
      }).eq('id', periodId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast({ title: 'Period Closed Successfully' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Run exception detection
  const detectExceptions = useMutation({
    mutationFn: async (periodId: string) => {
      const exceptions: Omit<CloseException, 'id' | 'created_at' | 'updated_at'>[] = [];

      // Check unposted journals
      const { data: draftJournals } = await supabase.from('journal_entries').select('id, doc_num').eq('status', 'draft');
      if (draftJournals?.length) {
        exceptions.push({
          close_period_id: periodId,
          company_id: activeCompanyId || null,
          exception_type: 'unposted_journals',
          severity: 'high',
          title: `${draftJournals.length} unposted journal entries`,
          description: `Draft journal entries: ${draftJournals.slice(0, 5).map(j => `JE-${j.doc_num}`).join(', ')}${draftJournals.length > 5 ? '...' : ''}`,
          source_table: 'journal_entries',
          source_id: null,
          source_reference: null,
          auto_detected: true,
          status: 'open',
          assigned_to: null,
          assigned_to_name: null,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
        });
      }

      // Check overdue AR invoices
      const { data: overdueAR } = await supabase.from('ar_invoices').select('id, doc_num, customer_name, balance_due')
        .eq('status', 'open').gt('balance_due', 0).lt('doc_due_date', new Date().toISOString().split('T')[0]);
      if (overdueAR?.length) {
        const totalOverdue = overdueAR.reduce((s, i) => s + (i.balance_due || 0), 0);
        exceptions.push({
          close_period_id: periodId,
          company_id: activeCompanyId || null,
          exception_type: 'overdue_receivables',
          severity: totalOverdue > 100000 ? 'critical' : 'high',
          title: `${overdueAR.length} overdue AR invoices (${totalOverdue.toLocaleString()} SAR)`,
          description: `Top overdue: ${overdueAR.slice(0, 3).map(i => `${i.customer_name}: ${i.balance_due}`).join(', ')}`,
          source_table: 'ar_invoices',
          source_id: null,
          source_reference: null,
          auto_detected: true,
          status: 'open',
          assigned_to: null,
          assigned_to_name: null,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
        });
      }

      // Check POs pending approval
      const { data: pendingPOs } = await supabase.from('purchase_orders').select('id, po_number').eq('status', 'pending');
      if (pendingPOs?.length) {
        exceptions.push({
          close_period_id: periodId,
          company_id: activeCompanyId || null,
          exception_type: 'pending_approvals',
          severity: 'medium',
          title: `${pendingPOs.length} purchase orders pending approval`,
          description: `POs awaiting approval: ${pendingPOs.slice(0, 5).map(p => p.po_number).join(', ')}`,
          source_table: 'purchase_orders',
          source_id: null,
          source_reference: null,
          auto_detected: true,
          status: 'open',
          assigned_to: null,
          assigned_to_name: null,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
        });
      }

      // Check anomaly alerts
      const { data: anomalies } = await supabase.from('ai_anomaly_alerts').select('id, title, severity')
        .eq('status', 'new').limit(10);
      if (anomalies?.length) {
        exceptions.push({
          close_period_id: periodId,
          company_id: activeCompanyId || null,
          exception_type: 'unusual_movements',
          severity: 'high',
          title: `${anomalies.length} unusual account movements detected`,
          description: anomalies.slice(0, 3).map(a => a.title).join('; '),
          source_table: 'ai_anomaly_alerts',
          source_id: null,
          source_reference: null,
          auto_detected: true,
          status: 'open',
          assigned_to: null,
          assigned_to_name: null,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null,
        });
      }

      if (exceptions.length > 0) {
        const { error } = await supabase.from('close_exceptions').insert(exceptions as any);
        if (error) throw error;
      }

      // Update period exception count
      await supabase.from('close_periods').update({ exception_count: exceptions.length }).eq('id', periodId);
      return exceptions.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast({ title: 'Exception Detection Complete', description: `${count} exceptions found` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update period readiness
  const updateReadiness = useMutation({
    mutationFn: async (periodId: string) => {
      const { data: tasks } = await supabase.from('close_tasks').select('status').eq('close_period_id', periodId);
      if (!tasks?.length) return;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const score = Math.round((completed / tasks.length) * 100);
      await supabase.from('close_periods').update({ readiness_score: score, completed_tasks: completed, total_tasks: tasks.length }).eq('id', periodId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });

  return {
    periods, periodsLoading,
    useCloseTasks, useCloseExceptions, useCloseSignoffs,
    allExceptions,
    createPeriod, initializePeriodTasks,
    updateTaskStatus, updateTask,
    resolveException, detectExceptions,
    signOff, rejectSignoff,
    completePeriod, updateReadiness,
  };
}
