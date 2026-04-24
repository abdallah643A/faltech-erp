import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

export interface PackTemplate {
  id: string;
  pack_key: string;
  template_key: string;
  template_name: string;
  template_name_ar?: string;
  description?: string;
  version: string;
  seed_payload: Record<string, any>;
  is_active: boolean;
}

export interface PackFeatureFlag {
  id: string;
  pack_key: string;
  flag_key: string;
  flag_name: string;
  flag_name_ar?: string;
  description?: string;
  default_enabled: boolean;
  is_premium: boolean;
}

export interface PackDependency {
  id: string;
  pack_key: string;
  depends_on_pack_key: string;
  is_hard: boolean;
  notes?: string;
}

export interface PackInstallation {
  id: string;
  company_id: string;
  pack_key: string;
  template_id: string;
  version: string;
  install_status: 'pending' | 'installing' | 'installed' | 'failed';
  seeded_records: Record<string, number>;
  installed_at?: string;
}

/**
 * usePackTemplates
 * --------------------------------
 * PR2 of industry isolation: surfaces the catalog of installable
 * templates, dependency declarations, feature flags, and tenant
 * installations + override state.
 */
export function usePackTemplates() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const templates = useQuery({
    queryKey: ['pack-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('industry_pack_templates' as any) as any)
        .select('*').eq('is_active', true).order('pack_key').order('template_name');
      if (error) throw error;
      return (data ?? []) as PackTemplate[];
    },
  });

  const dependencies = useQuery({
    queryKey: ['pack-dependencies'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('industry_pack_dependencies' as any) as any)
        .select('*');
      if (error) throw error;
      return (data ?? []) as PackDependency[];
    },
  });

  const featureFlags = useQuery({
    queryKey: ['pack-feature-flags'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('industry_pack_feature_flags' as any) as any)
        .select('*').order('pack_key').order('flag_name');
      if (error) throw error;
      return (data ?? []) as PackFeatureFlag[];
    },
  });

  const overrides = useQuery({
    queryKey: ['pack-feature-overrides', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenants_pack_feature_overrides' as any) as any)
        .select('*').eq('company_id', activeCompanyId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const installations = useQuery({
    queryKey: ['pack-installations', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenants_pack_installations' as any) as any)
        .select('*').eq('company_id', activeCompanyId);
      if (error) throw error;
      return (data ?? []) as PackInstallation[];
    },
  });

  const installTemplate = useMutation({
    mutationFn: async (template_id: string) => {
      if (!activeCompanyId) throw new Error('No active company');
      const { data, error } = await supabase.functions.invoke('install-industry-pack-template', {
        body: { template_id, company_id: activeCompanyId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pack-installations', activeCompanyId] });
      qc.invalidateQueries({ queryKey: ['industry-activations', activeCompanyId] });
      toast.success('Template installed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Install failed'),
  });

  const setFeatureOverride = useMutation({
    mutationFn: async (vars: { pack_key: string; flag_key: string; is_enabled: boolean }) => {
      if (!activeCompanyId) throw new Error('No active company');
      const { error } = await (supabase.from('tenants_pack_feature_overrides' as any) as any)
        .upsert({ company_id: activeCompanyId, ...vars }, { onConflict: 'company_id,pack_key,flag_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pack-feature-overrides', activeCompanyId] });
      toast.success('Feature flag updated');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const isFeatureEnabled = (pack_key: string, flag_key: string): boolean => {
    const ovr = (overrides.data ?? []).find(
      (o: any) => o.pack_key === pack_key && o.flag_key === flag_key
    );
    if (ovr) return !!ovr.is_enabled;
    const flag = (featureFlags.data ?? []).find(
      f => f.pack_key === pack_key && f.flag_key === flag_key
    );
    return !!flag?.default_enabled;
  };

  const isInstalled = (template_id: string): boolean =>
    (installations.data ?? []).some(i => i.template_id === template_id && i.install_status === 'installed');

  return {
    templates, dependencies, featureFlags, overrides, installations,
    installTemplate, setFeatureOverride, isFeatureEnabled, isInstalled,
    loading: templates.isLoading || dependencies.isLoading || featureFlags.isLoading,
  };
}
