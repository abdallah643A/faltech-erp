import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Tenants ────────────────────────────────────────────────────
export const useSaasTenants = () =>
  useQuery({
    queryKey: ['saas-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_tenants')
        .select('*, saas_tenant_subscriptions(*, saas_subscription_plans(*)), saas_seat_licenses(count), saas_tenant_modules(count), saas_tenant_companies(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useSaasTenant = (id?: string) =>
  useQuery({
    queryKey: ['saas-tenant', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_tenants')
        .select('*, saas_tenant_subscriptions(*, saas_subscription_plans(*))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useCreateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenant: any) => {
      const { data, error } = await supabase.from('saas_tenants').insert(tenant).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-tenants'] }); toast.success('Client created'); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('saas_tenants').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-tenants'] }); toast.success('Client updated'); },
    onError: (e: any) => toast.error(e.message),
  });
};

// ─── Plans ──────────────────────────────────────────────────────
export const useSaasPlans = () =>
  useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saas_subscription_plans').select('*, saas_plan_modules(*, saas_module_definitions(*))').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await supabase.from('saas_subscription_plans').insert(plan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-plans'] }); toast.success('Plan created'); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from('saas_subscription_plans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-plans'] }); toast.success('Plan updated'); },
    onError: (e: any) => toast.error(e.message),
  });
};

// ─── Module Definitions ─────────────────────────────────────────
export const useSaasModules = () =>
  useQuery({
    queryKey: ['saas-module-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saas_module_definitions').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

// ─── Tenant Modules ─────────────────────────────────────────────
export const useTenantModules = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-tenant-modules', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_tenant_modules')
        .select('*, saas_module_definitions(*)')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

export const useToggleTenantModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, moduleId, status }: { tenantId: string; moduleId: string; status: string }) => {
      const { data: existing } = await supabase
        .from('saas_tenant_modules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('saas_tenant_modules').update({ status, disabled_at: status === 'disabled' ? new Date().toISOString() : null }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saas_tenant_modules').insert({ tenant_id: tenantId, module_id: moduleId, status });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-tenant-modules'] }); toast.success('Module updated'); },
    onError: (e: any) => toast.error(e.message),
  });
};

// ─── Tenant Companies ───────────────────────────────────────────
export const useTenantCompanies = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-tenant-companies', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_tenant_companies')
        .select('*, sap_companies:company_id(id, company_name)')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

// ─── Seat Licenses ──────────────────────────────────────────────
export const useTenantSeats = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-tenant-seats', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_seat_licenses')
        .select('*, profiles:user_id(email, full_name)')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

// ─── Tenant Subscriptions ───────────────────────────────────────
export const useTenantSubscription = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-tenant-subscription', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_tenant_subscriptions')
        .select('*, saas_subscription_plans(*)')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

export const useUpsertSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: any) => {
      const { data, error } = await supabase.from('saas_tenant_subscriptions').upsert(sub, { onConflict: 'tenant_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saas-tenant-subscription'] });
      qc.invalidateQueries({ queryKey: ['saas-tenants'] });
      toast.success('Subscription updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ─── Feature Entitlements ───────────────────────────────────────
export const useTenantFeatures = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-tenant-features', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('saas_feature_entitlements').select('*').eq('tenant_id', tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

// ─── Audit Logs ─────────────────────────────────────────────────
export const useSaasAuditLogs = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-audit-logs', tenantId],
    queryFn: async () => {
      let q = supabase.from('saas_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

// ─── Usage Records ──────────────────────────────────────────────
export const useSaasUsage = (tenantId?: string) =>
  useQuery({
    queryKey: ['saas-usage', tenantId],
    queryFn: async () => {
      let q = supabase.from('saas_usage_records').select('*').order('recorded_at', { ascending: false }).limit(100);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
