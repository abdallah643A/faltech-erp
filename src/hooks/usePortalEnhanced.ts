import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const tbl = (n: string) => supabase.from(n as any);

// ---------- Security policies ----------
export function usePortalSecurityPolicy(portalId?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portal-security-policy', portalId],
    enabled: !!portalId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_security_policies').select('*').eq('portal_id', portalId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, portal_id: portalId };
      const { data, error } = await tbl('portal_security_policies').upsert(payload, { onConflict: 'portal_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-security-policy', portalId] }); toast.success('Security policy saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

// ---------- Login attempts (heatmap) ----------
export function usePortalLoginAttempts(portalId?: string, days = 30) {
  return useQuery({
    queryKey: ['portal-login-attempts', portalId, days],
    enabled: !!portalId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await tbl('portal_login_attempts').select('*').eq('portal_id', portalId).gte('attempted_at', since).order('attempted_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---------- Translations ----------
export function usePortalTranslations(portalId?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portal-translations', portalId],
    enabled: !!portalId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_translations').select('*').eq('portal_id', portalId).order('translation_key');
      if (error) throw error;
      return data as any[];
    },
  });
  const upsert = useMutation({
    mutationFn: async (input: { locale: string; translation_key: string; translation_value: string }) => {
      const { data, error } = await tbl('portal_translations').upsert({ ...input, portal_id: portalId }, { onConflict: 'portal_id,locale,translation_key' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-translations', portalId] }); toast.success('Translation saved'); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl('portal_translations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-translations', portalId] }),
  });
  return { ...list, upsert, remove };
}

// ---------- Service requests ----------
export function usePortalServiceRequests(portalId?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portal-service-requests', portalId],
    queryFn: async () => {
      let q = tbl('portal_service_requests').select('*').order('created_at', { ascending: false });
      if (portalId) q = q.eq('portal_id', portalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === 'resolved') patch.resolved_at = new Date().toISOString();
      const { error } = await tbl('portal_service_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-service-requests'] }); toast.success('Updated'); },
  });
  return { ...list, updateStatus };
}

// ---------- Subscription requests ----------
export function usePortalSubscriptionRequests() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portal-subscription-requests'],
    queryFn: async () => {
      const { data, error } = await tbl('portal_subscription_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const decide = useMutation({
    mutationFn: async ({ id, status, decision_notes }: { id: string; status: 'approved' | 'rejected'; decision_notes?: string }) => {
      const { error } = await tbl('portal_subscription_requests').update({ status, decision_notes, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-subscription-requests'] }); toast.success('Decision recorded'); },
  });
  return { ...list, decide };
}

// ---------- Tenant SSO ----------
export function useTenantSSO(tenantId?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['tenant-sso', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await tbl('tenant_sso_configs').select('*').eq('tenant_id', tenantId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const upsert = useMutation({
    mutationFn: async (input: any) => {
      const payload = { ...input, tenant_id: tenantId };
      const { data, error } = await tbl('tenant_sso_configs').upsert(payload, { onConflict: 'tenant_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-sso', tenantId] }); toast.success('SSO configuration saved'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { ...list, upsert };
}

// ---------- RFQ AI normalization ----------
export function useRfqNormalize() {
  return useMutation({
    mutationFn: async (input: { rfq_id: string; responses: any[] }) => {
      const { data, error } = await supabase.functions.invoke('portal-rfq-normalize', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: () => toast.success('Bids normalized'),
    onError: (e: any) => toast.error(e.message ?? 'Normalization failed'),
  });
}

export function useRfqNormalizations(rfqId?: string) {
  return useQuery({
    queryKey: ['rfq-normalizations', rfqId],
    enabled: !!rfqId,
    queryFn: async () => {
      const { data, error } = await tbl('portal_rfq_ai_normalizations').select('*').eq('rfq_id', rfqId).order('normalized_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---------- Activity feed ----------
export function usePortalActivityFeed(filters?: { portal_id?: string; tenant_id?: string; limit?: number }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['portal-activity-feed', filters],
    queryFn: async () => {
      let q = tbl('portal_activity_feed').select('*').order('created_at', { ascending: false }).limit(filters?.limit ?? 100);
      if (filters?.portal_id) q = q.eq('portal_id', filters.portal_id);
      if (filters?.tenant_id) q = q.eq('tenant_id', filters.tenant_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tbl('portal_activity_feed').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-activity-feed'] }),
  });
  return { ...list, markRead };
}

// ---------- Tenant analytics aggregated ----------
export function useTenantAnalytics(tenantId?: string) {
  return useQuery({
    queryKey: ['tenant-analytics', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [seats, subs, activity, srs] = await Promise.all([
        tbl('saas_seat_assignments').select('id, status').eq('tenant_id', tenantId),
        tbl('saas_tenant_subscriptions').select('*').eq('tenant_id', tenantId),
        tbl('portal_activity_feed').select('id, event_type, created_at').eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        tbl('portal_subscription_requests').select('id, status').eq('tenant_id', tenantId),
      ]);
      return {
        seats: seats.data ?? [],
        subscriptions: subs.data ?? [],
        activity: activity.data ?? [],
        subscription_requests: srs.data ?? [],
      };
    },
  });
}
