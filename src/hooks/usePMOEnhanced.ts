import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

/* ------------------------------------------------------------------ */
/* Business Cases                                                      */
/* ------------------------------------------------------------------ */
export function useBusinessCases() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-business-cases', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('pmo_business_cases' as any) as any)
        .select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = payload.id
        ? await (supabase.from('pmo_business_cases' as any) as any).update(row).eq('id', payload.id)
        : await (supabase.from('pmo_business_cases' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-business-cases'] });
      toast({ title: 'Business case saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, upsert };
}

/* ------------------------------------------------------------------ */
/* Portfolio Scoring                                                   */
/* ------------------------------------------------------------------ */
export function usePortfolioScoring(portfolioId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-portfolio-scoring', activeCompanyId, portfolioId],
    queryFn: async () => {
      let q = (supabase.from('pmo_portfolio_scoring' as any) as any)
        .select('*').order('composite_score', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (portfolioId) q = q.eq('portfolio_id', portfolioId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = payload.id
        ? await (supabase.from('pmo_portfolio_scoring' as any) as any).update(row).eq('id', payload.id)
        : await (supabase.from('pmo_portfolio_scoring' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-portfolio-scoring'] });
      toast({ title: 'Scoring updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, upsert };
}

/* ------------------------------------------------------------------ */
/* Benefits Realization                                                */
/* ------------------------------------------------------------------ */
export function useBenefitsRealization(projectId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-benefits', activeCompanyId, projectId],
    queryFn: async () => {
      let q = (supabase.from('pmo_benefits_realization' as any) as any)
        .select('*').order('realization_due_date', { ascending: true, nullsFirst: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = payload.id
        ? await (supabase.from('pmo_benefits_realization' as any) as any).update(row).eq('id', payload.id)
        : await (supabase.from('pmo_benefits_realization' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-benefits'] });
      toast({ title: 'Benefit saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, upsert };
}

/* ------------------------------------------------------------------ */
/* Project Financial Health (EVM)                                      */
/* ------------------------------------------------------------------ */
export function useFinancialHealth(projectId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-financial-health', activeCompanyId, projectId],
    queryFn: async () => {
      let q = (supabase.from('pmo_financial_health' as any) as any)
        .select('*').order('snapshot_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = payload.id
        ? await (supabase.from('pmo_financial_health' as any) as any).update(row).eq('id', payload.id)
        : await (supabase.from('pmo_financial_health' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-financial-health'] });
      toast({ title: 'Financial snapshot saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, upsert };
}

/* ------------------------------------------------------------------ */
/* Stage-Gate Templates                                                */
/* ------------------------------------------------------------------ */
export function useGateTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-gate-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pmo_gate_templates' as any) as any)
        .select('*').order('methodology').order('template_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = payload.id
        ? await (supabase.from('pmo_gate_templates' as any) as any).update(row).eq('id', payload.id)
        : await (supabase.from('pmo_gate_templates' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-gate-templates'] });
      toast({ title: 'Template saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, upsert };
}

/* ------------------------------------------------------------------ */
/* Capacity Snapshots                                                  */
/* ------------------------------------------------------------------ */
export function useCapacitySnapshots() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['pmo-capacity-snapshots', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('pmo_capacity_snapshots' as any) as any)
        .select('*').order('snapshot_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const row = { ...payload, company_id: payload.company_id ?? activeCompanyId };
      const { error } = await (supabase.from('pmo_capacity_snapshots' as any) as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pmo-capacity-snapshots'] });
      toast({ title: 'Capacity snapshot recorded' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { list, create };
}
