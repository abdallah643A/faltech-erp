import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useRepairOrders(filters?: { status?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['repair-orders', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_repair_orders').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.status && filters.status !== 'all') q = q.eq('repair_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, repair_number: '', company_id: activeCompanyId, created_by: user?.id } as any;
      const { data, error } = await supabase.from('pos_repair_orders').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['repair-orders'] }); toast({ title: 'Repair order created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: current } = await supabase.from('pos_repair_orders').select('repair_status').eq('id', id).single();
      await supabase.from('pos_repair_status_log').insert({
        repair_order_id: id, old_status: current?.repair_status, new_status: status, notes, changed_by: user?.id,
      });
      const updates: Record<string, any> = { repair_status: status };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      const { error } = await supabase.from('pos_repair_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['repair-orders'] }); toast({ title: 'Status updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: orders.length,
    received: orders.filter(o => o.repair_status === 'received').length,
    inRepair: orders.filter(o => o.repair_status === 'in_repair').length,
    completed: orders.filter(o => o.repair_status === 'completed').length,
    awaitingApproval: orders.filter(o => o.repair_status === 'waiting_approval').length,
  };

  return { orders, isLoading, stats, createOrder, updateStatus };
}
