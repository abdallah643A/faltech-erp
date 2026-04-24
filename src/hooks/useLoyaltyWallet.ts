import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useLoyaltyPrograms() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['loyalty-programs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('loyalty_programs' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createProgram = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('loyalty_programs' as any).insert({
        ...data, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] }); toast({ title: 'Loyalty program created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateProgram = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('loyalty_programs' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] }); toast({ title: 'Program updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('loyalty_programs' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] }); toast({ title: 'Program deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { programs, isLoading, createProgram, updateProgram, deleteProgram };
}

export function useLoyaltyTiers(programId?: string) {
  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['loyalty-tiers', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('loyalty_tiers' as any).select('*').eq('program_id', programId).order('tier_order') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const upsertTier = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await (supabase.from('loyalty_tiers' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('loyalty_tiers' as any).insert({ ...data, program_id: programId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] }); toast({ title: 'Tier saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { tiers, isLoading, upsertTier };
}

export function useCustomerWallets(programId?: string) {
  const { activeCompanyId } = useActiveCompany();

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['customer-wallets', activeCompanyId, programId],
    queryFn: async () => {
      let q = supabase.from('customer_loyalty_wallets' as any).select('*').order('lifetime_points', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (programId) q = q.eq('program_id', programId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  return { wallets, isLoading };
}

export function useLoyaltyTransactions(walletId?: string) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['loyalty-transactions', walletId],
    enabled: !!walletId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('loyalty_transactions' as any).select('*').eq('wallet_id', walletId).order('created_at', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data as any[];
    },
  });
  return { transactions, isLoading };
}

export function useEarnPoints() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async ({ walletId, points, sourceModule, sourceDocId, sourceDocNumber, description }: {
      walletId: string; points: number; sourceModule: string; sourceDocId?: string; sourceDocNumber?: string; description?: string;
    }) => {
      // Get current wallet
      const { data: wallet, error: wErr } = await (supabase.from('customer_loyalty_wallets' as any).select('points_balance').eq('id', walletId).single() as any);
      if (wErr) throw wErr;
      const newBalance = (wallet.points_balance || 0) + points;
      // Insert transaction
      const { error: tErr } = await (supabase.from('loyalty_transactions' as any).insert({
        wallet_id: walletId, transaction_type: 'earn', points, balance_after: newBalance,
        source_module: sourceModule, source_document_id: sourceDocId, source_document_number: sourceDocNumber,
        description: description || `Earned ${points} points`, created_by: user?.id, company_id: activeCompanyId,
      }) as any);
      if (tErr) throw tErr;
      // Update wallet
      const { error: uErr } = await (supabase.from('customer_loyalty_wallets' as any).update({
        points_balance: newBalance, lifetime_points: (wallet.points_balance || 0) + points,
      }).eq('id', walletId) as any);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      toast({ title: 'Points earned' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useRedemptionRules(programId?: string) {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['loyalty-redemption-rules', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('loyalty_redemption_rules' as any).select('*').eq('program_id', programId) as any);
      if (error) throw error;
      return data as any[];
    },
  });
  return { rules, isLoading };
}
