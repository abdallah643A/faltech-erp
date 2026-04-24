import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function usePOSExceptions() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['pos-exceptions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_exception_events')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('event_timestamp', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: rules } = useQuery({
    queryKey: ['pos-exception-rules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_exception_rules')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('rule_type');
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: riskScores } = useQuery({
    queryKey: ['pos-risk-scores', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_cashier_risk_scores')
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('risk_score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const createRule = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from('pos_exception_rules').insert({ ...values, company_id: activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-exception-rules'] });
      toast({ title: 'Rule Created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const investigateException = useMutation({
    mutationFn: async (values: { id: string; status: string; investigation_notes?: string; resolution?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('pos_exception_events').update({
        status: values.status,
        investigation_notes: values.investigation_notes,
        resolution: values.resolution,
        investigated_by: userData.user?.id,
        investigated_by_name: userData.user?.email,
        investigated_at: new Date().toISOString(),
      }).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-exceptions'] });
      toast({ title: 'Exception Updated' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const stats = {
    totalOpen: exceptions?.filter(e => e.status === 'open').length || 0,
    totalCritical: exceptions?.filter(e => e.severity === 'critical' && e.status === 'open').length || 0,
    totalVoids: exceptions?.filter(e => e.event_type === 'void').length || 0,
    totalRefunds: exceptions?.filter(e => e.event_type === 'refund').length || 0,
    totalOverrides: exceptions?.filter(e => e.event_type === 'price_override' || e.event_type === 'discount_override').length || 0,
    highRiskCashiers: riskScores?.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length || 0,
  };

  return {
    exceptions,
    rules,
    riskScores,
    stats,
    isLoading,
    createRule,
    investigateException,
  };
}
