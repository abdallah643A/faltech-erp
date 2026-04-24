import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundJob {
  id: string;
  job_type: string;
  entity_name: string | null;
  status: string;
  progress: number;
  total_items: number;
  processed_items: number;
  failed_items: number;
  skipped_items: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  error_details: any;
  result_summary: any;
  created_by: string | null;
  company_id: string | null;
  created_at: string;
}

export function useBackgroundJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ['background-jobs', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('app_background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter && statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }
      const { data } = await q;
      return (data || []) as BackgroundJob[];
    },
    refetchInterval: 5000,
  });
}
