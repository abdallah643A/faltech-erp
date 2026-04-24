import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface SyncJob {
  id: string;
  job_number: string;
  entity_name: string;
  company_id: string | null;
  direction: string;
  job_type: string;
  status: string;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  watermark_before: string | null;
  watermark_after: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  triggered_by: string | null;
  triggered_by_name: string | null;
  trigger_type: string;
  filters: any;
  error_summary: string | null;
  checkpoint: any;
  created_at: string;
}

export function useSyncJobs(entityFilter?: string, statusFilter?: string) {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sync-jobs', activeCompanyId, entityFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (entityFilter) q = q.eq('entity_name', entityFilter);
      if (statusFilter) q = q.eq('status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SyncJob[];
    },
  });

  return { ...query, jobs: query.data || [] };
}

export function useSyncEntityConfig() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['sync-entity-config', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('sync_entity_config')
        .select('*')
        .order('dependency_order');

      // Get configs without company_id (defaults) or matching company
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (config: { id: string; [key: string]: any }) => {
      const { id, ...updates } = config;
      const { error } = await supabase
        .from('sync_entity_config')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-entity-config'] });
      toast({ title: 'Configuration updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { ...query, configs: query.data || [], updateConfig };
}

export function useSyncRecordTracker(entityFilter?: string, statusFilter?: string) {
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['sync-record-tracker', activeCompanyId, entityFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('sync_record_tracker')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (entityFilter) q = q.eq('entity_type', entityFilter);
      if (statusFilter) q = q.eq('sync_status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, records: query.data || [] };
}

export function useSyncWatermarks() {
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['sync-watermarks', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('sync_watermarks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, watermarks: query.data || [] };
}

export function useSyncPerformance() {
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['sync-performance', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('sync_performance_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return { ...query, performanceLogs: query.data || [] };
}

export function useSyncDashboardStats() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['sync-dashboard-stats', activeCompanyId],
    queryFn: async () => {
      // Get running jobs count
      let runningQ = supabase.from('sync_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running');
      if (activeCompanyId) runningQ = runningQ.eq('company_id', activeCompanyId);
      const { count: runningCount } = await runningQ;

      // Get pending records count
      let pendingQ = supabase.from('sync_record_tracker').select('id', { count: 'exact', head: true }).eq('sync_status', 'pending');
      if (activeCompanyId) pendingQ = pendingQ.eq('company_id', activeCompanyId);
      const { count: pendingCount } = await pendingQ;

      // Get failed records count
      let failedQ = supabase.from('sync_record_tracker').select('id', { count: 'exact', head: true }).eq('sync_status', 'failed');
      if (activeCompanyId) failedQ = failedQ.eq('company_id', activeCompanyId);
      const { count: failedCount } = await failedQ;

      // Get today's processed count
      const today = new Date().toISOString().split('T')[0];
      let todayQ = supabase.from('sync_jobs').select('records_fetched, records_inserted, records_updated').gte('created_at', today);
      if (activeCompanyId) todayQ = todayQ.eq('company_id', activeCompanyId);
      const { data: todayJobs } = await todayQ;
      const todayProcessed = (todayJobs || []).reduce((sum, j) => sum + (j.records_inserted || 0) + (j.records_updated || 0), 0);

      // Get last sync per entity
      let lastSyncQ = supabase.from('sync_jobs').select('entity_name, completed_at, status, records_fetched, records_inserted, records_updated, records_failed, duration_ms').eq('status', 'completed').order('completed_at', { ascending: false }).limit(50);
      if (activeCompanyId) lastSyncQ = lastSyncQ.eq('company_id', activeCompanyId);
      const { data: lastSyncs } = await lastSyncQ;

      // Deduplicate to get latest per entity
      const entityLastSync: Record<string, any> = {};
      (lastSyncs || []).forEach((s) => {
        if (!entityLastSync[s.entity_name]) entityLastSync[s.entity_name] = s;
      });

      return {
        runningCount: runningCount || 0,
        pendingCount: pendingCount || 0,
        failedCount: failedCount || 0,
        todayProcessed,
        entityLastSync,
      };
    },
    refetchInterval: 15000,
  });
}
