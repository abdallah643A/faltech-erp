import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const u = supabase as any;

export function useCashPositions() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-cash-positions', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_cash_positions').select('*').order('snapshot_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCashPosition() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await u.from('bank_cash_positions')
        .upsert({ ...payload, company_id: activeCompanyId }, { onConflict: 'company_id,snapshot_date,bank_account_id' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-cash-positions'] });
      toast({ title: 'Cash position saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });
}

export function useForecastScenarios() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-forecast-scenarios', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_forecast_scenarios').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useForecastLines(scenarioId?: string) {
  return useQuery({
    queryKey: ['bank-forecast-lines', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await u.from('bank_forecast_lines')
        .select('*').eq('scenario_id', scenarioId).order('period_start');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await u.from('bank_forecast_scenarios')
        .insert({ ...payload, company_id: activeCompanyId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-forecast-scenarios'] });
      toast({ title: 'Scenario created' });
    },
    onError: (e: any) => toast({ title: 'Create failed', description: e.message, variant: 'destructive' }),
  });
}

export function useLockScenario() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await u.from('bank_forecast_scenarios')
        .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: user?.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-forecast-scenarios'] });
      toast({ title: 'Scenario locked' });
    },
  });
}

export function usePaymentOptimizationRuns() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-pay-opt-runs', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_payment_optimization_runs').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePaymentRecommendations(runId?: string) {
  return useQuery({
    queryKey: ['bank-pay-recs', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await u.from('bank_payment_recommendations')
        .select('*').eq('run_id', runId).order('priority_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateOptimizationRun() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: { available_cash: number; horizon_days?: number; strategy?: string }) => {
      // Fetch open AP invoices
      const { data: invoices, error: invErr } = await u.from('ap_invoices')
        .select('id, vendor_name, invoice_number, total, doc_due_date, status')
        .neq('status', 'paid').neq('status', 'cancelled').limit(500);
      if (invErr) throw invErr;

      const horizon = payload.horizon_days ?? 30;
      const today = new Date();
      const cutoff = new Date(today.getTime() + horizon * 86400000);

      const candidates = (invoices ?? []).filter((i: any) => {
        if (!i.doc_due_date) return true;
        return new Date(i.doc_due_date) <= cutoff;
      });

      // Score: closer due date = higher priority
      const scored = candidates.map((inv: any) => {
        const dueDate = inv.doc_due_date ? new Date(inv.doc_due_date) : cutoff;
        const daysToDue = Math.max(0, Math.floor((dueDate.getTime() - today.getTime()) / 86400000));
        const lateFeeRisk = daysToDue < 0 ? Math.abs(daysToDue) * (inv.total || 0) * 0.001 : 0;
        const priorityScore = Math.max(0, 100 - daysToDue * 2) + (lateFeeRisk > 0 ? 20 : 0);
        return {
          ap_invoice_id: inv.id,
          vendor_name: inv.vendor_name,
          invoice_number: inv.invoice_number,
          invoice_amount: inv.total || 0,
          recommended_amount: inv.total || 0,
          recommended_date: inv.doc_due_date,
          due_date: inv.doc_due_date,
          late_fee_risk: lateFeeRisk,
          priority_score: priorityScore,
          reason: daysToDue <= 7 ? 'Due soon' : daysToDue <= 14 ? 'Within 2 weeks' : 'Within horizon',
        };
      }).sort((a: any, b: any) => b.priority_score - a.priority_score);

      // Apply available cash constraint
      let remaining = payload.available_cash;
      const selected = scored.map((s: any) => {
        if (remaining >= s.recommended_amount) {
          remaining -= s.recommended_amount;
          return { ...s, is_selected: true };
        }
        return { ...s, is_selected: false, recommended_amount: 0 };
      });

      const totalPayable = scored.reduce((sum: number, s: any) => sum + s.invoice_amount, 0);
      const totalRecommended = selected.filter((s: any) => s.is_selected).reduce((sum: number, s: any) => sum + s.recommended_amount, 0);

      // Create run
      const { data: run, error: runErr } = await u.from('bank_payment_optimization_runs').insert({
        company_id: activeCompanyId,
        available_cash: payload.available_cash,
        optimization_horizon_days: horizon,
        total_payable: totalPayable,
        total_recommended: totalRecommended,
        strategy: payload.strategy ?? 'balanced',
      }).select().single();
      if (runErr) throw runErr;

      // Insert recommendations
      if (selected.length > 0) {
        const recs = selected.map((s: any) => ({ ...s, run_id: run.id }));
        const { error: recErr } = await u.from('bank_payment_recommendations').insert(recs);
        if (recErr) throw recErr;
      }

      return run;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-pay-opt-runs'] });
      toast({ title: 'Optimization run created' });
    },
    onError: (e: any) => toast({ title: 'Run failed', description: e.message, variant: 'destructive' }),
  });
}

export function usePaymentApprovals() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-payment-approvals', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_payment_approvals').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await u.from('bank_payment_approvals').update({
        status, approval_notes: notes, approver_id: user?.id, decided_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-payment-approvals'] });
      toast({ title: 'Decision recorded' });
    },
  });
}
