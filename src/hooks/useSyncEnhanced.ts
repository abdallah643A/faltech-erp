import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';

// ============ PUSH QUEUE ============

export function usePushQueue(entityFilter?: string, statusFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['push-queue', activeCompanyId, entityFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from('sap_push_queue').select('*').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (entityFilter) q = q.eq('entity_type', entityFilter);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });
}

export function usePushQueueStats() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['push-queue-stats', activeCompanyId],
    queryFn: async () => {
      const statuses = ['pending', 'processing', 'pushed', 'failed'];
      const counts: Record<string, number> = {};
      for (const s of statuses) {
        let q = supabase.from('sap_push_queue').select('id', { count: 'exact', head: true }).eq('status', s);
        if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
        const { count } = await q;
        counts[s] = count || 0;
      }
      return counts;
    },
    refetchInterval: 15000,
  });
}

export function usePushQueueActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const retryFailed = useMutation({
    mutationFn: async (params: { record_ids?: string[]; entity_type?: string }) => {
      let q = supabase.from('sap_push_queue').update({ status: 'pending', error_message: null, next_retry_at: null }).eq('status', 'failed');
      if (params.record_ids?.length) q = q.in('id', params.record_ids);
      if (params.entity_type) q = q.eq('entity_type', params.entity_type);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['push-queue'] }); toast({ title: 'Failed records queued for retry' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_push_queue').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['push-queue'] }); toast({ title: 'Record cancelled' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { retryFailed, cancelRecord };
}

// ============ SCHEDULER ============

export function useSyncSchedules() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['sync-schedules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sync_entity_config').select('*').order('dependency_order');
      if (error) throw error;
      return data || [];
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async (params: { id: string; schedule_frequency: string; schedule_cron?: string; schedule_enabled: boolean }) => {
      const { error } = await supabase.from('sync_entity_config').update({
        schedule_frequency: params.schedule_frequency,
        schedule_cron: params.schedule_cron || null,
        schedule_enabled: params.schedule_enabled,
      }).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sync-schedules'] }); toast({ title: 'Schedule updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, schedules: query.data || [], updateSchedule };
}

// ============ METADATA DISCOVERY ============

export function useMetadataCache(typeFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sap-metadata-cache', activeCompanyId, typeFilter],
    queryFn: async () => {
      let q = supabase.from('sap_metadata_cache').select('*').order('object_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (typeFilter) q = q.eq('metadata_type', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMetadataComparisons(directionFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sap-metadata-comparisons', activeCompanyId, directionFilter],
    queryFn: async () => {
      let q = supabase.from('sap_metadata_comparisons').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (directionFilter) q = q.eq('comparison_type', directionFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMetadataActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const approveProvisioning = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('sap_metadata_comparisons').update({
        provisioning_status: 'approved',
        provisioned_by: user?.id,
      }).in('id', ids);
      if (error) throw error;
      // Audit
      await supabase.from('sap_sync_audit_log').insert({
        action: 'Approved metadata provisioning',
        action_category: 'provisioning',
        details: { ids } as any,
        performed_by: user?.id,
        performed_by_name: user?.email,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sap-metadata-comparisons'] }); toast({ title: 'Provisioning approved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const skipComparison = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_metadata_comparisons').update({ provisioning_status: 'skipped' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sap-metadata-comparisons'] }); toast({ title: 'Skipped' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { approveProvisioning, skipComparison };
}

// ============ FIELD MAPPINGS ============

export function useFieldMappings(entityFilter?: string, directionFilter?: string) {
  return useQuery({
    queryKey: ['sap-field-mappings', entityFilter, directionFilter],
    queryFn: async () => {
      let q = supabase.from('sap_sync_field_mappings').select('*').order('sort_order');
      if (entityFilter) q = q.eq('entity_name', entityFilter);
      if (directionFilter) q = q.eq('direction', directionFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFieldMappingActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMapping = useMutation({
    mutationFn: async (mapping: any) => {
      const { error } = await supabase.from('sap_sync_field_mappings').insert(mapping);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sap-field-mappings'] }); toast({ title: 'Mapping created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMapping = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('sap_sync_field_mappings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sap-field-mappings'] }); toast({ title: 'Mapping updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_sync_field_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sap-field-mappings'] }); toast({ title: 'Mapping deleted' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { createMapping, updateMapping, deleteMapping };
}

// ============ SYNC AUDIT LOG ============

export function useSyncAuditLog(categoryFilter?: string, entityFilter?: string) {
  return useQuery({
    queryKey: ['sap-sync-audit', categoryFilter, entityFilter],
    queryFn: async () => {
      let q = supabase.from('sap_sync_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (categoryFilter) q = q.eq('action_category', categoryFilter);
      if (entityFilter) q = q.eq('entity_name', entityFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useLogSyncAudit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { action: string; action_category: string; entity_name?: string; details?: any }) => {
      const { error } = await supabase.from('sap_sync_audit_log').insert({
        ...entry,
        details: entry.details as any,
        performed_by: user?.id,
        performed_by_name: user?.email,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sap-sync-audit'] }),
  });
}
