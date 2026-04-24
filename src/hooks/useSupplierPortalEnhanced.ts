import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const SENSITIVE_FIELDS = ['bank_account', 'iban', 'swift', 'tax_id', 'vat_number', 'legal_name', 'registration_number', 'beneficiary_name'];
export const isSensitiveField = (k: string) => SENSITIVE_FIELDS.includes(k);

// ---------- Prequalification ----------
export function usePrequalAssessments(applicationId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['preq-assessments', activeCompanyId, applicationId],
    queryFn: async () => {
      let q: any = supabase.from('supplier_prequalification_assessments' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (applicationId) q = q.eq('application_id', applicationId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePrequalActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { data, error } = await (supabase.from('supplier_prequalification_assessments' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['preq-assessments'] }); toast({ title: 'Assessment created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveAnswers = useMutation({
    mutationFn: async ({ assessmentId, answers }: { assessmentId: string; answers: any[] }) => {
      await supabase.from('supplier_prequalification_answers' as any).delete().eq('assessment_id', assessmentId);
      const rows = answers.map(a => ({ ...a, assessment_id: assessmentId }));
      if (rows.length) {
        const { error } = await supabase.from('supplier_prequalification_answers' as any).insert(rows);
        if (error) throw error;
      }
      const total = answers.reduce((s, a) => s + (Number(a.weighted_score) || 0), 0);
      const max = answers.reduce((s, a) => s + (Number(a.weight) || 1) * 5, 0);
      const pct = max > 0 ? (total / max) * 100 : 0;
      const risk_level = pct >= 80 ? 'low' : pct >= 60 ? 'medium' : pct >= 40 ? 'high' : 'critical';
      await supabase.from('supplier_prequalification_assessments' as any).update({
        total_score: total, max_score: max, score_pct: pct, risk_level, updated_at: new Date().toISOString(),
      }).eq('id', assessmentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preq-assessments'] }),
  });

  const generateAIRisk = useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data, error } = await supabase.functions.invoke('supplier-prequal-risk', { body: { assessment_id: assessmentId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['preq-assessments'] }); toast({ title: 'AI risk summary generated' }); },
    onError: (e: Error) => toast({ title: 'AI error', description: e.message, variant: 'destructive' }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('supplier_prequalification_assessments' as any).update({
        reviewer_decision: decision, reviewer_id: user?.id, reviewed_at: new Date().toISOString(),
        status: decision, updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['preq-assessments'] }); toast({ title: 'Decision recorded' }); },
  });

  return { create, saveAnswers, generateAIRisk, decide };
}

// ---------- Disputes ----------
export function useDisputes(filter?: { entity_type?: string; status?: string; portal_account_id?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['supplier-disputes', activeCompanyId, filter],
    queryFn: async () => {
      let q: any = supabase.from('supplier_disputes' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filter?.entity_type) q = q.eq('entity_type', filter.entity_type);
      if (filter?.status) q = q.eq('status', filter.status);
      if (filter?.portal_account_id) q = q.eq('portal_account_id', filter.portal_account_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDisputeMessages(disputeId?: string) {
  return useQuery({
    queryKey: ['dispute-messages', disputeId],
    queryFn: async () => {
      if (!disputeId) return [];
      const { data, error } = await supabase.from('supplier_dispute_messages' as any).select('*').eq('dispute_id', disputeId).order('created_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!disputeId,
  });
}

export function useDisputeActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const create = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...input, company_id: input.company_id || activeCompanyId, created_by: user?.id };
      const { data, error } = await (supabase.from('supplier_disputes' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-disputes'] }); toast({ title: 'Dispute opened' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reply = useMutation({
    mutationFn: async ({ dispute_id, sender_type, sender_name, message, attachments }: any) => {
      const { error } = await supabase.from('supplier_dispute_messages' as any).insert({
        dispute_id, sender_type, sender_name, message, attachments: attachments || [],
      });
      if (error) throw error;
      // mark first response if buyer replies first time
      if (sender_type === 'buyer') {
        await supabase.from('supplier_disputes' as any).update({
          first_response_at: new Date().toISOString(), status: 'in_review', updated_at: new Date().toISOString(),
        }).eq('id', dispute_id).is('first_response_at', null);
      }
    },
    onSuccess: (_d, v: any) => { qc.invalidateQueries({ queryKey: ['dispute-messages', v.dispute_id] }); qc.invalidateQueries({ queryKey: ['supplier-disputes'] }); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status: string; resolution_notes?: string }) => {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
      if (resolution_notes) patch.resolution_notes = resolution_notes;
      const { error } = await supabase.from('supplier_disputes' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-disputes'] }); toast({ title: 'Status updated' }); },
  });

  const escalate = useMutation({
    mutationFn: async ({ id, escalated_to }: { id: string; escalated_to?: string }) => {
      const { error } = await supabase.from('supplier_disputes' as any).update({
        status: 'escalated', escalated_at: new Date().toISOString(),
        escalated_to: escalated_to || null, escalation_level: 1, updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-disputes'] }); toast({ title: 'Dispute escalated' }); },
  });

  return { create, reply, updateStatus, escalate };
}

// ---------- Profile change requests ----------
export function useProfileChangeRequests(portalAccountId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['supplier-profile-changes', activeCompanyId, portalAccountId],
    queryFn: async () => {
      let q: any = supabase.from('supplier_profile_change_requests' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalAccountId) q = q.eq('portal_account_id', portalAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProfileChangeActions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const submit = useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await (supabase.from('supplier_profile_change_requests' as any).insert(input).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-profile-changes'] }); toast({ title: 'Profile change submitted for approval' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const review = useMutation({
    mutationFn: async ({ id, level, decision, reason }: { id: string; level: 'primary' | 'secondary'; decision: 'approved' | 'rejected'; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: any = { updated_at: new Date().toISOString() };
      if (level === 'primary') {
        patch.primary_reviewer_id = user?.id;
        patch.primary_reviewed_at = new Date().toISOString();
        patch.primary_decision = decision;
        if (decision === 'rejected') { patch.status = 'rejected'; patch.rejection_reason = reason; }
        else patch.status = 'approved_primary';
      } else {
        patch.secondary_reviewer_id = user?.id;
        patch.secondary_reviewed_at = new Date().toISOString();
        patch.secondary_decision = decision;
        if (decision === 'rejected') { patch.status = 'rejected'; patch.rejection_reason = reason; }
        else { patch.status = 'approved'; patch.applied_at = new Date().toISOString(); }
      }
      const { error } = await supabase.from('supplier_profile_change_requests' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-profile-changes'] }); toast({ title: 'Decision recorded' }); },
  });

  return { submit, review };
}

// ---------- Compliance items ----------
export function useComplianceItems(portalAccountId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['supplier-compliance', activeCompanyId, portalAccountId],
    queryFn: async () => {
      let q: any = supabase.from('supplier_compliance_items' as any).select('*').order('expiry_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalAccountId) q = q.eq('portal_account_id', portalAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useComplianceActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const upsert = useMutation({
    mutationFn: async (input: any) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from('supplier_compliance_items' as any).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('supplier_compliance_items' as any).insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-compliance'] }); toast({ title: 'Saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { upsert };
}

// ---------- Scorecard publications ----------
export function useScorecardPublications(vendorId?: string, portalAccountId?: string) {
  return useQuery({
    queryKey: ['supplier-scorecards-pub', vendorId, portalAccountId],
    queryFn: async () => {
      let q: any = supabase.from('supplier_scorecard_publications' as any).select('*').eq('is_visible_to_supplier', true).order('period_end', { ascending: false });
      if (vendorId) q = q.eq('vendor_id', vendorId);
      if (portalAccountId) q = q.eq('portal_account_id', portalAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
