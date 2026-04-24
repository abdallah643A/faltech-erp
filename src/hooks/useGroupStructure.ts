import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrgCountry {
  code: string;
  name_en: string;
  name_ar: string | null;
  default_currency: string;
  default_language: string;
  default_timezone: string;
  vat_required: boolean;
  einvoicing_standard: string | null;
  is_active: boolean;
}

export interface SapCompany {
  id: string;
  company_name: string;
  country_code: string | null;
  default_branch_id: string | null;
  default_language: string | null;
  base_currency: string | null;
  timezone: string | null;
  fiscal_year_start_month: number | null;
  is_active: boolean | null;
  is_default: boolean | null;
}

export interface OrgBranch {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  company_id: string;
  country_code: string | null;
  language: string | null;
  timezone: string | null;
  is_default: boolean;
  is_active: boolean;
}

export function useCountries() {
  return useQuery({
    queryKey: ['org-countries'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('org_countries').select('*').order('name_en');
      if (error) throw error;
      return (data || []) as OrgCountry[];
    },
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ['group-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sap_companies')
        .select('id, company_name, country_code, default_branch_id, default_language, base_currency, timezone, fiscal_year_start_month, is_active, is_default')
        .order('company_name');
      if (error) throw error;
      return (data || []) as SapCompany[];
    },
  });
}

export function useBranches(companyId?: string) {
  return useQuery({
    queryKey: ['group-branches', companyId],
    queryFn: async () => {
      let q: any = supabase.from('branches').select('id, name, name_ar, code, company_id, country_code, language, timezone, is_default, is_active');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q.order('sort_order').order('name');
      if (error) throw error;
      return (data || []) as OrgBranch[];
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<SapCompany> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from('sap_companies').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-companies'] });
      toast.success('Company updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<OrgBranch> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from('branches').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-branches'] });
      toast.success('Branch updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<OrgCountry> & { code: string }) => {
      const { error } = await (supabase as any).from('org_countries').upsert(c, { onConflict: 'code' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-countries'] });
      toast.success('Country saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCompanyLanguages(companyId?: string) {
  return useQuery({
    queryKey: ['company-languages', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('org_company_languages').select('*').eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

export function useCompanyCurrencies(companyId?: string) {
  return useQuery({
    queryKey: ['company-currencies', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('org_company_currencies').select('*').eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

export function useToggleCompanyLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, code, enable }: { companyId: string; code: string; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase as any).from('org_company_languages').upsert(
          { company_id: companyId, language_code: code, is_active: true },
          { onConflict: 'company_id,language_code' }
        );
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('org_company_languages').delete()
          .eq('company_id', companyId).eq('language_code', code);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['company-languages', v.companyId] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleCompanyCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, code, enable }: { companyId: string; code: string; enable: boolean }) => {
      if (enable) {
        const { error } = await (supabase as any).from('org_company_currencies').upsert(
          { company_id: companyId, currency_code: code, is_active: true },
          { onConflict: 'company_id,currency_code' }
        );
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('org_company_currencies').delete()
          .eq('company_id', companyId).eq('currency_code', code);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['company-currencies', v.companyId] }),
    onError: (e: any) => toast.error(e.message),
  });
}
