import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

async function callSyncAdmin(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('sap-sync-admin', {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data && !data.success && data.error) throw new Error(data.error);
  return data;
}

export function useSyncAdminDashboard() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-dashboard', activeCompanyId],
    queryFn: () => callSyncAdmin('get_dashboard_stats', { company_id: activeCompanyId }),
    refetchInterval: 15000,
    select: (d) => d?.data,
  });
}

export function useSyncAdminJobs(entityFilter?: string, statusFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-jobs', activeCompanyId, entityFilter, statusFilter],
    queryFn: () => callSyncAdmin('get_jobs', {
      company_id: activeCompanyId,
      entity_name: entityFilter || undefined,
      status: statusFilter || undefined,
    }),
    select: (d) => d?.data || [],
  });
}

export function useSyncAdminJobDetail(jobId?: string) {
  return useQuery({
    queryKey: ['sync-admin-job-detail', jobId],
    queryFn: () => callSyncAdmin('get_job_detail', { job_id: jobId }),
    enabled: !!jobId,
    select: (d) => d?.data,
  });
}

export function useSyncAdminFailedRecords(entityFilter?: string, categoryFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-failed', activeCompanyId, entityFilter, categoryFilter],
    queryFn: () => callSyncAdmin('get_failed_records', {
      company_id: activeCompanyId,
      entity_type: entityFilter || undefined,
      error_category: categoryFilter || undefined,
    }),
    select: (d) => d?.data || [],
  });
}

export function useSyncAdminPerformance(entityFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-performance', activeCompanyId, entityFilter],
    queryFn: () => callSyncAdmin('get_performance', {
      company_id: activeCompanyId,
      entity_name: entityFilter || undefined,
    }),
    select: (d) => ({ logs: d?.data || [], summary: d?.summary || [] }),
  });
}

export function useSyncAdminConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['sync-admin-config'],
    queryFn: () => callSyncAdmin('get_config'),
    select: (d) => d?.data || [],
  });

  const updateConfig = useMutation({
    mutationFn: (params: { config_id: string; [key: string]: any }) =>
      callSyncAdmin('update_config', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-admin-config'] });
      toast({ title: 'Configuration updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, configs: query.data || [], updateConfig };
}

export function useSyncAdminWatermarks(entityFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-watermarks', activeCompanyId, entityFilter],
    queryFn: () => callSyncAdmin('get_watermarks', {
      company_id: activeCompanyId,
      entity_name: entityFilter || undefined,
    }),
    select: (d) => d?.data || [],
  });
}

export function useSyncAdminQueue() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['sync-admin-queue', activeCompanyId],
    queryFn: () => callSyncAdmin('get_queue', { company_id: activeCompanyId }),
    select: (d) => d?.data || [],
    refetchInterval: 10000,
  });
}

// Mutations
export function useSyncAdminActions() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sync-admin-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['sync-admin-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['sync-admin-failed'] });
    queryClient.invalidateQueries({ queryKey: ['sync-admin-queue'] });
  };

  const retryFailed = useMutation({
    mutationFn: (params: { record_ids?: string[]; entity_type?: string }) =>
      callSyncAdmin('retry_failed', { ...params, company_id: activeCompanyId }),
    onSuccess: (data) => {
      toast({ title: 'Records queued for retry', description: `${data?.reset_count || 0} records reset` });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const skipRecord = useMutation({
    mutationFn: (params: { record_id: string; reason?: string }) =>
      callSyncAdmin('skip_record', params),
    onSuccess: () => {
      toast({ title: 'Record skipped' });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resetWatermark = useMutation({
    mutationFn: (params: { entity_name: string }) =>
      callSyncAdmin('reset_watermark', { ...params, company_id: activeCompanyId, confirmation_token: 'CONFIRM_RESET' }),
    onSuccess: (_, vars) => {
      toast({ title: 'Watermark reset', description: `${vars.entity_name} will do a full sync next time` });
      queryClient.invalidateQueries({ queryKey: ['sync-admin-watermarks'] });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const pauseEntity = useMutation({
    mutationFn: (entity_name: string) =>
      callSyncAdmin('pause_entity', { entity_name }),
    onSuccess: () => {
      toast({ title: 'Entity paused' });
      queryClient.invalidateQueries({ queryKey: ['sync-admin-config'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resumeEntity = useMutation({
    mutationFn: (entity_name: string) =>
      callSyncAdmin('resume_entity', { entity_name }),
    onSuccess: () => {
      toast({ title: 'Entity resumed' });
      queryClient.invalidateQueries({ queryKey: ['sync-admin-config'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelJob = useMutation({
    mutationFn: (job_id: string) =>
      callSyncAdmin('cancel_job', { job_id }),
    onSuccess: () => {
      toast({ title: 'Job cancelled' });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const triggerSync = useMutation({
    mutationFn: (params: { entity_name: string; direction?: string; job_type?: string; date_from?: string; date_to?: string; entity_id?: string; delta_sync?: boolean }) =>
      callSyncAdmin('trigger_sync', { ...params, company_id: activeCompanyId }),
    onSuccess: () => {
      toast({ title: 'Sync job queued' });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const exportFailed = useMutation({
    mutationFn: (entity_type?: string) =>
      callSyncAdmin('export_failed', { company_id: activeCompanyId, entity_type }),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data?.data || [], null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sync-failed-records-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', description: `${data?.count || 0} records exported` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { retryFailed, skipRecord, resetWatermark, pauseEntity, resumeEntity, cancelJob, triggerSync, exportFailed };
}
