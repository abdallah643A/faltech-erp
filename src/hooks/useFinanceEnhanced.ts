import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const useCompany = () => useActiveCompany().activeCompanyId;

// ============= COA Entity Overrides =============
export function useCoaOverrides() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-coa-overrides', companyId],
    queryFn: async () => {
      let q = sb.from('fin_coa_entity_overrides').select('*').order('account_code');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, company_id: companyId, created_by: user?.id };
      const { error } = await sb.from('fin_coa_entity_overrides').upsert(payload, {
        onConflict: 'company_id,account_code',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-coa-overrides'] });
      toast({ title: 'COA Override Saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_coa_entity_overrides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-coa-overrides'] }),
  });

  return { data, isLoading, upsert, remove };
}

// ============= Dimensions =============
export function useDimensions() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: dimensions = [], isLoading } = useQuery({
    queryKey: ['fin-dimensions', companyId],
    queryFn: async () => {
      let q = sb.from('fin_dimensions').select('*').order('sort_order');
      if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_dimensions').insert({ ...input, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-dimensions'] });
      toast({ title: 'Dimension Created' });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: any) => {
      const { error } = await sb.from('fin_dimensions').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-dimensions'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_dimensions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-dimensions'] }),
  });

  return { dimensions, isLoading, create, update, remove };
}

export function useDimensionValues(dimensionId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-dim-values', dimensionId],
    queryFn: async () => {
      if (!dimensionId) return [];
      const { data, error } = await sb.from('fin_dimension_values').select('*').eq('dimension_id', dimensionId).order('value_code');
      if (error) throw error;
      return data || [];
    },
    enabled: !!dimensionId,
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_dimension_values').upsert({ ...input, dimension_id: dimensionId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-dim-values'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_dimension_values').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-dim-values'] }),
  });

  return { data, isLoading, upsert, remove };
}

// ============= Recurring JE Runs =============
export function useRecurringRuns() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-recurring-runs', companyId],
    queryFn: async () => {
      let q = sb.from('fin_recurring_runs').select('*').order('run_date', { ascending: false }).limit(200);
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const triggerRun = useMutation({
    mutationFn: async (template: any) => {
      const payload = {
        template_id: template.id,
        template_name: template.template_name,
        company_id: companyId,
        run_date: new Date().toISOString().split('T')[0],
        posting_date: template.next_run_date,
        status: 'pending',
        triggered_by: user?.id,
        triggered_by_name: user?.email,
      };
      const { error } = await sb.from('fin_recurring_runs').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-recurring-runs'] });
      toast({ title: 'Recurring Run Queued' });
    },
  });

  const updateRunStatus = useMutation({
    mutationFn: async ({ id, status, error_message }: any) => {
      const { error } = await sb.from('fin_recurring_runs').update({ status, error_message }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-recurring-runs'] }),
  });

  return { data, isLoading, triggerRun, updateRunStatus };
}

// ============= Consolidation Runs =============
export function useConsolidationRuns() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-cons-runs', companyId],
    queryFn: async () => {
      let q = sb.from('fin_consolidation_runs').select('*').order('created_at', { ascending: false });
      if (companyId) q = q.eq('parent_company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_consolidation_runs').insert({
        ...input,
        parent_company_id: companyId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-cons-runs'] });
      toast({ title: 'Consolidation Run Created' });
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_consolidation_runs').update({
        status: 'approved',
        approved_by: user?.id,
        approved_by_name: user?.email,
        approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-cons-runs'] });
      toast({ title: 'Consolidation Approved' });
    },
  });

  const post = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_consolidation_runs').update({
        status: 'posted',
        posted_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-cons-runs'] }),
  });

  return { data, isLoading, create, approve, post };
}

// ============= Approval Policies & Requests =============
export function useApprovalPolicies() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-appr-pol', companyId],
    queryFn: async () => {
      let q = sb.from('fin_approval_policies').select('*').order('threshold_amount');
      if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, company_id: input.company_id || companyId };
      const { error } = input.id
        ? await sb.from('fin_approval_policies').update(payload).eq('id', input.id)
        : await sb.from('fin_approval_policies').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-appr-pol'] });
      toast({ title: 'Policy Saved' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_approval_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-appr-pol'] }),
  });

  return { data, isLoading, upsert, remove };
}

export function useApprovalRequests(status?: string) {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-appr-req', companyId, status],
    queryFn: async () => {
      let q = sb.from('fin_approval_requests').select('*').order('requested_at', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const approveLevel = useMutation({
    mutationFn: async ({ id, level, notes }: { id: string; level: number; notes?: string }) => {
      const updates: any = {
        [`level_${level}_approver`]: user?.id,
        [`level_${level}_approver_name`]: user?.email,
        [`level_${level}_approved_at`]: new Date().toISOString(),
        [`level_${level}_notes`]: notes,
      };
      const req = data.find((r: any) => r.id === id);
      if (req && level >= req.required_levels) {
        updates.status = 'approved';
      } else {
        updates.current_level = level + 1;
      }
      const { error } = await sb.from('fin_approval_requests').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-appr-req'] });
      toast({ title: 'Approval Recorded' });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await sb.from('fin_approval_requests').update({
        status: 'rejected',
        rejected_by: user?.id,
        rejected_by_name: user?.email,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-appr-req'] });
      toast({ title: 'Request Rejected' });
    },
  });

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_approval_requests').insert({
        ...input,
        company_id: companyId,
        requested_by: user?.id,
        requested_by_name: user?.email,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-appr-req'] }),
  });

  return { data, isLoading, approveLevel, reject, create };
}

// ============= Statement Designer =============
export function useStatementTemplates() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-stmt-tpl', companyId],
    queryFn: async () => {
      let q = sb.from('fin_statement_templates').select('*').order('framework').order('template_name');
      if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null,is_system.eq.true`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, company_id: input.is_system ? null : companyId, created_by: user?.id };
      const { error } = input.id
        ? await sb.from('fin_statement_templates').update(payload).eq('id', input.id)
        : await sb.from('fin_statement_templates').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-stmt-tpl'] });
      toast({ title: 'Template Saved' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_statement_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-stmt-tpl'] }),
  });

  return { data, isLoading, upsert, remove };
}

export function useStatementLines(templateId?: string) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-stmt-lines', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await sb.from('fin_statement_lines').select('*').eq('template_id', templateId).order('line_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!templateId,
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, template_id: templateId };
      const { error } = input.id
        ? await sb.from('fin_statement_lines').update(payload).eq('id', input.id)
        : await sb.from('fin_statement_lines').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-stmt-lines'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_statement_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-stmt-lines'] }),
  });

  return { data, isLoading, upsert, remove };
}

// ============= Audit Packs =============
export function useAuditPacks() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-audit-packs', companyId],
    queryFn: async () => {
      let q = sb.from('fin_audit_packs').select('*').order('fiscal_year', { ascending: false }).order('period_number', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_audit_packs').insert({
        ...input,
        company_id: companyId,
        prepared_by: user?.id,
        prepared_by_name: user?.email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-audit-packs'] });
      toast({ title: 'Audit Pack Created' });
    },
  });

  const review = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_audit_packs').update({
        status: 'reviewed',
        reviewed_by: user?.id,
        reviewed_by_name: user?.email,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-audit-packs'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_audit_packs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-audit-packs'] }),
  });

  return { data, isLoading, create, review, remove };
}

export function useAuditPackEvidence(packId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-audit-evidence', packId],
    queryFn: async () => {
      if (!packId) return [];
      const { data, error } = await sb.from('fin_audit_pack_evidence').select('*').eq('pack_id', packId).order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!packId,
  });

  const add = useMutation({
    mutationFn: async (input: any) => {
      const { error } = await sb.from('fin_audit_pack_evidence').insert({
        ...input,
        pack_id: packId,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-audit-evidence'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_audit_pack_evidence').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-audit-evidence'] }),
  });

  return { data, isLoading, add, remove };
}

// ============= Tax Localization =============
export function useTaxLocalization(countryCode?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-tax-loc', countryCode],
    queryFn: async () => {
      let q = sb.from('fin_tax_localization').select('*').order('country_code').order('rule_name');
      if (countryCode) q = q.eq('country_code', countryCode);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const { error } = input.id
        ? await sb.from('fin_tax_localization').update(input).eq('id', input.id)
        : await sb.from('fin_tax_localization').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-tax-loc'] });
      toast({ title: 'Tax Rule Saved' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('fin_tax_localization').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fin-tax-loc'] }),
  });

  return { data, isLoading, upsert, remove };
}

// ============= Close Readiness (Controller Dashboard) =============
export function useCloseReadiness() {
  const companyId = useCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ['fin-close-rd', companyId],
    queryFn: async () => {
      let q = sb.from('fin_close_readiness').select('*').order('snapshot_date', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const snapshot = useMutation({
    mutationFn: async (input: any) => {
      const total = (input.checklist_total ?? 0);
      const done = (input.checklist_completed ?? 0);
      const blockerPenalty =
        (input.unposted_je_count ?? 0) * 2 +
        (input.unbalanced_je_count ?? 0) * 5 +
        (input.pending_approvals ?? 0) * 1 +
        (input.open_recon_items ?? 0) * 1 +
        (input.ic_unmatched ?? 0) * 2;
      const baseScore = total > 0 ? (done / total) * 100 : 0;
      const readiness_score = Math.max(0, Math.min(100, baseScore - blockerPenalty));
      const status = readiness_score >= 95 ? 'ready' : readiness_score >= 70 ? 'in_progress' : 'blocked';

      const { error } = await sb.from('fin_close_readiness').insert({
        ...input,
        company_id: companyId,
        readiness_score,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-close-rd'] });
      toast({ title: 'Readiness Snapshot Captured' });
    },
  });

  return { data, isLoading, snapshot };
}
