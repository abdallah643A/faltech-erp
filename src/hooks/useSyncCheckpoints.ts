import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useSyncCheckpoints() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-checkpoints', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sap_sync_checkpoints')
        .select('*')
        .eq('company_id', activeCompanyId || '')
        .order('updated_at', { ascending: false });
      return data || [];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 15000,
  });
}

export function useSyncRowStateStats() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-row-state-stats', activeCompanyId],
    queryFn: async () => {
      // Get counts per entity and status
      const { data } = await supabase
        .from('sap_sync_row_state')
        .select('entity_name, sync_status')
        .eq('company_id', activeCompanyId || '');
      
      const stats: Record<string, Record<string, number>> = {};
      (data || []).forEach((row: any) => {
        if (!stats[row.entity_name]) stats[row.entity_name] = {};
        stats[row.entity_name][row.sync_status] = (stats[row.entity_name][row.sync_status] || 0) + 1;
      });
      return stats;
    },
    enabled: !!activeCompanyId,
    refetchInterval: 30000,
  });
}

export function usePushQueueStats() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['push-queue-stats', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sap_push_queue')
        .select('entity_name, push_status')
        .eq('company_id', activeCompanyId || '');
      
      const stats: Record<string, Record<string, number>> = {};
      (data || []).forEach((row: any) => {
        if (!stats[row.entity_name]) stats[row.entity_name] = {};
        stats[row.entity_name][row.push_status] = (stats[row.entity_name][row.push_status] || 0) + 1;
      });
      return stats;
    },
    enabled: !!activeCompanyId,
    refetchInterval: 10000,
  });
}
