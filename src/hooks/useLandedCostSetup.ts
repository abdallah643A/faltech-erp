import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// ─── LC Documents ───
export function useLCDocuments() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['lc-docs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('lc_documents' as any).select('*').order('created_at', { ascending: false })) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (doc: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...doc, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { data, error } = await (supabase.from('lc_documents' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-docs'] }); toast.success('LC document created'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('lc_documents' as any).update({ ...rest, updated_by: user?.id }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-docs'] }); toast.success('Updated'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('lc_documents' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-docs'] }); toast.success('Deleted'); },
  });

  return { ...query, create, update, remove };
}

// ─── Source Documents ───
export function useLCSourceDocs(lcDocId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['lc-source-docs', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_source_documents' as any).select('*').eq('lc_document_id', lcDocId).order('created_at') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });

  const add = useMutation({
    mutationFn: async (doc: any) => {
      const { data, error } = await (supabase.from('lc_source_documents' as any).insert({ ...doc, lc_document_id: lcDocId }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-source-docs', lcDocId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('lc_source_documents' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-source-docs', lcDocId] }),
  });

  return { ...query, add, remove };
}

// ─── Item Lines ───
export function useLCItemLines(lcDocId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['lc-item-lines', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_item_lines' as any).select('*').eq('lc_document_id', lcDocId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });

  const upsert = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await (supabase.from('lc_item_lines' as any).upsert({ ...item, lc_document_id: lcDocId }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-item-lines', lcDocId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('lc_item_lines' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-item-lines', lcDocId] }),
  });

  return { ...query, upsert, remove };
}

// ─── Charge Lines ───
export function useLCChargeLines(lcDocId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['lc-charge-lines', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_charge_lines' as any).select('*').eq('lc_document_id', lcDocId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });

  const upsert = useMutation({
    mutationFn: async (charge: any) => {
      const { data, error } = await (supabase.from('lc_charge_lines' as any).upsert({ ...charge, lc_document_id: lcDocId }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-charge-lines', lcDocId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('lc_charge_lines' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-charge-lines', lcDocId] }),
  });

  return { ...query, upsert, remove };
}

// ─── Allocations ───
export function useLCAllocations(lcDocId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['lc-allocations', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_allocations' as any).select('*').eq('lc_document_id', lcDocId) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });

  const bulkSave = useMutation({
    mutationFn: async (allocations: any[]) => {
      // Delete existing then insert new
      await (supabase.from('lc_allocations' as any).delete().eq('lc_document_id', lcDocId) as any);
      if (allocations.length > 0) {
        const { error } = await (supabase.from('lc_allocations' as any).insert(allocations.map(a => ({ ...a, lc_document_id: lcDocId }))) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc-allocations', lcDocId] }),
  });

  return { ...query, bulkSave };
}

// ─── Approval History ───
export function useLCApprovals(lcDocId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['lc-approvals', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_approval_history' as any).select('*').eq('lc_document_id', lcDocId).order('acted_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });

  const addAction = useMutation({
    mutationFn: async (action: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('lc_approval_history' as any).insert({
        ...action, lc_document_id: lcDocId, acted_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-approvals', lcDocId] }); qc.invalidateQueries({ queryKey: ['lc-docs'] }); },
  });

  return { ...query, addAction };
}

// ─── Account Mappings ───
export function useLCAccountMappings() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['lc-account-mappings', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('lc_account_mappings' as any).select('*').order('charge_category')) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (mapping: any) => {
      const { error } = await (supabase.from('lc_account_mappings' as any).upsert({
        ...mapping, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-account-mappings'] }); toast.success('Account mapping saved'); },
  });

  return { ...query, upsert };
}

// ─── Control Settings ───
export function useLCSettings() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['lc-settings', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('lc_control_settings' as any).select('*')) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const save = useMutation({
    mutationFn: async (settings: any) => {
      const { error } = await (supabase.from('lc_control_settings' as any).upsert({
        ...settings, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lc-settings'] }); toast.success('Settings saved'); },
  });

  return { ...query, save };
}

// ─── Audit Logs ───
export function useLCAuditLogs(lcDocId?: string) {
  return useQuery({
    queryKey: ['lc-audit-logs', lcDocId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('lc_audit_logs' as any).select('*').eq('lc_document_id', lcDocId).order('changed_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!lcDocId,
  });
}

// ─── Allocation Calculation Engine ───
export type AllocationMethod = 'by_quantity' | 'by_weight' | 'by_volume' | 'by_value' | 'by_customs_value' | 'by_packages' | 'equal' | 'manual';

export function calculateAllocations(
  chargeLines: any[],
  itemLines: any[],
): any[] {
  if (!chargeLines.length || !itemLines.length) return [];

  const allocations: any[] = [];

  for (const charge of chargeLines) {
    if (charge.treatment === 'expense') continue; // expense-only, don't allocate to inventory

    const method: AllocationMethod = charge.allocation_method || 'by_value';
    const totalCharge = Number(charge.total_charge) || 0;
    if (totalCharge <= 0) continue;

    // Calculate basis for each item
    let basisValues: number[] = [];
    switch (method) {
      case 'by_quantity':
        basisValues = itemLines.map(i => Number(i.received_qty) || 0);
        break;
      case 'by_weight':
        basisValues = itemLines.map(i => Number(i.weight) || 0);
        break;
      case 'by_volume':
        basisValues = itemLines.map(i => Number(i.volume) || 0);
        break;
      case 'by_value':
        basisValues = itemLines.map(i => Number(i.base_line_amount) || 0);
        break;
      case 'by_customs_value':
        basisValues = itemLines.map(i => Number(i.customs_value) || 0);
        break;
      case 'by_packages':
        basisValues = itemLines.map(i => Number(i.num_packages) || 0);
        break;
      case 'equal':
        basisValues = itemLines.map(() => 1);
        break;
      case 'manual':
        basisValues = itemLines.map(i => Number(i.manual_factor) || 0);
        break;
    }

    const totalBasis = basisValues.reduce((s, v) => s + v, 0);
    if (totalBasis <= 0) continue;

    let allocated = 0;
    itemLines.forEach((item, idx) => {
      const pct = basisValues[idx] / totalBasis;
      const isLast = idx === itemLines.length - 1;
      const amount = isLast ? (totalCharge - allocated) : Math.round(totalCharge * pct * 100) / 100;
      allocated += amount;

      allocations.push({
        charge_line_id: charge.id,
        item_line_id: item.id,
        allocation_basis: basisValues[idx],
        allocation_pct: Math.round(pct * 10000) / 100,
        allocated_amount: amount,
      });
    });
  }

  return allocations;
}

export function computeItemTotals(itemLines: any[], allocations: any[]) {
  return itemLines.map(item => {
    const itemAllocs = allocations.filter(a => a.item_line_id === item.id);
    const totalAllocated = itemAllocs.reduce((s, a) => s + (Number(a.allocated_amount) || 0), 0);
    const baseAmount = Number(item.base_line_amount) || 0;
    const qty = Number(item.received_qty) || 1;
    const finalLineCost = baseAmount + totalAllocated;
    const finalUnitCost = finalLineCost / qty;
    const variance = totalAllocated;
    const variancePct = baseAmount > 0 ? (totalAllocated / baseAmount) * 100 : 0;

    return {
      ...item,
      allocated_landed_cost: totalAllocated,
      final_unit_cost: Math.round(finalUnitCost * 100) / 100,
      final_line_cost: Math.round(finalLineCost * 100) / 100,
      inventory_value_impact: totalAllocated,
      variance_amount: Math.round(variance * 100) / 100,
      variance_pct: Math.round(variancePct * 100) / 100,
    };
  });
}
