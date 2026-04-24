import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useEffect } from 'react';

export function useKitchenDisplay() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: stations } = useQuery({
    queryKey: ['prep-stations', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_preparation_stations' as any).select('*')
        .eq('company_id', activeCompanyId!).eq('is_active', true).order('display_order'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['prep-orders', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_preparation_orders' as any).select('*')
        .eq('company_id', activeCompanyId!).in('status', ['pending', 'accepted', 'preparing', 'ready', 'delayed'])
        .order('created_at', { ascending: true }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeCompanyId) return;
    const channel = supabase.channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_preparation_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['prep-orders'] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCompanyId]);

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status, ...rest }: { id: string; status: string; [k: string]: any }) => {
      const updates: any = { status, ...rest };
      if (status === 'ready') updates.actual_ready_at = new Date().toISOString();
      if (status === 'picked_up') updates.picked_up_at = new Date().toISOString();
      const { error } = await (supabase.from('pos_preparation_orders' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prep-orders'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createStation = useMutation({
    mutationFn: async (station: any) => {
      const { error } = await (supabase.from('pos_preparation_stations' as any).insert({
        company_id: activeCompanyId, ...station,
      }));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep-stations'] });
      toast({ title: 'Station created' });
    },
  });

  return { stations, orders, isLoading, updateOrderStatus, createStation };
}
