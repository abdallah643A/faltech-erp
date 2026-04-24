import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useBankReconciliations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['bank-reconciliations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('bank_reconciliations' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createReconciliation = useMutation({
    mutationFn: async (recon: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const reconNumber = `REC-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('bank_reconciliations' as any).insert({ ...recon, recon_number: reconNumber, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-reconciliations'] }); toast({ title: 'Reconciliation created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateReconciliation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('bank_reconciliations' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-reconciliations'] }); toast({ title: 'Reconciliation updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { reconciliations, isLoading, createReconciliation, updateReconciliation };
}
