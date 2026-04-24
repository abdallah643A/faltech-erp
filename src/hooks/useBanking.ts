import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCurrencies() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['currencies', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('currencies' as any).select('*').order('code') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useExchangeRates(fromCurrency?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exchange_rates', fromCurrency],
    queryFn: async () => {
      let q = (supabase.from('currency_exchange_rates' as any).select('*').order('rate_date', { ascending: false }) as any);
      if (fromCurrency) q = q.eq('from_currency', fromCurrency);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (rate: any) => {
      const { data, error } = await (supabase.from('currency_exchange_rates' as any).upsert(rate, { onConflict: 'from_currency,to_currency,rate_date' }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange_rates'] });
      toast({ title: 'Exchange rate saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('currency_exchange_rates' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange_rates'] });
      toast({ title: 'Rate deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, upsert, remove };
}

export function useBankStatements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['bank_statements', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('bank_statements' as any).select('*').order('statement_date', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (stmt: any) => {
      const { data, error } = await (supabase.from('bank_statements' as any).insert(stmt).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statements'] });
      toast({ title: 'Statement imported' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('bank_statements' as any).update({ status }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statements'] });
    },
  });

  return { ...query, create, updateStatus };
}

export function useBankStatementLines(statementId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bank_statement_lines', statementId],
    enabled: !!statementId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('bank_statement_lines' as any).select('*').eq('statement_id', statementId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createMany = useMutation({
    mutationFn: async (lines: any[]) => {
      const { error } = await (supabase.from('bank_statement_lines' as any).insert(lines) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statement_lines'] });
      toast({ title: 'Lines imported' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const matchLine = useMutation({
    mutationFn: async ({ lineId, paymentId, status }: { lineId: string; paymentId?: string; status: string }) => {
      const { error } = await (supabase.from('bank_statement_lines' as any).update({
        reconciliation_status: status,
        matched_payment_id: paymentId || null,
        matched_at: new Date().toISOString(),
      }).eq('id', lineId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statement_lines'] });
      toast({ title: 'Line matched' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createMany, matchLine };
}

export function usePaymentReconciliations(statementId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payment_reconciliations', statementId],
    queryFn: async () => {
      let q = (supabase.from('payment_reconciliations' as any).select('*').order('created_at', { ascending: false }) as any);
      if (statementId) q = q.eq('bank_statement_id', statementId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await (supabase.from('payment_reconciliations' as any).insert(rec).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_reconciliations'] });
      toast({ title: 'Reconciliation recorded' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('payment_reconciliations' as any).update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_reconciliations'] });
      toast({ title: 'Reconciliation confirmed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, confirm };
}
