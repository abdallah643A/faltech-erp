import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCommercialControlTower(selectedProjectId: string | null) {
  const { activeCompanyId } = useActiveCompany();

  const projects = useQuery({
    queryKey: ['cct-projects', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_projects').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const commitments = useQuery({
    queryKey: ['cct-commitments', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_commitments').select('*').eq('project_id', selectedProjectId!);
      if (error) throw error;
      return data as any[];
    },
  });

  const costForecasts = useQuery({
    queryKey: ['cct-cost-forecasts', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_cost_forecasts').select('*').eq('project_id', selectedProjectId!).order('period');
      if (error) throw error;
      return data as any[];
    },
  });

  const evmSnapshots = useQuery({
    queryKey: ['cct-evm', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('evm_snapshots').select('*').eq('project_id', selectedProjectId!).order('snapshot_date');
      if (error) throw error;
      return data as any[];
    },
  });

  const changeOrders = useQuery({
    queryKey: ['cct-change-orders', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_change_orders').select('*').eq('project_id', selectedProjectId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const ipas = useQuery({
    queryKey: ['cct-ipas', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_ipas').select('*').eq('project_id', selectedProjectId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const changeRegister = useQuery({
    queryKey: ['cct-change-register', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('change_register').select('*').eq('project_id', selectedProjectId!).order('raised_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const paymentApps = useQuery({
    queryKey: ['cct-payment-apps', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_applications').select('*').eq('project_id', selectedProjectId!).order('application_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const cbsItems = useQuery({
    queryKey: ['cct-cbs', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_cbs_items').select('*').eq('project_id', selectedProjectId!);
      if (error) throw error;
      return data as any[];
    },
  });

  // Computed metrics
  const project = (projects.data || []).find((p: any) => p.id === selectedProjectId);
  const contractValue = project?.revised_contract_value || project?.contract_value || 0;
  const budgetedCost = project?.budgeted_cost || project?.total_budget || 0;
  const actualCost = project?.actual_cost || 0;
  const committedTotal = (commitments.data || []).reduce((s: number, c: any) => s + (c.committed_amount || 0), 0);
  const invoicedTotal = (commitments.data || []).reduce((s: number, c: any) => s + (c.invoiced_amount || 0), 0);

  const latestEVM = (evmSnapshots.data || []).slice(-1)[0];
  const spi = latestEVM?.spi || 0;
  const cpi = latestEVM?.cpi || 0;
  const eac = latestEVM?.eac || 0;

  const approvedVOs = (changeOrders.data || []).filter((c: any) => c.status === 'approved');
  const pendingVOs = (changeOrders.data || []).filter((c: any) => c.status === 'pending' || c.status === 'submitted');
  const totalApprovedVOValue = approvedVOs.reduce((s: number, v: any) => s + (v.cost_impact || 0), 0);
  const totalPendingVOValue = pendingVOs.reduce((s: number, v: any) => s + (v.cost_impact || 0), 0);

  const totalBilled = (ipas.data || []).reduce((s: number, i: any) => s + (i.net_amount || i.certified_amount || 0), 0);
  const totalCertified = (ipas.data || []).reduce((s: number, i: any) => s + (i.certified_amount || 0), 0);
  const retentionHeld = (ipas.data || []).reduce((s: number, i: any) => s + (i.retention_amount || 0), 0);
  const retentionReleased = (ipas.data || []).reduce((s: number, i: any) => s + (i.retention_released || 0), 0);

  const forecastAtCompletion = eac || (actualCost + (budgetedCost - actualCost));
  const marginOriginal = contractValue > 0 ? ((contractValue - budgetedCost) / contractValue * 100) : 0;
  const marginForecast = contractValue > 0 ? ((contractValue + totalApprovedVOValue - forecastAtCompletion) / (contractValue + totalApprovedVOValue) * 100) : 0;
  const marginErosion = marginOriginal - marginForecast;

  const billingLeakage = (() => {
    const progressValue = contractValue * (project?.percent_complete || 0) / 100;
    return Math.max(0, progressValue - totalBilled);
  })();

  const retentionExposure = retentionHeld - retentionReleased;

  return {
    projects: projects.data || [],
    project,
    loading: projects.isLoading,
    contractValue,
    budgetedCost,
    actualCost,
    committedTotal,
    invoicedTotal,
    forecastAtCompletion,
    marginOriginal,
    marginForecast,
    marginErosion,
    spi, cpi, eac,
    evmSnapshots: evmSnapshots.data || [],
    changeOrders: changeOrders.data || [],
    approvedVOs, pendingVOs,
    totalApprovedVOValue, totalPendingVOValue,
    ipas: ipas.data || [],
    totalBilled, totalCertified,
    retentionHeld, retentionReleased, retentionExposure,
    billingLeakage,
    commitments: commitments.data || [],
    changeRegister: changeRegister.data || [],
    paymentApps: paymentApps.data || [],
    cbsItems: cbsItems.data || [],
    costForecasts: costForecasts.data || [],
  };
}
