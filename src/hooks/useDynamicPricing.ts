import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useDynamicPriceRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dynamic-price-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('dynamic_price_rules' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (data: { name: string; item_code?: string; item_group?: string; cost_method?: string; target_margin_percent: number; min_margin_percent: number; markup_percent?: number; effective_from?: string; effective_to?: string }) => {
      const { error } = await (supabase.from('dynamic_price_rules' as any).insert({
        ...data,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-price-rules'] });
      toast({ title: 'Price rule created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('dynamic_price_rules' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-price-rules'] });
      toast({ title: 'Price rule updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('dynamic_price_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-price-rules'] });
      toast({ title: 'Price rule deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { rules, isLoading, createRule, updateRule, deleteRule };
}

export function useMarginAlerts() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['margin-alerts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('margin_alerts' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase.from('margin_alerts' as any).update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq('id', alertId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-alerts'] });
      toast({ title: 'Alert resolved' });
    },
  });

  return { alerts, isLoading, resolveAlert };
}
