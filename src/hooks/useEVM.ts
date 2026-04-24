import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface EVMSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  reporting_period: string | null;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac: number;
  etc_value: number;
  vac: number;
  percent_complete: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ChangeRegisterEntry {
  id: string;
  company_id: string | null;
  project_id: string;
  change_number: string;
  title: string;
  description: string | null;
  change_type: string;
  impact_cost: number;
  impact_days: number;
  status: string;
  priority: string;
  raised_by: string | null;
  raised_date: string;
  approved_by: string | null;
  approved_at: string | null;
  implemented_at: string | null;
  contract_clause: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentApplication {
  id: string;
  company_id: string | null;
  project_id: string;
  application_number: string;
  application_date: string;
  valuation_date: string | null;
  period_from: string | null;
  period_to: string | null;
  contract_sum: number;
  previous_certified: number;
  this_period_gross: number;
  cumulative_gross: number;
  retention_percent: number;
  retention_amount: number;
  previous_retention_released: number;
  materials_on_site: number;
  variations_approved: number;
  deductions: number;
  net_payment: number;
  status: string;
  certified_by: string | null;
  certified_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEVM(projectId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const snapshots = useQuery({
    queryKey: ['evm-snapshots', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('evm_snapshots').select('*').eq('project_id', projectId!).order('snapshot_date');
      if (error) throw error;
      return data as unknown as EVMSnapshot[];
    },
  });

  const createSnapshot = useMutation({
    mutationFn: async (data: Partial<EVMSnapshot>) => {
      const { error } = await supabase.from('evm_snapshots').insert({ ...data as any, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evm-snapshots'] }); toast({ title: 'EVM Snapshot recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evm_snapshots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evm-snapshots'] }),
  });

  const changes = useQuery({
    queryKey: ['change-register', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('change_register').select('*').eq('project_id', projectId!).order('raised_date', { ascending: false });
      if (error) throw error;
      return data as unknown as ChangeRegisterEntry[];
    },
  });

  const createChange = useMutation({
    mutationFn: async (data: Partial<ChangeRegisterEntry>) => {
      const { error } = await supabase.from('change_register').insert({ ...data as any, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change-register'] }); toast({ title: 'Change registered' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateChange = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChangeRegisterEntry> & { id: string }) => {
      const { error } = await supabase.from('change_register').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change-register'] }),
  });

  const paymentApps = useQuery({
    queryKey: ['payment-applications', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_applications').select('*').eq('project_id', projectId!).order('application_date', { ascending: false });
      if (error) throw error;
      return data as unknown as PaymentApplication[];
    },
  });

  const createPaymentApp = useMutation({
    mutationFn: async (data: Partial<PaymentApplication>) => {
      const { error } = await supabase.from('payment_applications').insert({ ...data as any, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-applications'] }); toast({ title: 'Payment application created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updatePaymentApp = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PaymentApplication> & { id: string }) => {
      const { error } = await supabase.from('payment_applications').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-applications'] }),
  });

  return {
    snapshots, createSnapshot, deleteSnapshot,
    changes, createChange, updateChange,
    paymentApps, createPaymentApp, updatePaymentApp,
  };
}

export function useSubcontractorQuotes(bidId?: string | null, projectId?: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const quotes = useQuery({
    queryKey: ['subcontractor-quotes', bidId, projectId],
    queryFn: async () => {
      let q = supabase.from('subcontractor_quotes').select('*').order('created_at', { ascending: false });
      if (bidId) q = q.eq('bid_id', bidId);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as any[];
    },
  });

  const createQuote = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('subcontractor_quotes').insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor-quotes'] }); toast({ title: 'Quote added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('subcontractor_quotes').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcontractor-quotes'] }),
  });

  return { quotes, createQuote, updateQuote };
}

export function useBidScenarios(bidId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const scenarios = useQuery({
    queryKey: ['bid-scenarios', bidId],
    enabled: !!bidId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bid_scenarios').select('*').eq('bid_id', bidId!).order('created_at');
      if (error) throw error;
      return data as unknown as any[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('bid_scenarios').insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bid-scenarios'] }); toast({ title: 'Scenario created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateScenario = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('bid_scenarios').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bid-scenarios'] }),
  });

  return { scenarios, createScenario, updateScenario };
}
