import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useProjectProcurement(projectId: string | null) {
  const { activeCompanyId } = useActiveCompany();

  const projects = useQuery({
    queryKey: ['construction-projects', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('projects')
        .select('id, name, code, status, budget, actual_cost, current_phase, contract_value, project_type')
        .order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const purchaseRequests = useQuery({
    queryKey: ['project-prs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const quotations = useQuery({
    queryKey: ['project-pqs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_quotations')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const purchaseOrders = useQuery({
    queryKey: ['project-pos', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const goodsReceipts = useQuery({
    queryKey: ['project-grpos', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_receipts')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const apInvoices = useQuery({
    queryKey: ['project-ap-invoices', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_invoices')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const cbsItems = useQuery({
    queryKey: ['project-cbs', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_cbs_items' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order');
      if (error) return [];
      return data as any[];
    },
  });

  // Budget analysis
  const getBudgetSummary = () => {
    const project = projects.data?.find((p: any) => p.id === projectId);
    const pos = purchaseOrders.data || [];
    const invoices = apInvoices.data || [];
    const cbs = cbsItems.data || [];

    const totalBudget = project?.budget || project?.contract_value || 0;
    const committedPO = pos
      .filter((po: any) => po.status !== 'cancelled')
      .reduce((s: number, po: any) => s + (po.total || 0), 0);
    const invoicedAmount = invoices
      .filter((inv: any) => inv.status !== 'cancelled')
      .reduce((s: number, inv: any) => s + (inv.total || 0), 0);
    const remainingBudget = totalBudget - committedPO;
    const utilizationPct = totalBudget > 0 ? (committedPO / totalBudget) * 100 : 0;

    // CBS breakdown
    const cbsBudget = cbs.reduce((s: number, c: any) => s + (c.budget_amount || 0), 0);
    const cbsActual = cbs.reduce((s: number, c: any) => s + (c.actual_amount || 0), 0);

    return {
      totalBudget,
      committedPO,
      invoicedAmount,
      remainingBudget,
      utilizationPct,
      cbsBudget,
      cbsActual,
      cbsVariance: cbsBudget - cbsActual,
    };
  };

  // Phase breakdown from POs
  const getPhaseProcurement = () => {
    const pos = purchaseOrders.data || [];
    const phaseMap: Record<string, { poCount: number; totalValue: number; statuses: Record<string, number> }> = {};

    pos.forEach((po: any) => {
      const phase = po.remarks?.match(/phase[:\s]*(\w+)/i)?.[1] || 'Unassigned';
      if (!phaseMap[phase]) phaseMap[phase] = { poCount: 0, totalValue: 0, statuses: {} };
      phaseMap[phase].poCount++;
      phaseMap[phase].totalValue += po.total || 0;
      phaseMap[phase].statuses[po.status] = (phaseMap[phase].statuses[po.status] || 0) + 1;
    });

    return Object.entries(phaseMap).map(([phase, data]) => ({ phase, ...data }));
  };

  return {
    projects,
    purchaseRequests,
    quotations,
    purchaseOrders,
    goodsReceipts,
    apInvoices,
    cbsItems,
    getBudgetSummary,
    getPhaseProcurement,
  };
}
