import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectHealth {
  id?: string;
  project_id: string;
  snapshot_date: string;
  schedule_variance_pct: number;
  budget_variance_pct: number;
  quality_score: number;
  risk_level: string;
  risk_count: number;
  defect_count: number;
  open_ncrs: number;
  open_rfis: number;
  spi: number | null;
  cpi: number | null;
  overall_health: string;
  notes?: string;
}

export function useCPMSHealth(projectId?: string) {
  const [healthData, setHealthData] = useState<ProjectHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHealth = async () => {
    setLoading(true);
    try {
      let q = supabase.from('cpms_project_health' as any).select('*').order('snapshot_date', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      setHealthData((data || []) as any[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const computeHealthForProject = async (projId: string) => {
    try {
      // Fetch all related data in parallel
      const [evmRes, defectsRes, ncrsRes, rfisRes, budgetRes, actualRes] = await Promise.all([
        supabase.from('cpms_evm_snapshots' as any).select('*').eq('project_id', projId).order('snapshot_date', { ascending: false }).limit(1),
        supabase.from('cpms_defects' as any).select('id, status, severity').eq('project_id', projId),
        supabase.from('cpms_ncrs' as any).select('id, status').eq('project_id', projId),
        supabase.from('cpms_rfis' as any).select('id, status').eq('project_id', projId),
        supabase.from('cpms_budgets' as any).select('total_amount').eq('project_id', projId).limit(1),
        supabase.from('cpms_actual_costs' as any).select('amount').eq('project_id', projId),
      ]);

      const evm = (evmRes.data?.[0] || {}) as any;
      const defects = (defectsRes.data || []) as any[];
      const ncrs = (ncrsRes.data || []) as any[];
      const rfis = (rfisRes.data || []) as any[];
      const budgetTotal = (budgetRes.data?.[0] as any)?.total_amount || 0;
      const actualTotal = ((actualRes.data || []) as any[]).reduce((s: number, a: any) => s + (a.amount || 0), 0);

      const spi = evm.spi ?? (evm.bcwp && evm.bcws ? evm.bcwp / evm.bcws : null);
      const cpi = evm.cpi ?? (evm.bcwp && evm.acwp ? evm.bcwp / evm.acwp : null);
      const scheduleVar = spi ? Math.round((spi - 1) * 100) : 0;
      const budgetVar = budgetTotal > 0 ? Math.round(((budgetTotal - actualTotal) / budgetTotal) * 100) : 0;

      const openDefects = defects.filter(d => !['resolved', 'verified', 'closed'].includes(d.status)).length;
      const criticalDefects = defects.filter(d => d.severity === 'critical' && !['resolved', 'verified', 'closed'].includes(d.status)).length;
      const openNcrs = ncrs.filter(n => !['closed', 'verified'].includes(n.status)).length;
      const openRfis = rfis.filter(r => r.status === 'open').length;

      // Quality score: 100 - penalties
      const qualityScore = Math.max(0, Math.min(100, 100 - (criticalDefects * 15) - (openDefects * 5) - (openNcrs * 10)));

      // Risk level
      const riskCount = criticalDefects + openNcrs + (Math.abs(scheduleVar) > 10 ? 1 : 0) + (Math.abs(budgetVar) > 10 ? 1 : 0);
      const riskLevel = riskCount >= 4 ? 'critical' : riskCount >= 3 ? 'high' : riskCount >= 1 ? 'medium' : 'low';

      const overallHealth = (Math.abs(scheduleVar) > 15 || Math.abs(budgetVar) > 15 || qualityScore < 60) ? 'red'
        : (Math.abs(scheduleVar) > 10 || Math.abs(budgetVar) > 10 || qualityScore < 80) ? 'yellow' : 'green';

      const healthRecord = {
        project_id: projId,
        snapshot_date: new Date().toISOString().split('T')[0],
        schedule_variance_pct: scheduleVar,
        budget_variance_pct: budgetVar,
        quality_score: qualityScore,
        risk_level: riskLevel,
        risk_count: riskCount,
        defect_count: openDefects,
        open_ncrs: openNcrs,
        open_rfis: openRfis,
        spi: spi ? parseFloat(spi.toFixed(2)) : null,
        cpi: cpi ? parseFloat(cpi.toFixed(2)) : null,
        overall_health: overallHealth,
      };

      // Upsert
      await supabase.from('cpms_project_health' as any).upsert(healthRecord as any, { onConflict: 'project_id,snapshot_date' });
      return healthRecord;
    } catch (e: any) {
      console.error('Health compute error:', e);
      return null;
    }
  };

  useEffect(() => { fetchHealth(); }, [projectId]);

  return { healthData, loading, fetchHealth, computeHealthForProject };
}
