import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

export function useICRelationships() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: relationships = [], isLoading } = useQuery({
    queryKey: ['ic-relationships', activeCompanyId],
    queryFn: async () => {
      const q = supabase.from('ic_company_relationships' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertRelationship = useMutation({
    mutationFn: async (rel: any) => {
      if (rel.id) {
        const { id, ...rest } = rel;
        const { error } = await (supabase.from('ic_company_relationships' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('ic_company_relationships' as any).insert({ ...rel, company_id: activeCompanyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-relationships'] });
      toast.success('Relationship saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRelationship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ic_company_relationships' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-relationships'] });
      toast.success('Relationship deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { relationships, isLoading, upsertRelationship, deleteRelationship };
}

export function useICMappings(type: 'bp' | 'item' | 'account' | 'tax' | 'warehouse', relationshipId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const tableName = `ic_${type}_mappings`;

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: [tableName, activeCompanyId, relationshipId],
    queryFn: async () => {
      let q = supabase.from(tableName as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      if (relationshipId) (q as any).eq('relationship_id', relationshipId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!relationshipId,
  });

  const upsertMapping = useMutation({
    mutationFn: async (m: any) => {
      if (m.id) {
        const { id, ...rest } = m;
        const { error } = await (supabase.from(tableName as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from(tableName as any).insert({ ...m, company_id: activeCompanyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tableName] });
      toast.success('Mapping saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(tableName as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tableName] });
      toast.success('Mapping deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { mappings, isLoading, upsertMapping, deleteMapping };
}

export function useICTransferPricing(relationshipId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['ic-transfer-pricing', activeCompanyId, relationshipId],
    queryFn: async () => {
      let q = supabase.from('ic_transfer_pricing_rules' as any).select('*').order('priority');
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      if (relationshipId) (q as any).eq('relationship_id', relationshipId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertRule = useMutation({
    mutationFn: async (r: any) => {
      if (r.id) {
        const { id, ...rest } = r;
        const { error } = await (supabase.from('ic_transfer_pricing_rules' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('ic_transfer_pricing_rules' as any).insert({ ...r, company_id: activeCompanyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-transfer-pricing'] });
      toast.success('Pricing rule saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ic_transfer_pricing_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-transfer-pricing'] });
      toast.success('Rule deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { rules, isLoading, upsertRule, deleteRule };
}

export function useICMirrorRules(relationshipId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: mirrorRules = [], isLoading } = useQuery({
    queryKey: ['ic-mirror-rules', activeCompanyId, relationshipId],
    queryFn: async () => {
      let q = supabase.from('ic_mirror_rules' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      if (relationshipId) (q as any).eq('relationship_id', relationshipId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertMirrorRule = useMutation({
    mutationFn: async (r: any) => {
      if (r.id) {
        const { id, ...rest } = r;
        const { error } = await (supabase.from('ic_mirror_rules' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('ic_mirror_rules' as any).insert({ ...r, company_id: activeCompanyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-mirror-rules'] });
      toast.success('Mirror rule saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMirrorRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ic_mirror_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-mirror-rules'] });
      toast.success('Mirror rule deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { mirrorRules, isLoading, upsertMirrorRule, deleteMirrorRule };
}

export function useICTransactions() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['ic-transactions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ic_transactions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  return { transactions, isLoading };
}

export function useICExceptions() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ['ic-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ic_exceptions' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('ic_exceptions' as any).update({
        status: 'resolved',
        resolution_notes: notes,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-exceptions'] });
      toast.success('Exception resolved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { exceptions, isLoading, resolveException };
}

export function useICSettlements() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['ic-settlements', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ic_settlements' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) (q as any).eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertSettlement = useMutation({
    mutationFn: async (s: any) => {
      if (s.id) {
        const { id, ...rest } = s;
        const { error } = await (supabase.from('ic_settlements' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('ic_settlements' as any).insert({ ...s, company_id: activeCompanyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ic-settlements'] });
      toast.success('Settlement saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { settlements, isLoading, upsertSettlement };
}
