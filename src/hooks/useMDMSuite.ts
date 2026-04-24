import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

/**
 * useMDMSuite
 * --------------------------------
 * Master Data Governance hooks for Business Partners:
 * hierarchies, dedup, validation, credit, tax, addresses,
 * contacts, segmentation, stewardship, and change log.
 */

const sb: any = supabase;

async function logChange(bp_id: string, change_type: string, summary: string, extra: Record<string, any> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await sb.from('bp_change_log').insert({
    bp_id,
    change_type,
    change_summary: summary,
    changed_by: user?.id,
    changed_by_name: user?.email,
    ...extra,
  });
}

// ============ HIERARCHIES ============
export function useBPHierarchies(bp_id?: string) {
  return useQuery({
    queryKey: ['bp-hierarchies', bp_id],
    queryFn: async () => {
      let q = sb.from('bp_hierarchies').select('*').order('created_at', { ascending: false });
      if (bp_id) q = q.or(`parent_bp_id.eq.${bp_id},child_bp_id.eq.${bp_id}`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertHierarchy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_hierarchies').upsert(row).select().single();
      if (error) throw error;
      await logChange(row.child_bp_id, 'hierarchy', `Linked to parent ${row.parent_bp_id} as ${row.relationship_type}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-hierarchies'] }); toast.success('Hierarchy saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ DEDUP ============
export function useDedupRules() {
  return useQuery({
    queryKey: ['bp-dedup-rules'],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_dedup_rules').select('*').order('weight', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDedupCandidates(status: string = 'pending') {
  return useQuery({
    queryKey: ['bp-dedup-candidates', status],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_dedup_candidates').select('*').eq('status', status).order('match_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveDedup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, master_bp_id, notes }: { id: string; action: 'merged' | 'rejected' | 'ignored'; master_bp_id?: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('bp_dedup_candidates').update({
        status: action,
        master_bp_id,
        resolution_notes: notes,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      if (master_bp_id) await logChange(master_bp_id, 'dedup_merge', `Merged duplicate (candidate ${id})`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-dedup-candidates'] }); toast.success('Resolved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ VALIDATION POLICIES ============
export function useValidationPolicies() {
  return useQuery({
    queryKey: ['bp-validation-policies'],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_validation_policies').select('*').order('field_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertValidationPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_validation_policies').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-validation-policies'] }); toast.success('Policy saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ CREDIT PROFILES ============
export function useCreditProfiles() {
  return useQuery({
    queryKey: ['bp-credit-profiles'],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_credit_profiles').select('*').order('current_exposure', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCreditProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const available = (Number(row.credit_limit) || 0) - (Number(row.current_exposure) || 0);
      const { data, error } = await sb.from('bp_credit_profiles').upsert({ ...row, available_credit: available }).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'credit', `Credit limit set to ${row.credit_limit} ${row.currency || 'SAR'}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-credit-profiles'] }); toast.success('Credit profile saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ TAX REGISTRATIONS ============
export function useTaxRegistrations(bp_id?: string) {
  return useQuery({
    queryKey: ['bp-tax-registrations', bp_id],
    queryFn: async () => {
      let q = sb.from('bp_tax_registrations').select('*').order('created_at', { ascending: false });
      if (bp_id) q = q.eq('bp_id', bp_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTaxRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_tax_registrations').upsert(row).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'tax', `Registered ${row.registration_type} ${row.registration_number} (${row.country_code})`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-tax-registrations'] }); toast.success('Registration saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ ADDRESSES ============
export function useNormalizedAddresses(bp_id?: string) {
  return useQuery({
    queryKey: ['bp-addresses', bp_id],
    queryFn: async () => {
      let q = sb.from('bp_addresses_normalized').select('*').order('created_at', { ascending: false });
      if (bp_id) q = q.eq('bp_id', bp_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_addresses_normalized').upsert(row).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'address', `${row.address_type} address: ${row.city}, ${row.country_code}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-addresses'] }); toast.success('Address saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ['mdm-countries'],
    queryFn: async () => {
      const { data, error } = await sb.from('mdm_country_dictionary').select('*').order('name_en');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCities(country_code?: string) {
  return useQuery({
    queryKey: ['mdm-cities', country_code],
    enabled: !!country_code,
    queryFn: async () => {
      const { data, error } = await sb.from('mdm_city_dictionary').select('*').eq('country_code', country_code).order('name_en');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============ CONTACTS ============
export function useContactRoles(bp_id?: string) {
  return useQuery({
    queryKey: ['bp-contact-roles', bp_id],
    queryFn: async () => {
      let q = sb.from('bp_contact_roles').select('*').order('is_primary', { ascending: false });
      if (bp_id) q = q.eq('bp_id', bp_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_contact_roles').upsert(row).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'contact', `${row.role}: ${row.contact_name}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-contact-roles'] }); toast.success('Contact saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ SEGMENTATION ============
export function useSegments() {
  return useQuery({
    queryKey: ['bp-segments'],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_segments').select('*').order('segment_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_segments').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-segments'] }); toast.success('Segment saved'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAssignSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from('bp_segment_assignments').insert({ ...row, assigned_by: user?.id }).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'segment', `Assigned to segment ${row.segment_id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-segments'] }); toast.success('Segment assigned'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ STEWARDSHIP ============
export function useStewardshipOwners() {
  return useQuery({
    queryKey: ['bp-stewardship'],
    queryFn: async () => {
      const { data, error } = await sb.from('bp_stewardship_owners').select('*').order('assigned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssignSteward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await sb.from('bp_stewardship_owners').upsert(row, { onConflict: 'bp_id,domain' }).select().single();
      if (error) throw error;
      await logChange(row.bp_id, 'stewardship', `Assigned steward ${row.steward_name} for domain ${row.domain}`);

      // Mirror approval task into governance inbox (reuse existing module)
      try {
        await sb.from('workflow_task_inbox').insert({
          task_type: 'mdm_review',
          subject: `MDM stewardship assigned: BP ${row.bp_id}`,
          assignee_user_id: row.steward_user_id,
          priority: 'normal',
          status: 'pending',
          payload: { bp_id: row.bp_id, domain: row.domain },
        });
      } catch (e) {
        // Inbox may not exist in some envs; non-fatal
        console.warn('Inbox mirror skipped', e);
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bp-stewardship'] }); toast.success('Steward assigned'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ CHANGE LOG ============
export function useChangeLog(bp_id?: string, limit = 100) {
  return useQuery({
    queryKey: ['bp-change-log', bp_id, limit],
    queryFn: async () => {
      let q = sb.from('bp_change_log').select('*').order('created_at', { ascending: false }).limit(limit);
      if (bp_id) q = q.eq('bp_id', bp_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============ VALIDATION RUNNER ============
export function validateBP(bp: Record<string, any>, policies: any[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const p of policies) {
    if (!p.is_active) continue;
    const val = bp[p.field_name];
    let failed = false;
    switch (p.validation_type) {
      case 'required':
        failed = val === undefined || val === null || val === '';
        break;
      case 'regex':
        failed = val && p.validation_value ? !new RegExp(p.validation_value).test(String(val)) : false;
        break;
      case 'min_length':
        failed = val ? String(val).length < parseInt(p.validation_value || '0', 10) : false;
        break;
      case 'max_length':
        failed = val ? String(val).length > parseInt(p.validation_value || '999', 10) : false;
        break;
    }
    if (failed) {
      const msg = p.error_message || `${p.field_name} failed ${p.validation_type}`;
      if (p.severity === 'error') errors.push(msg);
      else warnings.push(msg);
    }
  }
  return { errors, warnings };
}
