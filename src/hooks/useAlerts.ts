import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface SAPAlert {
  id: string;
  company_id: string | null;
  alert_name: string;
  alert_type: string;
  category: string;
  priority: string;
  condition_field: string | null;
  condition_operator: string | null;
  condition_value: string | null;
  target_entity: string | null;
  message_template: string | null;
  is_active: boolean;
  frequency: string;
  last_triggered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertInstance {
  id: string;
  alert_id: string;
  company_id: string | null;
  user_id: string | null;
  title: string;
  message: string;
  priority: string;
  category: string;
  status: string;
  source_entity: string | null;
  source_record_id: string | null;
  source_link: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export function useAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: alertRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['sap-alerts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sap_alerts').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as SAPAlert[];
    },
  });

  const { data: alertInstances = [], isLoading: loadingInstances } = useQuery({
    queryKey: ['sap-alert-instances', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sap_alert_instances').select('*').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as AlertInstance[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<SAPAlert>) => {
      const { error } = await supabase.from('sap_alerts').insert({
        ...rule,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alerts'] });
      toast({ title: 'Alert rule created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SAPAlert> & { id: string }) => {
      const { error } = await supabase.from('sap_alerts').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alerts'] });
      toast({ title: 'Alert rule updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_alerts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alerts'] });
      toast({ title: 'Alert rule deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const acknowledgeInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_alert_instances').update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alert-instances'] });
    },
  });

  const dismissInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_alert_instances').update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alert-instances'] });
    },
  });

  const createInstance = useMutation({
    mutationFn: async (instance: Partial<AlertInstance>) => {
      const { error } = await supabase.from('sap_alert_instances').insert({
        ...instance,
        company_id: activeCompanyId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-alert-instances'] });
    },
  });

  const newCount = alertInstances.filter(a => a.status === 'new').length;

  return {
    alertRules, loadingRules,
    alertInstances, loadingInstances,
    newCount,
    createRule, updateRule, deleteRule,
    acknowledgeInstance, dismissInstance, createInstance,
  };
}
