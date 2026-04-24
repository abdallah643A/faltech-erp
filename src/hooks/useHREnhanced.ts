import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

/* ---------- ATS PIPELINE ---------- */
export function useATSStages() {
  return useQuery({
    queryKey: ['hr-ats-stages'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_ats_pipeline_stages').select('*').order('stage_order');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useATSScreeningRules() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-ats-rules'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_ats_screening_rules').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('hr_ats_screening_rules').update(row).eq('id', row.id).select().single()
        : await sb.from('hr_ats_screening_rules').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-ats-rules'] }); toast.success('Rule saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

export function useATSCandidateScores(requisitionId?: string) {
  return useQuery({
    queryKey: ['hr-ats-scores', requisitionId],
    queryFn: async () => {
      let q = sb.from('hr_ats_candidate_scores').select('*').order('total_score', { ascending: false });
      if (requisitionId) q = q.eq('requisition_id', requisitionId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

/* ---------- CONTRACTS ---------- */
export function useContracts() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-contracts'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_contracts').select('*').order('start_date', { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { total_salary, ...payload } = row;
      const { data, error } = row.id
        ? await sb.from('hr_contracts').update(payload).eq('id', row.id).select().single()
        : await sb.from('hr_contracts').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-contracts'] }); toast.success('Contract saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- REGIONAL LEAVE POLICIES ---------- */
export function useRegionalLeavePolicies(country?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-leave-policies', country],
    queryFn: async () => {
      let q = sb.from('hr_leave_policies_regional').select('*').order('country_code').order('leave_type');
      if (country) q = q.eq('country_code', country);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('hr_leave_policies_regional').update(row).eq('id', row.id).select().single()
        : await sb.from('hr_leave_policies_regional').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-leave-policies'] }); toast.success('Policy saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- ATTENDANCE EXCEPTIONS ---------- */
export function useAttendanceExceptions() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-attendance-exceptions'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_attendance_exceptions').select('*').order('exception_date', { ascending: false }).limit(300);
      if (error) throw error;
      return data || [];
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, status, decision_notes }: any) => {
      const { error } = await sb.from('hr_attendance_exceptions').update({ status, decision_notes, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-attendance-exceptions'] }); toast.success('Reviewed'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, review };
}

/* ---------- PAYROLL CONTROLS ---------- */
export function usePayrollControls() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-payroll-controls'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_payroll_controls').select('*').order('severity').order('control_code');
      if (error) throw error;
      return data || [];
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: any) => {
      const { error } = await sb.from('hr_payroll_controls').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-payroll-controls'] }),
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, toggle };
}

/* ---------- GRIEVANCES ---------- */
export function useGrievances() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-grievances'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_grievances').select('*').order('filed_date', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
  const file = useMutation({
    mutationFn: async (row: any) => {
      const number = row.grievance_number || `GRV-${Date.now().toString().slice(-8)}`;
      const { data, error } = await sb.from('hr_grievances').insert({ ...row, grievance_number: number }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-grievances'] }); toast.success('Grievance filed'); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await sb.from('hr_grievances').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-grievances'] }),
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, file, update };
}

/* ---------- OFFBOARDING ---------- */
export function useOffboardingChecklists() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-offboarding'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_offboarding_checklists').select('*, hr_offboarding_tasks(*)').order('notice_date', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });
  const create = useMutation({
    mutationFn: async (row: any) => {
      const number = row.checklist_number || `OFB-${Date.now().toString().slice(-8)}`;
      const { data, error } = await sb.from('hr_offboarding_checklists').insert({ ...row, checklist_number: number }).select().single();
      if (error) throw error;
      // seed default tasks
      const defaults = [
        { task_name: 'Resignation acceptance & ack', task_name_ar: 'قبول الاستقالة', category: 'documentation', responsible_role: 'hr' },
        { task_name: 'Knowledge transfer', task_name_ar: 'نقل المعرفة', category: 'handover', responsible_role: 'manager' },
        { task_name: 'Return company assets', task_name_ar: 'إعادة أصول الشركة', category: 'assets', responsible_role: 'admin' },
        { task_name: 'Revoke system access', task_name_ar: 'إلغاء صلاحيات النظام', category: 'it', responsible_role: 'it' },
        { task_name: 'Final settlement & EOSB', task_name_ar: 'مكافأة نهاية الخدمة', category: 'finance', responsible_role: 'payroll' },
        { task_name: 'Exit interview', task_name_ar: 'مقابلة الخروج', category: 'documentation', responsible_role: 'hr' },
        { task_name: 'GOSI termination', task_name_ar: 'إنهاء التأمينات', category: 'compliance', responsible_role: 'hr' },
      ];
      await sb.from('hr_offboarding_tasks').insert(defaults.map((d, i) => ({ ...d, checklist_id: data.id, task_order: i + 1 })));
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-offboarding'] }); toast.success('Offboarding initiated'); },
    onError: (e: any) => toast.error(e.message),
  });
  const completeTask = useMutation({
    mutationFn: async ({ id, completed }: any) => {
      const { error } = await sb.from('hr_offboarding_tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-offboarding'] }),
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, create, completeTask };
}

/* ---------- TALENT DEVELOPMENT ---------- */
export function useTalentDevelopment() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-talent'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_talent_development').select('*').order('start_date', { ascending: false }).limit(300);
      if (error) throw error;
      return data || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('hr_talent_development').update(row).eq('id', row.id).select().single()
        : await sb.from('hr_talent_development').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-talent'] }); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- DOCUMENT EXPIRY ---------- */
export function useDocumentExpiry() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-doc-expiry'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_document_expiry').select('*').order('expiry_date').limit(500);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        days_until_expiry: Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000),
      }));
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await sb.from('hr_document_expiry').update(row).eq('id', row.id).select().single()
        : await sb.from('hr_document_expiry').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-doc-expiry'] }); toast.success('Document saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

/* ---------- WORKFORCE ANALYTICS ---------- */
export function useWorkforceAnalytics() {
  return useQuery({
    queryKey: ['hr-workforce-analytics'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_workforce_analytics_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

/* ---------- ESS REQUESTS ---------- */
export function useESSRequests() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['hr-ess'],
    queryFn: async () => {
      const { data, error } = await sb.from('hr_self_service_requests').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
  const submit = useMutation({
    mutationFn: async (row: any) => {
      const number = row.request_number || `ESS-${Date.now().toString().slice(-8)}`;
      const { data, error } = await sb.from('hr_self_service_requests').insert({ ...row, request_number: number }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-ess'] }); toast.success('Request submitted'); },
    onError: (e: any) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: async ({ id, role, decision, notes }: any) => {
      const patch: any = role === 'manager'
        ? { manager_decision: decision, manager_decision_at: new Date().toISOString(), manager_notes: notes, status: decision === 'approved' ? 'manager_approved' : decision === 'rejected' ? 'rejected' : 'submitted' }
        : { hr_decision: decision, hr_decision_at: new Date().toISOString(), hr_notes: notes, status: decision === 'approved' ? 'completed' : decision === 'rejected' ? 'rejected' : 'manager_approved' };
      const { error } = await sb.from('hr_self_service_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-ess'] }); toast.success('Decision recorded'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, submit, decide };
}
