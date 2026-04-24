import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function usePOSPickup() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: pickupOrders, isLoading } = useQuery({
    queryKey: ['pos-pickup-orders', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_pickup_orders')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const createPickupOrder = useMutation({
    mutationFn: async (values: any) => {
      const otp = Math.random().toString().slice(2, 8);
      const { data, error } = await supabase.from('pos_pickup_orders').insert({
        ...values,
        company_id: activeCompanyId,
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-pickup-orders'] });
      toast({ title: 'Pickup Order Created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updatePickupStatus = useMutation({
    mutationFn: async (values: { id: string; status: string; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const updates: any = { status: values.status };

      if (values.status === 'preparing') {
        updates.prepared_by = userData.user?.id;
        updates.prepared_by_name = userData.user?.email;
      } else if (values.status === 'handed_over' || values.status === 'completed') {
        updates.handed_over_by = userData.user?.id;
        updates.handed_over_by_name = userData.user?.email;
        updates.handed_over_at = new Date().toISOString();
        updates.handover_notes = values.notes;
      }

      const { error } = await supabase.from('pos_pickup_orders').update(updates).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-pickup-orders'] });
      toast({ title: 'Status Updated' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const verifyOTP = useMutation({
    mutationFn: async (values: { id: string; otp: string }) => {
      const { data: order } = await supabase.from('pos_pickup_orders').select('otp_code, otp_expires_at').eq('id', values.id).single();
      if (!order) throw new Error('Order not found');
      if (order.otp_code !== values.otp) throw new Error('Invalid OTP');
      if (order.otp_expires_at && new Date(order.otp_expires_at) < new Date()) throw new Error('OTP expired');

      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('pos_pickup_orders').update({
        otp_verified: true,
        verified_by: userData.user?.id,
        verified_by_name: userData.user?.email,
        verified_at: new Date().toISOString(),
        status: 'handed_over',
      }).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-pickup-orders'] });
      toast({ title: 'OTP Verified — Order Handed Over' });
    },
    onError: (err: any) => toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' }),
  });

  const stats = {
    reserved: pickupOrders?.filter(o => o.status === 'reserved').length || 0,
    preparing: pickupOrders?.filter(o => o.status === 'preparing').length || 0,
    ready: pickupOrders?.filter(o => o.status === 'ready' || o.status === 'notified').length || 0,
    completed: pickupOrders?.filter(o => o.status === 'completed' || o.status === 'handed_over').length || 0,
  };

  return { pickupOrders, isLoading, stats, createPickupOrder, updatePickupStatus, verifyOTP };
}
