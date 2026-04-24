import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useMemo } from 'react';
import type { ComboboxOption } from '@/components/shared/LineFieldCombobox';

export function useTaxCodeOptions() {
  const { activeCompanyId } = useActiveCompany();
  const { data = [] } = useQuery({
    queryKey: ['tax-groups-list', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('tax_groups').select('tax_code, tax_name, tax_rate').eq('is_active', true).order('tax_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return useMemo<ComboboxOption[]>(() => data.map(t => ({ value: t.tax_code, label: `${t.tax_name} (${t.tax_rate}%)` })), [data]);
}

export function useWarehouseOptions() {
  const { activeCompanyId } = useActiveCompany();
  const { data = [] } = useQuery({
    queryKey: ['warehouses-list', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('warehouses').select('warehouse_code, warehouse_name').eq('is_active', true).order('warehouse_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return useMemo<ComboboxOption[]>(() => data.map(w => ({ value: w.warehouse_code, label: w.warehouse_name })), [data]);
}

export function useProjectOptions() {
  const { activeCompanyId } = useActiveCompany();
  const { data = [] } = useQuery({
    queryKey: ['projects-list', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('projects').select('code, name').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return useMemo<ComboboxOption[]>(() => data.filter(p => p.code).map(p => ({ value: p.code!, label: p.name })), [data]);
}

export function useDimensionOptions(dimensionType: string) {
  const { activeCompanyId } = useActiveCompany();
  const { data = [] } = useQuery({
    queryKey: ['dimensions-list', dimensionType, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('dimensions').select('cost_center, name').eq('dimension_type', dimensionType).eq('is_active', true).order('cost_center');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return useMemo<ComboboxOption[]>(() => data.map(d => ({ value: d.cost_center, label: d.name })), [data]);
}
