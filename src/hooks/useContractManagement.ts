import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useContractManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const contracts = useQuery({
    queryKey: ['clm-contracts', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('contracts' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const amendments = useQuery({
    queryKey: ['clm-amendments', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_amendments' as any).select('*') as any).in('contract_id', ids).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const obligations = useQuery({
    queryKey: ['clm-obligations', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_obligations' as any).select('*') as any).in('contract_id', ids).order('due_date');
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const clauses = useQuery({
    queryKey: ['clm-clauses', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('contract_clauses' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const guarantees = useQuery({
    queryKey: ['clm-guarantees', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_guarantees' as any).select('*') as any).in('contract_id', ids).order('expiry_date');
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const claims = useQuery({
    queryKey: ['clm-claims', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_claims' as any).select('*') as any).in('contract_id', ids).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const variations = useQuery({
    queryKey: ['clm-variations', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_variations' as any).select('*') as any).in('contract_id', ids).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const history = useQuery({
    queryKey: ['clm-history', activeCompanyId],
    queryFn: async () => {
      const ids = (contracts.data || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await (supabase.from('contract_history' as any).select('*') as any).in('contract_id', ids).order('created_at', { ascending: false }).limit(200);
      return (data || []) as any[];
    },
    enabled: (contracts.data || []).length > 0,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['clm-contracts'] });
    qc.invalidateQueries({ queryKey: ['clm-amendments'] });
    qc.invalidateQueries({ queryKey: ['clm-obligations'] });
    qc.invalidateQueries({ queryKey: ['clm-guarantees'] });
    qc.invalidateQueries({ queryKey: ['clm-claims'] });
    qc.invalidateQueries({ queryKey: ['clm-variations'] });
    qc.invalidateQueries({ queryKey: ['clm-history'] });
  };

  const createContract = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contracts' as any).insert({
        ...values,
        company_id: activeCompanyId,
        created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Contract created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contracts' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Contract updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('contracts' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Contract deleted' }); },
  });

  const createAmendment = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_amendments' as any).insert({ ...values, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Amendment created' }); },
  });

  const createObligation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_obligations' as any).insert({ ...values, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Obligation created' }); },
  });

  const updateObligation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contract_obligations' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Obligation updated' }); },
  });

  const createClause = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_clauses' as any).insert({ ...values, company_id: activeCompanyId, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clm-clauses'] }); toast({ title: 'Clause created' }); },
  });

  const createGuarantee = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_guarantees' as any).insert({ ...values, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Guarantee created' }); },
  });

  const createClaim = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_claims' as any).insert({ ...values, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Claim created' }); },
  });

  const createVariation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.from('contract_variations' as any).insert({ ...values, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Variation order created' }); },
  });

  const updateVariation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contract_variations' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Variation updated' }); },
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contract_claims' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Claim updated' }); },
  });

  const updateAmendment = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contract_amendments' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Amendment updated' }); },
  });

  const updateGuarantee = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await (supabase.from('contract_guarantees' as any).update(values).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Guarantee updated' }); },
  });

  return {
    contracts: contracts.data || [],
    amendments: amendments.data || [],
    obligations: obligations.data || [],
    clauses: clauses.data || [],
    guarantees: guarantees.data || [],
    claims: claims.data || [],
    variations: variations.data || [],
    history: history.data || [],
    isLoading: contracts.isLoading,
    createContract, updateContract, deleteContract,
    createAmendment, updateAmendment,
    createObligation, updateObligation,
    createClause,
    createGuarantee, updateGuarantee,
    createClaim, updateClaim,
    createVariation, updateVariation,
    invalidateAll,
  };
}
