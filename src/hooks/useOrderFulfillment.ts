import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export const FULFILLMENT_STATES = ['draft', 'confirmed', 'picking', 'packed', 'shipped', 'in_transit', 'delivered', 'cancelled'] as const;
export type FulfillmentState = typeof FULFILLMENT_STATES[number];

export const STATE_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['packed', 'confirmed'],
  packed: ['shipped', 'picking'],
  shipped: ['in_transit', 'packed'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: ['draft'],
};

export const STATE_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'secondary' },
  confirmed: { label: 'Confirmed', color: 'default' },
  picking: { label: 'Picking', color: 'warning' },
  packed: { label: 'Packed', color: 'default' },
  shipped: { label: 'Shipped', color: 'default' },
  in_transit: { label: 'In Transit', color: 'warning' },
  delivered: { label: 'Delivered', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'destructive' },
};

export function useOrderFulfillment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: fulfillments = [], isLoading } = useQuery({
    queryKey: ['order-fulfillment', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('order_fulfillment' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createFulfillment = useMutation({
    mutationFn: async (data: { sales_order_id: string; shipping_address?: string; receiver_name?: string; receiver_phone?: string; notes?: string }) => {
      const { data: result, error } = await (supabase.from('order_fulfillment' as any).insert({
        ...data,
        current_state: 'draft',
        state_history: [{ state: 'draft', at: new Date().toISOString(), by: profile?.full_name }],
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-fulfillment'] });
      toast({ title: 'Fulfillment order created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const transitionState = useMutation({
    mutationFn: async ({ fulfillmentId, toState, notes }: { fulfillmentId: string; toState: string; notes?: string }) => {
      // Get current record
      const { data: current, error: fetchErr } = await (supabase.from('order_fulfillment' as any).select('*').eq('id', fulfillmentId).single() as any);
      if (fetchErr) throw fetchErr;

      const allowed = STATE_TRANSITIONS[current.current_state] || [];
      if (!allowed.includes(toState)) {
        throw new Error(`Cannot transition from ${current.current_state} to ${toState}`);
      }

      const history = [...(current.state_history || []), { state: toState, at: new Date().toISOString(), by: profile?.full_name, notes }];

      const updateData: any = { current_state: toState, state_history: history };
      if (toState === 'delivered') updateData.actual_delivery = new Date().toISOString().split('T')[0];

      const { error } = await (supabase.from('order_fulfillment' as any).update(updateData).eq('id', fulfillmentId) as any);
      if (error) throw error;

      // Log transition
      await (supabase.from('fulfillment_state_transitions' as any).insert({
        fulfillment_id: fulfillmentId,
        from_state: current.current_state,
        to_state: toState,
        transitioned_by: user?.id,
        transitioned_by_name: profile?.full_name,
        notes,
      }) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-fulfillment'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTracking = useMutation({
    mutationFn: async ({ fulfillmentId, tracking_number, carrier_name, estimated_delivery }: { fulfillmentId: string; tracking_number?: string; carrier_name?: string; estimated_delivery?: string }) => {
      const { error } = await (supabase.from('order_fulfillment' as any).update({ tracking_number, carrier_name, estimated_delivery }).eq('id', fulfillmentId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-fulfillment'] });
      toast({ title: 'Tracking updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { fulfillments, isLoading, createFulfillment, transitionState, updateTracking };
}
