import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useShelfLabels() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ['shelf-labels', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pos_shelf_labels').select('*').order('updated_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: queue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['shelf-label-queue', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pos_shelf_label_queue').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const queuePriceChange = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const row = { ...input, company_id: activeCompanyId, created_by: user?.id } as any;
      const { error } = await supabase.from('pos_shelf_label_queue').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shelf-label-queue'] }); toast({ title: 'Price change queued' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const applyChange = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('pos_shelf_label_queue').select('*').eq('id', id).single();
      if (!item) throw new Error('Not found');
      await supabase.from('pos_shelf_label_queue').update({ status: 'applied', applied_at: new Date().toISOString() }).eq('id', id);
      await supabase.from('pos_shelf_labels').upsert({
        company_id: activeCompanyId, item_code: item.item_code, system_price: item.new_price,
        label_price: item.new_price, sync_status: 'synced', last_synced_at: new Date().toISOString(), discrepancy: false,
      }, { onConflict: 'id' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shelf-label'] }); toast({ title: 'Price applied' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = {
    total: labels.length,
    synced: labels.filter(l => l.sync_status === 'synced').length,
    pending: labels.filter(l => l.sync_status === 'pending').length,
    discrepancies: labels.filter(l => l.discrepancy).length,
    queuePending: queue.filter(q => q.status === 'pending').length,
  };

  return { labels, queue, isLoading, queueLoading, stats, queuePriceChange, applyChange };
}
