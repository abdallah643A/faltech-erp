import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useEffect } from 'react';

export function useDeliveryDispatch() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['pos-deliveries', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_delivery_orders' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: drivers } = useQuery({
    queryKey: ['pos-drivers', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_delivery_drivers' as any).select('*')
        .eq('company_id', activeCompanyId!).eq('is_active', true).order('driver_name'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  useEffect(() => {
    if (!activeCompanyId) return;
    const channel = supabase.channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_delivery_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pos-deliveries'] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCompanyId]);

  const createDelivery = useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await (supabase.from('pos_delivery_orders' as any).insert({
        company_id: activeCompanyId, ...order,
      }).select().single());
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-deliveries'] });
      toast({ title: 'Delivery order created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDelivery = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      if (updates.status === 'delivered') updates.actual_delivery_at = new Date().toISOString();
      const { error } = await (supabase.from('pos_delivery_orders' as any).update(updates).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-deliveries'] });
      toast({ title: 'Delivery updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createDriver = useMutation({
    mutationFn: async (driver: any) => {
      const { error } = await (supabase.from('pos_delivery_drivers' as any).insert({
        company_id: activeCompanyId, ...driver,
      }));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-drivers'] });
      toast({ title: 'Driver added' });
    },
  });

  return { deliveries, drivers, isLoading, createDelivery, updateDelivery, createDriver };
}
