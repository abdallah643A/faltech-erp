import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type IndustryPackKey =
  | 'construction' | 'manufacturing' | 'fleet'
  | 'hospital' | 'restaurant' | 'retail_pos' | 'education';

export interface IndustryPack {
  id: string;
  pack_key: IndustryPackKey;
  pack_name: string;
  pack_name_ar?: string;
  description?: string;
  category: string;
  status: 'core' | 'active' | 'optional' | 'beta';
  version: string;
  route_prefixes: string[];
  features: string[];
  is_premium: boolean;
  default_enabled: boolean;
}

/**
 * useIndustryPacks
 * --------------------------------
 * Resolves which industry packs are enabled for the active company.
 *
 * Resolution order (per pack):
 * 1. Tenant activation row (`tenants_industry_activations.is_active`).
 * 2. Catalog `default_enabled` flag — used when no tenant row exists yet.
 *
 * Use `isPackEnabled(key)` to gate a route/sidebar entry, or
 * `isRouteEnabled(path)` to gate by route prefix (handles nested routes).
 */
export function useIndustryPacks() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const packs = useQuery({
    queryKey: ['industry-packs'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('industry_packs' as any) as any)
        .select('*').order('category').order('pack_name');
      if (error) throw error;
      return (data ?? []) as IndustryPack[];
    },
  });

  const activations = useQuery({
    queryKey: ['industry-activations', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('tenants_industry_activations' as any) as any)
        .select('*').eq('company_id', activeCompanyId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const setActivation = useMutation({
    mutationFn: async (vars: { pack_key: IndustryPackKey; is_active: boolean; notes?: string }) => {
      if (!activeCompanyId) throw new Error('No active company');
      const payload: any = {
        company_id: activeCompanyId,
        pack_key: vars.pack_key,
        is_active: vars.is_active,
        notes: vars.notes,
      };
      if (vars.is_active) {
        payload.activated_at = new Date().toISOString();
        payload.activated_by = user?.id;
      } else {
        payload.deactivated_at = new Date().toISOString();
        payload.deactivated_by = user?.id;
      }
      const { error } = await (supabase.from('tenants_industry_activations' as any) as any)
        .upsert(payload, { onConflict: 'company_id,pack_key' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['industry-activations', activeCompanyId] });
      toast.success(vars.is_active ? 'Industry pack enabled' : 'Industry pack disabled');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const isPackEnabled = (key: IndustryPackKey): boolean => {
    const pack = (packs.data ?? []).find(p => p.pack_key === key);
    if (!pack) return false;
    if (pack.status === 'core') return true;
    const tenantRow = (activations.data ?? []).find((a: any) => a.pack_key === key);
    if (tenantRow) return !!tenantRow.is_active;
    return !!pack.default_enabled;
  };

  const isRouteEnabled = (pathname: string): boolean => {
    // Find any pack whose route_prefixes match this path
    for (const pack of packs.data ?? []) {
      for (const prefix of pack.route_prefixes ?? []) {
        if (pathname === prefix || pathname.startsWith(prefix + '/')) {
          return isPackEnabled(pack.pack_key);
        }
      }
    }
    // Path not owned by any pack — allowed (core ERP route)
    return true;
  };

  return {
    packs, activations, setActivation,
    isPackEnabled, isRouteEnabled,
    loading: packs.isLoading || activations.isLoading,
  };
}
