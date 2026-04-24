import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// ============================================================================
// BLANKET AGREEMENTS
// ============================================================================
export function useBlanketAgreements() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['blanket-agreements', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('sales_blanket_agreements').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createAgreement = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('sales_blanket_agreements').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blanket-agreements'] }); toast({ title: 'Agreement created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateAgreement = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from('sales_blanket_agreements').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blanket-agreements'] }); toast({ title: 'Agreement updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { agreements, isLoading, createAgreement, updateAgreement };
}

// ============================================================================
// DISCOUNT MATRIX
// ============================================================================
export function useDiscountMatrix() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['discount-matrix', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('sales_discount_matrix').select('*').order('priority', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('sales_discount_matrix').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discount-matrix'] }); toast({ title: 'Rule created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('sales_discount_matrix').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discount-matrix'] }); toast({ title: 'Rule deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { rules, isLoading, createRule, deleteRule };
}

// ============================================================================
// CUSTOMER PRICE BOOKS
// ============================================================================
export function useCustomerPriceBooks() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: priceBooks = [], isLoading } = useQuery({
    queryKey: ['customer-price-books', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('sales_customer_price_books').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createPriceBook = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('sales_customer_price_books').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-price-books'] }); toast({ title: 'Price book created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { priceBooks, isLoading, createPriceBook };
}

// ============================================================================
// CREDIT PROFILES
// ============================================================================
export function useCreditProfiles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['credit-profiles', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_credit_profiles').select('*').order('current_exposure', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createProfile = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_credit_profiles').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-profiles'] }); toast({ title: 'Credit profile created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleHold = useMutation({
    mutationFn: async ({ id, on_hold, hold_reason }: { id: string; on_hold: boolean; hold_reason?: string }) => {
      const { error } = await (supabase as any).from('ar_credit_profiles')
        .update({ on_hold, hold_reason: on_hold ? hold_reason : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-profiles'] }); toast({ title: 'Status updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    totalCustomers: profiles.length,
    onHold: profiles.filter((p: any) => p.on_hold).length,
    totalExposure: profiles.reduce((s: number, p: any) => s + Number(p.current_exposure || 0), 0),
    totalLimit: profiles.reduce((s: number, p: any) => s + Number(p.credit_limit || 0), 0),
  };

  return { profiles, isLoading, stats, createProfile, toggleHold };
}

// ============================================================================
// DUNNING POLICIES & RUNS
// ============================================================================
export function useDunningPolicies() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['dunning-policies', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_dunning_policies').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_dunning_policies').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dunning-policies'] }); toast({ title: 'Policy created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { policies, isLoading, createPolicy };
}

export function useDunningRuns() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['dunning-runs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_dunning_runs').select('*').order('run_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createRun = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_dunning_runs').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dunning-runs'] }); toast({ title: 'Run created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { runs, isLoading, createRun };
}

// ============================================================================
// COLLECTION CASES
// ============================================================================
export function useCollectionCases() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['collection-cases', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_collection_cases').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createCase = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_collection_cases').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-cases'] }); toast({ title: 'Case opened' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from('ar_collection_cases').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-cases'] }); toast({ title: 'Case updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    totalCases: cases.length,
    open: cases.filter((c: any) => c.status === 'open').length,
    promised: cases.filter((c: any) => c.promise_to_pay_date).length,
    totalOverdue: cases.reduce((s: number, c: any) => s + Number(c.total_overdue || 0), 0),
  };

  return { cases, isLoading, stats, createCase, updateCase };
}

// ============================================================================
// DISPUTES
// ============================================================================
export function useDisputes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['ar-disputes', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_disputes').select('*').order('raised_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createDispute = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_disputes').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ar-disputes'] }); toast({ title: 'Dispute logged' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ id, resolution_type, approved_amount, notes }: any) => {
      const { error } = await (supabase as any).from('ar_disputes')
        .update({ status: 'resolved' })
        .eq('id', id);
      if (error) throw error;
      const { error: e2 } = await (supabase as any).from('ar_dispute_resolutions').insert({
        dispute_id: id, resolution_type, approved_amount, notes,
      });
      if (e2) throw e2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ar-disputes'] }); toast({ title: 'Dispute resolved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: disputes.length,
    open: disputes.filter((d: any) => d.status === 'open').length,
    resolved: disputes.filter((d: any) => d.status === 'resolved').length,
    totalAmount: disputes.reduce((s: number, d: any) => s + Number(d.dispute_amount || 0), 0),
  };

  return { disputes, isLoading, stats, createDispute, resolveDispute };
}

// ============================================================================
// REVENUE RECOGNITION
// ============================================================================
export function useRevenueRecognition() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['revrec-schedules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('ar_revenue_recognition_schedules').select('*').order('start_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('ar_revenue_recognition_schedules').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revrec-schedules'] }); toast({ title: 'Schedule created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: schedules.length,
    totalAmount: schedules.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0),
    recognized: schedules.reduce((s: number, x: any) => s + Number(x.recognized_amount || 0), 0),
    deferred: schedules.reduce((s: number, x: any) => s + Number(x.deferred_amount || 0), 0),
  };

  return { schedules, isLoading, stats, createSchedule };
}

// ============================================================================
// TAX DETERMINATION
// ============================================================================
export function useTaxRules() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['tax-rules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('sales_tax_determination_rules').select('*').order('priority');
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId };
      const { error } = await (supabase as any).from('sales_tax_determination_rules').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tax-rules'] }); toast({ title: 'Tax rule added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { rules, isLoading, createRule };
}

// ============================================================================
// INCOTERMS
// ============================================================================
export function useIncoterms() {
  const { data: incoterms = [], isLoading } = useQuery({
    queryKey: ['incoterms'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('sales_incoterms').select('*').order('code');
      if (error) throw error;
      return data || [];
    },
  });
  return { incoterms, isLoading };
}

// ============================================================================
// EXPORT DOCS
// ============================================================================
export function useExportDocs() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['export-docs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('sales_export_docs').select('*').order('doc_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createDoc = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('sales_export_docs').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['export-docs'] }); toast({ title: 'Export doc created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { docs, isLoading, createDoc };
}

// ============================================================================
// PORTAL SHARES
// ============================================================================
export function usePortalShares() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['portal-shares', activeCompanyId],
    queryFn: async () => {
      let q = (supabase as any).from('customer_portal_shares').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createShare = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id };
      const { error } = await (supabase as any).from('customer_portal_shares').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-shares'] }); toast({ title: 'Share link created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const revokeShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('customer_portal_shares').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-shares'] }); toast({ title: 'Share revoked' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { shares, isLoading, createShare, revokeShare };
}
