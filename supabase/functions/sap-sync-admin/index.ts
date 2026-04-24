import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userId = user.id;

    // Check admin/manager role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'manager']);

    if (!userRoles || userRoles.length === 0) {
      return jsonResponse({ error: 'Admin or manager role required' }, 403);
    }

    const isAdmin = userRoles.some((r: any) => r.role === 'admin');

    // Get user profile for company context
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('active_company_id, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;
    const companyId = params.company_id || profile?.active_company_id;

    switch (action) {
      // ======== JOBS ========
      case 'get_jobs': {
        let q = supabaseAdmin
          .from('sync_jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(params.limit || 100);
        if (companyId) q = q.eq('company_id', companyId);
        if (params.entity_name) q = q.eq('entity_name', params.entity_name);
        if (params.status) q = q.eq('status', params.status);
        if (params.from_date) q = q.gte('created_at', params.from_date);
        if (params.to_date) q = q.lte('created_at', params.to_date);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'get_job_detail': {
        if (!params.job_id) return jsonResponse({ error: 'job_id required' }, 400);
        const [jobRes, stagesRes] = await Promise.all([
          supabaseAdmin.from('sync_jobs').select('*').eq('id', params.job_id).maybeSingle(),
          supabaseAdmin.from('sync_job_stages').select('*').eq('job_id', params.job_id).order('started_at'),
        ]);
        if (jobRes.error) throw jobRes.error;
        return jsonResponse({ success: true, data: { job: jobRes.data, stages: stagesRes.data || [] } });
      }

      // ======== FAILED RECORDS ========
      case 'get_failed_records': {
        let q = supabaseAdmin
          .from('sync_record_tracker')
          .select('*')
          .eq('sync_status', 'failed')
          .order('updated_at', { ascending: false })
          .limit(params.limit || 200);
        if (companyId) q = q.eq('company_id', companyId);
        if (params.entity_type) q = q.eq('entity_type', params.entity_type);
        if (params.error_category) q = q.eq('error_category', params.error_category);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'retry_failed': {
        // Retry specific records or all failed for an entity
        let q = supabaseAdmin
          .from('sync_record_tracker')
          .update({
            sync_status: 'pending',
            error_message: null,
            error_category: null,
            updated_at: new Date().toISOString(),
          })
          .eq('sync_status', 'failed');

        if (params.record_ids && Array.isArray(params.record_ids)) {
          q = q.in('id', params.record_ids);
        } else if (params.entity_type) {
          q = q.eq('entity_type', params.entity_type);
          if (companyId) q = q.eq('company_id', companyId);
        } else {
          return jsonResponse({ error: 'record_ids or entity_type required' }, 400);
        }

        const { data, error, count } = await q.select('id');
        if (error) throw error;
        return jsonResponse({ success: true, reset_count: data?.length || 0 });
      }

      case 'skip_record': {
        if (!params.record_id) return jsonResponse({ error: 'record_id required' }, 400);
        const { error } = await supabaseAdmin
          .from('sync_record_tracker')
          .update({
            sync_status: 'skipped',
            error_message: params.reason || 'Manually skipped',
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.record_id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // ======== PERFORMANCE ========
      case 'get_performance': {
        let q = supabaseAdmin
          .from('sync_performance_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(params.limit || 500);
        if (companyId) q = q.eq('company_id', companyId);
        if (params.entity_name) q = q.eq('entity_name', params.entity_name);
        const { data, error } = await q;
        if (error) throw error;

        // Compute aggregations
        const byEntity: Record<string, { count: number; totalDuration: number; totalRecords: number; totalApiTime: number; errors: number }> = {};
        for (const log of data || []) {
          const key = log.entity_name;
          if (!byEntity[key]) byEntity[key] = { count: 0, totalDuration: 0, totalRecords: 0, totalApiTime: 0, errors: 0 };
          byEntity[key].count++;
          byEntity[key].totalDuration += log.duration_ms || 0;
          byEntity[key].totalRecords += log.records_processed || 0;
          byEntity[key].totalApiTime += log.api_response_time_ms || 0;
          if (log.records_failed > 0) byEntity[key].errors++;
        }

        const summary = Object.entries(byEntity).map(([entity, stats]) => ({
          entity,
          avg_duration_ms: Math.round(stats.totalDuration / stats.count),
          total_records: stats.totalRecords,
          avg_api_response_ms: Math.round(stats.totalApiTime / stats.count),
          throughput_per_min: stats.totalDuration > 0 ? Math.round((stats.totalRecords / stats.totalDuration) * 60000) : 0,
          error_rate: stats.count > 0 ? Math.round((stats.errors / stats.count) * 100) : 0,
          runs: stats.count,
        })).sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);

        return jsonResponse({ success: true, data: data || [], summary });
      }

      // ======== CONFIGURATION ========
      case 'get_config': {
        const { data, error } = await supabaseAdmin
          .from('sync_entity_config')
          .select('*')
          .order('dependency_order');
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'update_config': {
        if (!params.config_id) return jsonResponse({ error: 'config_id required' }, 400);
        const allowedFields = ['batch_size', 'sync_priority', 'retry_policy', 'is_enabled', 'schedule_cron', 'conflict_resolution'];
        const updates: Record<string, any> = {};
        for (const field of allowedFields) {
          if (params[field] !== undefined) updates[field] = params[field];
        }
        updates.updated_at = new Date().toISOString();

        const { error } = await supabaseAdmin
          .from('sync_entity_config')
          .update(updates)
          .eq('id', params.config_id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // ======== WATERMARKS ========
      case 'get_watermarks': {
        let q = supabaseAdmin
          .from('sync_watermarks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (companyId) q = q.eq('company_id', companyId);
        if (params.entity_name) q = q.eq('entity_name', params.entity_name);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'reset_watermark': {
        if (!isAdmin) return jsonResponse({ error: 'Admin role required to reset watermarks' }, 403);
        if (!params.entity_name) return jsonResponse({ error: 'entity_name required' }, 400);
        if (params.confirmation_token !== 'CONFIRM_RESET') {
          return jsonResponse({ error: 'Pass confirmation_token: "CONFIRM_RESET" to proceed' }, 400);
        }

        // Delete watermarks for this entity
        let q = supabaseAdmin.from('sync_watermarks').delete().eq('entity_name', params.entity_name);
        if (companyId) q = q.eq('company_id', companyId);
        const { error } = await q;
        if (error) throw error;

        // Log the action
        await supabaseAdmin.from('sync_jobs').insert({
          job_number: `RESET-${Date.now()}`,
          entity_name: params.entity_name,
          company_id: companyId,
          direction: 'from_sap',
          job_type: 'watermark_reset',
          status: 'completed',
          triggered_by: userId,
          triggered_by_name: profile?.full_name || user.email,
          trigger_type: 'manual',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        return jsonResponse({ success: true, message: `Watermark reset for ${params.entity_name}` });
      }

      // ======== ENTITY CONTROL ========
      case 'pause_entity': {
        if (!params.entity_name) return jsonResponse({ error: 'entity_name required' }, 400);
        const { error } = await supabaseAdmin
          .from('sync_entity_config')
          .update({ is_enabled: false, updated_at: new Date().toISOString() })
          .eq('entity_name', params.entity_name);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'resume_entity': {
        if (!params.entity_name) return jsonResponse({ error: 'entity_name required' }, 400);
        const { error } = await supabaseAdmin
          .from('sync_entity_config')
          .update({ is_enabled: true, updated_at: new Date().toISOString() })
          .eq('entity_name', params.entity_name);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // ======== DASHBOARD STATS ========
      case 'get_dashboard_stats': {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const [runningRes, pendingRes, failedRes, todayJobsRes, lastSyncsRes, topErrorsRes] = await Promise.all([
          (() => {
            let q = supabaseAdmin.from('sync_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running');
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
          (() => {
            let q = supabaseAdmin.from('sync_record_tracker').select('id', { count: 'exact', head: true }).eq('sync_status', 'pending');
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
          (() => {
            let q = supabaseAdmin.from('sync_record_tracker').select('id', { count: 'exact', head: true }).eq('sync_status', 'failed');
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
          (() => {
            let q = supabaseAdmin.from('sync_jobs').select('records_fetched, records_inserted, records_updated, records_failed, duration_ms, entity_name').gte('created_at', today);
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
          (() => {
            let q = supabaseAdmin.from('sync_jobs').select('entity_name, completed_at, status, records_fetched, records_inserted, records_updated, records_failed, duration_ms').eq('status', 'completed').order('completed_at', { ascending: false }).limit(50);
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
          (() => {
            let q = supabaseAdmin.from('sync_record_tracker').select('error_category, entity_type').eq('sync_status', 'failed').limit(500);
            if (companyId) q = q.eq('company_id', companyId);
            return q;
          })(),
        ]);

        // Today's stats
        const todayJobs = todayJobsRes.data || [];
        const todayProcessed = todayJobs.reduce((s: number, j: any) => s + (j.records_inserted || 0) + (j.records_updated || 0), 0);
        const todayFailed = todayJobs.reduce((s: number, j: any) => s + (j.records_failed || 0), 0);
        const avgDuration = todayJobs.length > 0
          ? Math.round(todayJobs.reduce((s: number, j: any) => s + (j.duration_ms || 0), 0) / todayJobs.length)
          : 0;

        // Last sync per entity
        const entityLastSync: Record<string, any> = {};
        (lastSyncsRes.data || []).forEach((s: any) => {
          if (!entityLastSync[s.entity_name]) entityLastSync[s.entity_name] = s;
        });

        // Top error reasons
        const errorCounts: Record<string, number> = {};
        (topErrorsRes.data || []).forEach((r: any) => {
          const key = r.error_category || 'unknown';
          errorCounts[key] = (errorCounts[key] || 0) + 1;
        });
        const topErrors = Object.entries(errorCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        return jsonResponse({
          success: true,
          data: {
            runningCount: runningRes.count || 0,
            pendingCount: pendingRes.count || 0,
            failedCount: failedRes.count || 0,
            todayProcessed,
            todayFailed,
            avgDurationMs: avgDuration,
            todayJobCount: todayJobs.length,
            entityLastSync,
            topErrors,
          },
        });
      }

      // ======== EXPORT ========
      case 'export_failed': {
        let q = supabaseAdmin
          .from('sync_record_tracker')
          .select('*')
          .eq('sync_status', 'failed')
          .order('updated_at', { ascending: false })
          .limit(5000);
        if (companyId) q = q.eq('company_id', companyId);
        if (params.entity_type) q = q.eq('entity_type', params.entity_type);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ success: true, data, count: data?.length || 0 });
      }

      // ======== MANUAL SYNC TRIGGERS ========
      case 'trigger_sync': {
        // This creates a job record and invokes the sap-sync function
        const jobNumber = `JOB-${Date.now()}`;
        const { data: job, error: jobError } = await supabaseAdmin
          .from('sync_jobs')
          .insert({
            job_number: jobNumber,
            entity_name: params.entity_name || 'all',
            company_id: companyId,
            direction: params.direction || 'from_sap',
            job_type: params.job_type || 'incremental',
            status: 'queued',
            triggered_by: userId,
            triggered_by_name: profile?.full_name || user.email,
            trigger_type: 'manual',
            filters: {
              dateFrom: params.date_from,
              dateTo: params.date_to,
              entityId: params.entity_id,
              deltaSync: params.delta_sync !== false,
            },
          })
          .select()
          .single();

        if (jobError) throw jobError;

        return jsonResponse({ success: true, job });
      }

      case 'cancel_job': {
        if (!params.job_id) return jsonResponse({ error: 'job_id required' }, 400);
        const { error } = await supabaseAdmin
          .from('sync_jobs')
          .update({ status: 'cancelled', completed_at: new Date().toISOString() })
          .eq('id', params.job_id)
          .in('status', ['queued', 'running']);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // ======== QUEUE VIEW ========
      case 'get_queue': {
        let q = supabaseAdmin
          .from('sync_record_tracker')
          .select('entity_type, sync_status')
          .in('sync_status', ['pending', 'processing']);
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (error) throw error;

        // Group by entity
        const groups: Record<string, { pending: number; processing: number }> = {};
        (data || []).forEach((r: any) => {
          if (!groups[r.entity_type]) groups[r.entity_type] = { pending: 0, processing: 0 };
          groups[r.entity_type][r.sync_status as 'pending' | 'processing']++;
        });

        return jsonResponse({
          success: true,
          data: Object.entries(groups).map(([entity, counts]) => ({
            entity,
            ...counts,
            total: counts.pending + counts.processing,
          })).sort((a, b) => b.total - a.total),
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Sync Admin Error:', error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
