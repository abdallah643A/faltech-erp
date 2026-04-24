import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useBranchBenchmarking() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['branch-metrics', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_branch_metrics' as any).select('*')
        .eq('company_id', activeCompanyId!).order('period_start', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: itemMix } = useQuery({
    queryKey: ['item-mix', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_item_mix_analysis' as any).select('*')
        .eq('company_id', activeCompanyId!).order('revenue', { ascending: false }).limit(100));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const generateSnapshot = useMutation({
    mutationFn: async (params: { branch_id: string; snapshot_date: string; metrics: any }) => {
      const { error } = await (supabase.from('pos_branch_metric_snapshots' as any).insert({
        company_id: activeCompanyId, ...params,
      }));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-metrics'] });
      toast({ title: 'Snapshot saved' });
    },
  });

  return { metrics, itemMix, isLoading, generateSnapshot };
}
