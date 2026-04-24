import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useBranchTransferSelling(filters?: { status?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['branch-transfer-orders', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_branch_transfer_orders').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.status && filters.status !== 'all') q = q.eq('transfer_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createTransfer = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { error } = await supabase.from('pos_branch_transfer_orders').insert({
        ...input, transfer_number: '', company_id: activeCompanyId, created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branch-transfer-orders'] }); toast({ title: 'Transfer order created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { transfer_status: status };
      if (status === 'received') updates.actual_arrival = new Date().toISOString().split('T')[0];
      if (status === 'picked_up') updates.pickup_confirmed_at = new Date().toISOString();
      const { error } = await supabase.from('pos_branch_transfer_orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branch-transfer-orders'] }); toast({ title: 'Status updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: transfers.length,
    requested: transfers.filter(t => t.transfer_status === 'requested').length,
    inTransit: transfers.filter(t => t.transfer_status === 'in_transit').length,
    readyPickup: transfers.filter(t => t.transfer_status === 'ready_pickup').length,
  };

  return { transfers, isLoading, stats, createTransfer, updateStatus };
}
