import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

function makeHook(table: string, queryKey: string, orderBy = 'created_at') {
  return function useServiceData(filters?: Record<string, any>) {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { activeCompanyId } = useActiveCompany();

    const query = useQuery({
      queryKey: [queryKey, activeCompanyId, filters],
      queryFn: async () => {
        let q = (supabase.from(table as any).select('*') as any);
        if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
        if (filters) {
          Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== '') q = q.eq(k, v);
          });
        }
        const { data, error } = await q.order(orderBy, { ascending: false });
        if (error) throw error;
        return data as any[];
      },
    });

    const create = useMutation({
      mutationFn: async (item: any) => {
        const { data, error } = await (supabase.from(table as any).insert({ ...item, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single() as any);
        if (error) throw error;
        return data;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); toast({ title: 'Created successfully' }); },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });

    const update = useMutation({
      mutationFn: async ({ id, ...updates }: any) => {
        const { data, error } = await (supabase.from(table as any).update(updates).eq('id', id).select().single() as any);
        if (error) throw error;
        return data;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); toast({ title: 'Updated successfully' }); },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });

    const remove = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await (supabase.from(table as any).delete().eq('id', id) as any);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); toast({ title: 'Deleted' }); },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });

    return { ...query, create, update, remove };
  };
}

export const useServiceEquipment = makeHook('service_equipment', 'service-equipment');
export const useServiceContracts = makeHook('service_contracts', 'service-contracts');
export const useServiceContractLines = makeHook('service_contract_lines', 'service-contract-lines');
export const useServiceOrders = makeHook('service_orders', 'service-orders');
export const useServiceOrderLines = makeHook('service_order_lines', 'service-order-lines');
export const usePMPlans = makeHook('pm_plans', 'pm-plans');
export const useWarrantyClaims = makeHook('warranty_claims', 'warranty-claims');
export const useServiceKPISnapshots = makeHook('service_kpi_snapshots', 'service-kpis', 'snapshot_date');
