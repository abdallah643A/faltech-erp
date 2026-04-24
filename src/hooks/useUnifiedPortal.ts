import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export type PortalType = 'client' | 'supplier' | 'subcontractor' | 'saas_admin';

const tbl = (name: string) => supabase.from(name as any);
const rpc = (name: string, args: any) => (supabase.rpc as any)(name, args);

// ---------- Users ----------
export function usePortalUsers(portalType?: PortalType) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['portal-users', activeCompanyId, portalType],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = tbl('portal_users').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalType) q = q.eq('portal_type', portalType);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---------- Invitations ----------
export function usePortalInvitations(portalType?: PortalType) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['portal-invitations', activeCompanyId, portalType],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = tbl('portal_invitations').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalType) q = q.eq('portal_type', portalType);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { email: string; portal_type: PortalType; full_name?: string; external_party_id?: string; role_id?: string; expires_in_days?: number }) => {
      const { data, error } = await rpc('portal_create_invitation', {
        p_company_id: activeCompanyId,
        p_portal_type: input.portal_type,
        p_email: input.email,
        p_full_name: input.full_name ?? null,
        p_external_party_id: input.external_party_id ?? null,
        p_role_id: input.role_id ?? null,
        p_expires_in_days: input.expires_in_days ?? 14,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-invitations'] }); toast.success('Invitation sent'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl('portal_invitations').update({ status: 'revoked' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-invitations'] }); toast.success('Invitation revoked'); },
  });

  return { ...list, create, revoke };
}

// ---------- Roles ----------
export function usePortalRoles(portalType?: PortalType) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['portal-roles', activeCompanyId, portalType],
    queryFn: async () => {
      let q = tbl('portal_roles').select('*').order('role_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalType) q = q.eq('portal_type', portalType);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (role: any) => {
      const payload = { ...role, company_id: activeCompanyId };
      if (role.id) {
        const { id, ...rest } = payload;
        const { error } = await tbl('portal_roles').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await tbl('portal_roles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-roles'] }); toast.success('Role saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...list, upsert };
}

// ---------- Document exchanges ----------
export function usePortalDocumentExchanges(portalType?: PortalType) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['portal-doc-exchanges', activeCompanyId, portalType],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = tbl('portal_document_exchanges').select('*').order('shared_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalType) q = q.eq('portal_type', portalType);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await tbl('portal_document_exchanges').update({
        status, reviewer_notes: notes ?? null, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-doc-exchanges'] }); toast.success('Document updated'); },
  });

  return { ...list, updateStatus };
}

// ---------- RFQ responses ----------
export function usePortalRFQResponses() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['portal-rfq-responses', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_rfq_responses').select('*')
        .eq('company_id', activeCompanyId!).order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'shortlisted'|'awarded'|'rejected' }) => {
      const { error } = await tbl('portal_rfq_responses').update({
        status, decision_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-rfq-responses'] }); toast.success('Decision recorded'); },
  });

  return { ...list, decide };
}

// ---------- Approval tasks ----------
export function usePortalApprovalTasks(portalType?: PortalType) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['portal-approvals', activeCompanyId, portalType],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = tbl('portal_approval_tasks').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portalType) q = q.eq('portal_type', portalType);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved'|'rejected'|'escalated'; notes?: string }) => {
      const { error } = await tbl('portal_approval_tasks').update({
        status, decision_notes: notes ?? null, decided_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-approvals'] }); toast.success('Decision recorded'); },
  });

  return { ...list, decide };
}

// ---------- SaaS seats ----------
export function useSaasSeats(tenantSubscriptionId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['saas-seats', activeCompanyId, tenantSubscriptionId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = tbl('saas_seat_assignments').select('*').order('assigned_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (tenantSubscriptionId) q = q.eq('tenant_subscription_id', tenantSubscriptionId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const assign = useMutation({
    mutationFn: async (input: { tenant_subscription_id?: string; seat_label?: string; assigned_email: string; assigned_user_id?: string }) => {
      const { error } = await tbl('saas_seat_assignments').insert({
        company_id: activeCompanyId,
        tenant_subscription_id: input.tenant_subscription_id,
        seat_label: input.seat_label,
        assigned_email: input.assigned_email.toLowerCase().trim(),
        assigned_user_id: input.assigned_user_id ?? null,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-seats'] }); toast.success('Seat assigned'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl('saas_seat_assignments').update({
        status: 'revoked', revoked_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-seats'] }); toast.success('Seat revoked'); },
  });

  return { ...list, assign, revoke };
}

// ---------- Branding ----------
export function usePortalBranding(portalType: PortalType | 'all' = 'all') {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ['portal-branding', activeCompanyId, portalType],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_branding_profiles').select('*')
        .eq('company_id', activeCompanyId!).eq('portal_type', portalType).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const row = { ...payload, company_id: activeCompanyId, portal_type: portalType };
      const { error } = await tbl('portal_branding_profiles').upsert(row, { onConflict: 'company_id,portal_type' } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-branding'] }); toast.success('Branding saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...profile, upsert };
}

// ---------- Timeline ----------
export function usePortalTimeline(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['portal-timeline', entityType, entityId],
    enabled: !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_timeline_events').select('*')
        .eq('related_entity_type', entityType!)
        .eq('related_entity_id', entityId!)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useLogPortalTimeline() {
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (input: { portal_type: PortalType; portal_user_id?: string; entity_type: string; entity_id: string; event_type: string; event_label?: string; payload?: any }) => {
      const { error } = await rpc('portal_log_timeline', {
        p_company_id: activeCompanyId,
        p_portal_type: input.portal_type,
        p_portal_user_id: input.portal_user_id ?? null,
        p_related_entity_type: input.entity_type,
        p_related_entity_id: input.entity_id,
        p_event_type: input.event_type,
        p_event_label: input.event_label ?? null,
        p_payload: input.payload ?? {},
      });
      if (error) throw error;
    },
  });
}
