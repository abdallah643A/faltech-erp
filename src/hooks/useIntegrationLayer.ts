import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

const q = (table: string) => supabase.from(table as any);

export function useIntegrationStats() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-stats', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [clients, subs, deliveries, events, templates, mappings, connectors, docs] = await Promise.all([
        q('integration_api_clients').select('id,status,auth_method', { count: 'exact' }).eq('company_id', activeCompanyId!),
        q('integration_webhook_subscriptions').select('id,status', { count: 'exact' }).eq('company_id', activeCompanyId!),
        q('integration_webhook_deliveries').select('id,status,is_dead_letter,attempt_count,created_at', { count: 'exact' }).eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(100),
        supabase.from('integration_monitor_events').select('id,status,direction,event_type,created_at', { count: 'exact' }).eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(100),
        q('integration_import_export_templates').select('id,status,template_type', { count: 'exact' }).eq('company_id', activeCompanyId!),
        q('integration_field_mappings').select('id,governance_status', { count: 'exact' }).eq('company_id', activeCompanyId!),
        q('integration_connector_templates').select('id,category,status', { count: 'exact' }).eq('company_id', activeCompanyId!),
        q('integration_interface_docs').select('id,status,version', { count: 'exact' }).eq('company_id', activeCompanyId!),
      ]);
      [clients, subs, deliveries, events, templates, mappings, connectors, docs].forEach(r => { if (r.error) throw r.error; });
      return { clients, subs, deliveries, events, templates, mappings, connectors, docs };
    },
  });
}

export function useIntegrationApiClients() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-api-clients', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await q('integration_api_clients').select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useIntegrationWebhookDeliveries() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-webhook-deliveries', activeCompanyId],
    enabled: !!activeCompanyId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await q('integration_webhook_deliveries')
        .select('*, integration_webhook_subscriptions(subscription_name, endpoint_url)')
        .eq('company_id', activeCompanyId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useIntegrationWebhooks() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-webhooks', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [topics, subs] = await Promise.all([
        q('integration_webhook_topics').select('*').eq('company_id', activeCompanyId!).order('topic'),
        q('integration_webhook_subscriptions').select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }),
      ]);
      if (topics.error) throw topics.error;
      if (subs.error) throw subs.error;
      return { topics: topics.data as any[], subscriptions: subs.data as any[] };
    },
  });
}

export function useIntegrationTemplates() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-templates', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [templates, mappings, syncControls] = await Promise.all([
        q('integration_import_export_templates').select('*').eq('company_id', activeCompanyId!).order('updated_at', { ascending: false }),
        q('integration_field_mappings').select('*').eq('company_id', activeCompanyId!).order('updated_at', { ascending: false }),
        q('integration_master_data_sync_controls').select('*').eq('company_id', activeCompanyId!).order('entity_name'),
      ]);
      if (templates.error) throw templates.error;
      if (mappings.error) throw mappings.error;
      if (syncControls.error) throw syncControls.error;
      return { templates: templates.data as any[], mappings: mappings.data as any[], syncControls: syncControls.data as any[] };
    },
  });
}

export function useIntegrationConnectorsDocs() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['integration-connectors-docs', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [connectors, docs] = await Promise.all([
        q('integration_connector_templates').select('*').eq('company_id', activeCompanyId!).order('category'),
        q('integration_interface_docs').select('*').eq('company_id', activeCompanyId!).order('updated_at', { ascending: false }),
      ]);
      if (connectors.error) throw connectors.error;
      if (docs.error) throw docs.error;
      return { connectors: connectors.data as any[], docs: docs.data as any[] };
    },
  });
}

export function useIntegrationMutations() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['integration-stats'] });
    qc.invalidateQueries({ queryKey: ['integration-api-clients'] });
    qc.invalidateQueries({ queryKey: ['integration-webhooks'] });
    qc.invalidateQueries({ queryKey: ['integration-templates'] });
    qc.invalidateQueries({ queryKey: ['integration-connectors-docs'] });
    qc.invalidateQueries({ queryKey: ['integration-webhook-deliveries'] });
  };

  const createClient = useMutation({
    mutationFn: async (payload: any) => {
      const rawKey = `erp_${crypto.randomUUID().replace(/-/g, '')}_${crypto.randomUUID().slice(0, 8)}`;
      const secret = crypto.randomUUID().replace(/-/g, '');
      const [apiHash, oauthHash] = await Promise.all([sha256(rawKey), sha256(secret)]);
      const row = {
        ...payload,
        company_id: activeCompanyId,
        client_code: payload.client_code || payload.client_name?.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        api_key_hash: apiHash,
        api_key_prefix: rawKey.slice(0, 12),
        oauth_client_id: payload.oauth_client_id || `client_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
        oauth_client_secret_hash: oauthHash,
      };
      const { data, error } = await q('integration_api_clients').insert(row).select().single();
      if (error) throw error;
      return { ...(data as unknown as Record<string, unknown>), api_key_once: rawKey, oauth_client_secret_once: secret };
    },
    onSuccess: () => { invalidate(); toast({ title: 'Partner client created', description: 'Copy generated secrets now; they are only shown once.' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const upsertTopic = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_webhook_topics').upsert({ ...payload, company_id: activeCompanyId }, { onConflict: 'company_id,topic' });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Webhook topic saved' }); },
  });

  const createSubscription = useMutation({
    mutationFn: async (payload: any) => {
      const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
      const { data, error } = await q('integration_webhook_subscriptions').insert({
        ...payload,
        company_id: activeCompanyId,
        signing_secret_hash: await sha256(rawSecret),
        signing_secret_prefix: rawSecret.slice(0, 10),
      }).select().single();
      if (error) throw error;
      return { ...(data as unknown as Record<string, unknown>), signing_secret_once: rawSecret };
    },
    onSuccess: () => { invalidate(); toast({ title: 'Webhook subscription created' }); },
  });

  const replayDelivery = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await (supabase as any).rpc('integration_replay_delivery', { p_delivery_id: deliveryId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Delivery queued for replay' }); },
  });

  const upsertTemplate = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_import_export_templates').upsert({ ...payload, company_id: activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Template saved' }); },
  });

  const upsertMapping = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_field_mappings').upsert({ ...payload, company_id: activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Mapping saved' }); },
  });

  const upsertSyncControl = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_master_data_sync_controls').upsert({ ...payload, company_id: activeCompanyId }, { onConflict: 'company_id,connector_code,entity_name' });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Sync control saved' }); },
  });

  const upsertConnector = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_connector_templates').upsert({ ...payload, company_id: activeCompanyId }, { onConflict: 'company_id,connector_code' });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Connector template saved' }); },
  });

  const upsertDoc = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await q('integration_interface_docs').upsert({ ...payload, company_id: activeCompanyId }, { onConflict: 'company_id,doc_key,version' });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Interface documentation saved' }); },
  });

  return { createClient, upsertTopic, createSubscription, replayDelivery, upsertTemplate, upsertMapping, upsertSyncControl, upsertConnector, upsertDoc };
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
