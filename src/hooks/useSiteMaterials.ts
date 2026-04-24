import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useSiteInventory(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const inventory = useQuery({
    queryKey: ['site-inventory', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_site_inventory' as any).select('*').eq('project_id', projectId!).order('item_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_site_inventory' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['site-inventory'] }); toast({ title: 'Site inventory item added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_site_inventory' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-inventory'] }),
  });

  return { inventory, createItem, updateItem };
}

export function useSiteMaterialTxns(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const txns = useQuery({
    queryKey: ['site-material-txns', projectId, activeCompanyId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('cpms_site_material_txns' as any).select('*').eq('project_id', projectId!).order('txn_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createTxn = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_site_material_txns' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;

      // Update site inventory quantities
      if (data.site_inventory_id) {
        const field = data.txn_type === 'receipt' ? 'received_quantity' : 'consumed_quantity';
        const { data: current } = await supabase.from('cpms_site_inventory' as any).select(field).eq('id', data.site_inventory_id).single();
        if (current) {
          const newQty = ((current as any)[field] || 0) + data.quantity;
          await supabase.from('cpms_site_inventory' as any).update({ [field]: newQty }).eq('id', data.site_inventory_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-material-txns'] });
      qc.invalidateQueries({ queryKey: ['site-inventory'] });
      toast({ title: 'Transaction recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { txns, createTxn };
}

// Wastage calculation helper
export function calculateWastage(boqQty: number, consumedQty: number) {
  if (boqQty <= 0) return { wastagePct: 0, wasteQty: 0, status: 'ok' as const };
  const wasteQty = consumedQty - boqQty;
  const wastagePct = (wasteQty / boqQty) * 100;
  const status = wastagePct > 10 ? 'critical' as const : wastagePct > 5 ? 'warning' as const : 'ok' as const;
  return { wastagePct, wasteQty, status };
}
