import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function usePOSPromotions() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['pos-promotions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pos_promotions' as any).select('*').order('priority', { ascending: true }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createPromotion = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('pos_promotions' as any).insert({
        ...data, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotions'] }); toast({ title: 'Promotion created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('pos_promotions' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotions'] }); toast({ title: 'Promotion updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('pos_promotions' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotions'] }); toast({ title: 'Promotion deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approvePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('pos_promotions' as any).update({
        status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotions'] }); toast({ title: 'Promotion approved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, approvePromotion };
}

export function usePromotionRules(promotionId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['pos-promotion-rules', promotionId],
    enabled: !!promotionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_promotion_rules' as any).select('*').eq('promotion_id', promotionId) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertRule = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await (supabase.from('pos_promotion_rules' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('pos_promotion_rules' as any).insert({ ...data, promotion_id: promotionId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotion-rules'] }); toast({ title: 'Rule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('pos_promotion_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotion-rules'] }); },
  });

  return { rules, isLoading, upsertRule, deleteRule };
}

export function usePromotionConditions(promotionId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['pos-promotion-conditions', promotionId],
    enabled: !!promotionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_promotion_conditions' as any).select('*').eq('promotion_id', promotionId) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertCondition = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { error } = await (supabase.from('pos_promotion_conditions' as any).update(rest).eq('id', id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('pos_promotion_conditions' as any).insert({ ...data, promotion_id: promotionId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-promotion-conditions'] }); toast({ title: 'Condition saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { conditions, isLoading, upsertCondition };
}

export function usePromotionUsage(promotionId?: string) {
  const { data: usage = [], isLoading } = useQuery({
    queryKey: ['pos-promotion-usage', promotionId],
    enabled: !!promotionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_promotion_usage' as any).select('*').eq('promotion_id', promotionId).order('used_at', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data as any[];
    },
  });
  return { usage, isLoading };
}
