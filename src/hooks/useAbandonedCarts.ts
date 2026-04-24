import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useAbandonedCarts(filters?: { status?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: carts = [], isLoading } = useQuery({
    queryKey: ['abandoned-carts', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_abandoned_carts').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.status && filters.status !== 'all') q = q.eq('recovery_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const saveCart = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { error } = await supabase.from('pos_abandoned_carts').insert({
        ...input, company_id: activeCompanyId, cashier_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['abandoned-carts'] }); toast({ title: 'Cart saved for recovery' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRecovery = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      if (updates.recovery_status === 'recovered') updates.recovered_at = new Date().toISOString();
      const { error } = await supabase.from('pos_abandoned_carts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['abandoned-carts'] }); toast({ title: 'Recovery updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: carts.length,
    abandoned: carts.filter(c => c.recovery_status === 'abandoned').length,
    contacted: carts.filter(c => c.recovery_status === 'contacted').length,
    recovered: carts.filter(c => c.recovery_status === 'recovered').length,
    totalValue: carts.reduce((s, c) => s + (c.cart_total || 0), 0),
    recoveredValue: carts.filter(c => c.recovery_status === 'recovered').reduce((s, c) => s + (c.cart_total || 0), 0),
  };

  return { carts, isLoading, stats, saveCart, updateRecovery };
}
