import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Prediction {
  id?: string;
  project_id: string;
  prediction_date: string;
  predicted_completion?: string;
  confidence_80_early?: string;
  confidence_80_late?: string;
  confidence_95_early?: string;
  confidence_95_late?: string;
  predicted_final_cost?: number;
  cost_overrun_probability?: number;
  schedule_risk_score?: number;
  burndown_data?: any[];
  trend_data?: any[];
  model_used?: string;
  notes?: string;
}

export function useCPMSPredictive(projectId?: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPredictions = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('cpms_predictions' as any)
        .select('*').eq('project_id', projectId).order('prediction_date', { ascending: false });
      if (error) throw error;
      setPredictions((data || []) as any[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Generate prediction from existing project data
  const generatePrediction = async (projId: string) => {
    try {
      // Fetch project data
      const [projRes, evmRes, costsRes, snapsRes] = await Promise.all([
        supabase.from('cpms_projects').select('*').eq('id', projId).single(),
        supabase.from('cpms_evm_snapshots' as any).select('*').eq('project_id', projId).order('snapshot_date', { ascending: true }),
        supabase.from('cpms_actual_costs' as any).select('amount').eq('project_id', projId),
        supabase.from('cpms_progress_snapshots' as any).select('*').eq('project_id', projId).order('snapshot_date', { ascending: true }),
      ]);

      const project = projRes.data as any;
      if (!project) throw new Error('Project not found');

      const evmHistory = (evmRes.data || []) as any[];
      const actualCosts = ((costsRes.data || []) as any[]).reduce((s: number, a: any) => s + (a.amount || 0), 0);
      const progressHistory = (snapsRes.data || []) as any[];

      // Calculate SPI/CPI trends
      const latestEvm = evmHistory[evmHistory.length - 1];
      const spi = latestEvm?.spi || (latestEvm?.bcwp && latestEvm?.bcws ? latestEvm.bcwp / latestEvm.bcws : 1);
      const cpi = latestEvm?.cpi || (latestEvm?.bcwp && latestEvm?.acwp ? latestEvm.bcwp / latestEvm.acwp : 1);

      const startDate = new Date(project.start_date || project.created_at);
      const endDate = new Date(project.end_date || new Date());
      const totalDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const elapsed = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      // Predict completion using SPI
      const predictedDuration = spi > 0 ? totalDuration / spi : totalDuration * 1.5;
      const predictedCompletion = new Date(startDate.getTime() + predictedDuration * 86400000);

      // Confidence intervals
      const variance = Math.abs(1 - spi) * totalDuration;
      const c80 = variance * 1.28;
      const c95 = variance * 1.96;

      // Cost prediction using CPI
      const budget = project.contract_value || project.revised_contract_value || 0;
      const predictedFinalCost = cpi > 0 ? budget / cpi : budget * 1.3;
      const costOverrunProb = cpi < 1 ? Math.min(95, Math.round((1 - cpi) * 200)) : Math.max(5, Math.round((1 - cpi) * 50 + 15));

      // Schedule risk
      const scheduleRisk = spi < 0.9 ? Math.min(100, Math.round((1 - spi) * 150)) : spi < 1 ? Math.round((1 - spi) * 100) : Math.max(5, 15 - Math.round((spi - 1) * 50));

      // Burndown data
      const burndownData = [];
      const totalWork = 100;
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const pct = i / steps;
        const date = new Date(startDate.getTime() + pct * totalDuration * 86400000);
        const planned = totalWork * (1 - pct);
        const actualProgress = progressHistory.find((p: any) => new Date(p.snapshot_date) <= date);
        const actual = actualProgress ? totalWork * (1 - (actualProgress.progress_pct || 0) / 100) : (pct < elapsed / totalDuration ? totalWork * (1 - pct * spi) : undefined);
        burndownData.push({
          date: date.toISOString().split('T')[0],
          planned: Math.round(planned),
          actual: actual !== undefined ? Math.round(Math.max(0, actual)) : undefined,
        });
      }

      // Trend data from EVM
      const trendData = evmHistory.map((e: any) => ({
        date: e.snapshot_date,
        spi: e.spi || (e.bcwp && e.bcws ? +(e.bcwp / e.bcws).toFixed(2) : null),
        cpi: e.cpi || (e.bcwp && e.acwp ? +(e.bcwp / e.acwp).toFixed(2) : null),
      }));

      const prediction: any = {
        project_id: projId,
        prediction_date: new Date().toISOString().split('T')[0],
        predicted_completion: predictedCompletion.toISOString().split('T')[0],
        confidence_80_early: new Date(predictedCompletion.getTime() - c80 * 86400000).toISOString().split('T')[0],
        confidence_80_late: new Date(predictedCompletion.getTime() + c80 * 86400000).toISOString().split('T')[0],
        confidence_95_early: new Date(predictedCompletion.getTime() - c95 * 86400000).toISOString().split('T')[0],
        confidence_95_late: new Date(predictedCompletion.getTime() + c95 * 86400000).toISOString().split('T')[0],
        predicted_final_cost: Math.round(predictedFinalCost),
        cost_overrun_probability: costOverrunProb,
        schedule_risk_score: scheduleRisk,
        burndown_data: burndownData,
        trend_data: trendData,
        model_used: 'evm_linear_regression',
      };

      const { data, error } = await supabase.from('cpms_predictions' as any).insert(prediction).select().single();
      if (error) throw error;
      toast({ title: 'Prediction generated', description: `Completion: ${prediction.predicted_completion}` });
      await fetchPredictions();
      return data;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  // What-if scenario
  const whatIfScenario = (prediction: Prediction, adjustments: { spiChange?: number; cpiChange?: number }) => {
    if (!prediction.predicted_completion) return null;
    const baseCompletion = new Date(prediction.predicted_completion);
    const baseCost = prediction.predicted_final_cost || 0;

    const spiMod = 1 + (adjustments.spiChange || 0);
    const cpiMod = 1 + (adjustments.cpiChange || 0);

    const now = Date.now();
    const remainingDays = (baseCompletion.getTime() - now) / 86400000;
    const newRemainingDays = spiMod > 0 ? remainingDays / spiMod : remainingDays;
    const newCompletion = new Date(now + newRemainingDays * 86400000);
    const newCost = cpiMod > 0 ? baseCost / cpiMod : baseCost;

    return {
      newCompletion: newCompletion.toISOString().split('T')[0],
      newCost: Math.round(newCost),
      daysDifference: Math.round(newRemainingDays - remainingDays),
      costDifference: Math.round(newCost - baseCost),
    };
  };

  useEffect(() => { fetchPredictions(); }, [projectId]);

  return { predictions, loading, fetchPredictions, generatePrediction, whatIfScenario };
}
