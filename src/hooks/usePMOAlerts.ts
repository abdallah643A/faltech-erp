import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface PMOAlertRule {
  id: string;
  company_id: string | null;
  rule_name: string;
  alert_category: string;
  severity: string;
  condition_type: string;
  threshold_value: number | null;
  threshold_operator: string;
  is_active: boolean;
  frequency: string;
  escalation_hours: number;
  notification_channels: string[];
  recipients: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PMOAlert {
  id: string;
  company_id: string | null;
  rule_id: string | null;
  project_id: string | null;
  alert_category: string;
  severity: string;
  title: string;
  description: string | null;
  metric_name: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  status: string;
  snoozed_until: string | null;
  escalated_at: string | null;
  escalated_to: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  dismiss_reason: string | null;
  root_cause: string | null;
  recommended_actions: any;
  related_entity_type: string | null;
  related_entity_id: string | null;
  link_url: string | null;
  created_at: string;
  updated_at: string;
  project?: { name: string } | null;
}

export interface PMOAlertAction {
  id: string;
  alert_id: string;
  action_type: string;
  performed_by: string | null;
  performed_by_name: string | null;
  comment: string | null;
  metadata: any;
  created_at: string;
}

export interface PMOAlertSubscription {
  id: string;
  user_id: string;
  alert_category: string;
  severity_filter: string[];
  in_app_enabled: boolean;
  email_enabled: boolean;
  email_frequency: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_days: string[];
  created_at: string;
  updated_at: string;
}

export function usePMOAlerts() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('pmo-alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pmo_alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Fetch alerts
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['pmo-alerts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_alerts').select('*, project:projects(name)').order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PMOAlert[];
    },
    enabled: !!user,
  });

  // Fetch rules
  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['pmo-alert-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_alert_rules').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PMOAlertRule[];
    },
    enabled: !!user,
  });

  // Fetch actions for a specific alert
  const useAlertActions = (alertId: string | null) => useQuery({
    queryKey: ['pmo-alert-actions', alertId],
    queryFn: async () => {
      if (!alertId) return [];
      const { data, error } = await supabase.from('pmo_alert_actions').select('*').eq('alert_id', alertId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PMOAlertAction[];
    },
    enabled: !!alertId,
  });

  // Fetch subscriptions
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['pmo-alert-subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pmo_alert_subscriptions').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return (data || []) as PMOAlertSubscription[];
    },
    enabled: !!user,
  });

  // Mutations
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from('pmo_alerts').update({
        status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id,
      } as any).eq('id', alertId);
      if (error) throw error;
      await supabase.from('pmo_alert_actions').insert({
        alert_id: alertId, action_type: 'acknowledge', performed_by: user?.id,
      } as any);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] }); },
  });

  const dismissAlert = useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason?: string }) => {
      const { error } = await supabase.from('pmo_alerts').update({
        status: 'dismissed', dismissed_at: new Date().toISOString(), dismissed_by: user?.id, dismiss_reason: reason,
      } as any).eq('id', alertId);
      if (error) throw error;
      await supabase.from('pmo_alert_actions').insert({
        alert_id: alertId, action_type: 'dismiss', performed_by: user?.id, comment: reason,
      } as any);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] }); },
  });

  const resolveAlert = useMutation({
    mutationFn: async ({ alertId, comment }: { alertId: string; comment?: string }) => {
      const { error } = await supabase.from('pmo_alerts').update({
        status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id,
      } as any).eq('id', alertId);
      if (error) throw error;
      await supabase.from('pmo_alert_actions').insert({
        alert_id: alertId, action_type: 'resolve', performed_by: user?.id, comment,
      } as any);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] }); },
  });

  const snoozeAlert = useMutation({
    mutationFn: async ({ alertId, hours }: { alertId: string; hours: number }) => {
      const until = new Date(Date.now() + hours * 3600000).toISOString();
      const { error } = await supabase.from('pmo_alerts').update({
        status: 'snoozed', snoozed_until: until,
      } as any).eq('id', alertId);
      if (error) throw error;
      await supabase.from('pmo_alert_actions').insert({
        alert_id: alertId, action_type: 'snooze', performed_by: user?.id, metadata: { hours, until },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] });
      toast({ title: 'Alert snoozed' });
    },
  });

  const escalateAlert = useMutation({
    mutationFn: async ({ alertId, comment }: { alertId: string; comment?: string }) => {
      const { error } = await supabase.from('pmo_alerts').update({
        status: 'escalated', escalated_at: new Date().toISOString(),
      } as any).eq('id', alertId);
      if (error) throw error;
      await supabase.from('pmo_alert_actions').insert({
        alert_id: alertId, action_type: 'escalate', performed_by: user?.id, comment,
      } as any);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] }); },
  });

  const createAlert = useMutation({
    mutationFn: async (alert: Partial<PMOAlert>) => {
      const { error } = await supabase.from('pmo_alerts').insert({
        ...alert, company_id: activeCompanyId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alerts'] });
      toast({ title: 'Alert created' });
    },
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<PMOAlertRule>) => {
      const { error } = await supabase.from('pmo_alert_rules').insert({
        ...rule, company_id: activeCompanyId, created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alert-rules'] });
      toast({ title: 'Alert rule created' });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PMOAlertRule> & { id: string }) => {
      const { error } = await supabase.from('pmo_alert_rules').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alert-rules'] });
      toast({ title: 'Alert rule updated' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pmo_alert_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alert-rules'] });
      toast({ title: 'Alert rule deleted' });
    },
  });

  const upsertSubscription = useMutation({
    mutationFn: async (sub: Partial<PMOAlertSubscription>) => {
      const { error } = await supabase.from('pmo_alert_subscriptions').upsert({
        ...sub, user_id: user?.id,
      } as any, { onConflict: 'user_id,alert_category' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-alert-subscriptions'] });
      toast({ title: 'Preferences saved' });
    },
  });

  // Computed stats
  const newAlerts = alerts.filter(a => a.status === 'new');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed');
  const activeAlerts = alerts.filter(a => !['resolved', 'dismissed'].includes(a.status));

  const alertsByCategory = alerts.reduce((acc, a) => {
    acc[a.alert_category] = (acc[a.alert_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const alertsBySeverity = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  return {
    alerts, loadingAlerts,
    rules, loadingRules,
    subscriptions,
    newAlerts, criticalAlerts, activeAlerts,
    alertsByCategory, alertsBySeverity,
    acknowledgeAlert, dismissAlert, resolveAlert, snoozeAlert, escalateAlert,
    createAlert, createRule, updateRule, deleteRule, upsertSubscription,
    useAlertActions,
  };
}
