import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCrossSell() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['crosssell-rules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_crosssell_rules' as any).select('*')
        .eq('company_id', activeCompanyId!).order('priority', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: logs } = useQuery({
    queryKey: ['crosssell-logs', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_crosssell_log' as any).select('*')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await (supabase.from('pos_crosssell_rules' as any).insert({
        company_id: activeCompanyId, ...rule,
      }));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crosssell-rules'] });
      toast({ title: 'Cross-sell rule created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getRecommendations = async (basketItems: string[]) => {
    // Rule-based recommendations
    const ruleRecs = (rules || []).filter((r: any) =>
      r.is_active && basketItems.some(item =>
        item === r.trigger_item_code || item === r.trigger_category
      )
    ).map((r: any) => ({
      source: 'rule' as const, item_code: r.recommended_item_code,
      item_name: r.recommended_item_name, rule_type: r.rule_type,
      discount_percent: r.discount_percent, rule_id: r.id,
    }));

    // AI recommendations
    try {
      const { data, error } = await supabase.functions.invoke('pos-crosssell', {
        body: { basket_items: basketItems, company_id: activeCompanyId },
      });
      if (!error && data?.recommendations) {
        const aiRecs = data.recommendations.map((r: any) => ({ ...r, source: 'ai' as const }));
        return [...ruleRecs, ...aiRecs];
      }
    } catch { /* fallback to rules only */ }

    return ruleRecs;
  };

  const logRecommendation = useMutation({
    mutationFn: async (log: any) => {
      await (supabase.from('pos_crosssell_log' as any).insert({
        company_id: activeCompanyId, ...log,
      }));
    },
  });

  return { rules, logs, isLoading, createRule, getRecommendations, logRecommendation };
}
