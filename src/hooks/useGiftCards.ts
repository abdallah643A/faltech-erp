import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useGiftCards() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: giftCards, isLoading } = useQuery({
    queryKey: ['gift-cards', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_gift_cards' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: transactions } = useQuery({
    queryKey: ['gift-card-transactions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_gift_card_transactions' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: storeCredits } = useQuery({
    queryKey: ['store-credits', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_store_credits' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const createGiftCard = useMutation({
    mutationFn: async (card: any) => {
      const { data, error } = await (supabase.from('pos_gift_cards' as any).insert({
        company_id: activeCompanyId, ...card,
      }).select().single());
      if (error) throw error;
      // Log the issuance
      await (supabase.from('pos_gift_card_transactions' as any).insert({
        company_id: activeCompanyId, gift_card_id: (data as any).id,
        transaction_type: 'issue', amount: card.initial_balance,
        balance_before: 0, balance_after: card.initial_balance,
      }));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['gift-card-transactions'] });
      toast({ title: 'Gift card created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const redeemGiftCard = useMutation({
    mutationFn: async ({ card_id, amount, branch_id, transaction_id }: { card_id: string; amount: number; branch_id?: string; transaction_id?: string }) => {
      const { data, error } = await (supabase.rpc as any)('pos_redeem_gift_card', {
        p_card_id: card_id, p_amount: amount, p_branch_id: branch_id ?? null, p_transaction_id: transaction_id ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['gift-card-transactions'] });
      toast({ title: 'Gift card redeemed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rechargeGiftCard = useMutation({
    mutationFn: async ({ card_id, amount }: { card_id: string; amount: number }) => {
      const { data: card } = await (supabase.from('pos_gift_cards' as any).select('current_balance').eq('id', card_id).single());
      if (!card) throw new Error('Card not found');
      const bal = (card as any).current_balance;
      const newBal = bal + amount;
      await (supabase.from('pos_gift_cards' as any).update({ current_balance: newBal, status: 'active' }).eq('id', card_id));
      await (supabase.from('pos_gift_card_transactions' as any).insert({
        company_id: activeCompanyId, gift_card_id: card_id,
        transaction_type: 'recharge', amount, balance_before: bal, balance_after: newBal,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['gift-card-transactions'] });
      toast({ title: 'Gift card recharged' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { giftCards, transactions, storeCredits, isLoading, createGiftCard, redeemGiftCard, rechargeGiftCard };
}
