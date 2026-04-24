import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* =====================================================
   BANK ACCOUNT HIERARCHY
===================================================== */
export function useTreasBankAccounts() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-bank-accounts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_bank_accounts')
        .select('*')
        .order('account_code');
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await (supabase as any).from('treas_bank_accounts').update(row).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_bank_accounts').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-bank-accounts'] });
      toast.success('Bank account saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('treas_bank_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-bank-accounts'] });
      toast.success('Bank account removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...list, upsert, remove };
}

/* =====================================================
   BANK ADAPTERS
===================================================== */
export function useTreasBankAdapters() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-bank-adapters'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_bank_adapters')
        .select('*')
        .order('bank_name');
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await (supabase as any).from('treas_bank_adapters').update(row).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_bank_adapters').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-bank-adapters'] });
      toast.success('Adapter saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from('treas_bank_adapters')
        .update({ last_run_at: new Date().toISOString(), last_status: 'success' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-bank-adapters'] });
      toast.success('Adapter run triggered');
    },
  });

  return { ...list, upsert, runNow };
}

/* =====================================================
   RECON RULES ENGINE
===================================================== */
export function useTreasReconRules() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-recon-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_recon_rules')
        .select('*')
        .order('priority');
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await (supabase as any).from('treas_recon_rules').update(row).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_recon_rules').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-recon-rules'] });
      toast.success('Rule saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: any) => {
      const { error } = await (supabase as any).from('treas_recon_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treas-recon-rules'] }),
  });

  return { ...list, upsert, toggle };
}

/* =====================================================
   APPROVAL POLICIES
===================================================== */
export function useTreasApprovalPolicies() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-approval-policies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_approval_policies')
        .select('*')
        .order('amount_min');
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await (supabase as any).from('treas_approval_policies').update(row).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_approval_policies').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-approval-policies'] });
      toast.success('Policy saved');
    },
  });

  return { ...list, upsert };
}

/* =====================================================
   FX EXPOSURE
===================================================== */
export function useTreasFXExposures() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-fx-exposures'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_fx_exposures')
        .select('*')
        .order('as_of_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      // compute sensitivity
      const computed = {
        ...row,
        net_exposure_base: (row.cash_balance || 0) + (row.ar_balance || 0) - (row.ap_balance || 0) - (row.hedged_amount || 0),
        sensitivity_1pct: ((row.cash_balance || 0) + (row.ar_balance || 0) - (row.ap_balance || 0) - (row.hedged_amount || 0)) * 0.01 * (row.spot_rate || 1),
      };
      const abs = Math.abs(computed.net_exposure_base * (row.spot_rate || 1));
      computed.risk_band = abs > 5_000_000 ? 'critical' : abs > 1_000_000 ? 'high' : abs > 250_000 ? 'medium' : 'low';
      const { data, error } = row.id
        ? await (supabase as any).from('treas_fx_exposures').update(computed).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_fx_exposures').insert(computed).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-fx-exposures'] });
      toast.success('FX exposure recorded');
    },
  });

  return { ...list, upsert };
}

/* =====================================================
   FRAUD RULES & ALERTS
===================================================== */
export function useTreasFraudRules() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-fraud-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_fraud_rules')
        .select('*')
        .order('severity', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = row.id
        ? await (supabase as any).from('treas_fraud_rules').update(row).eq('id', row.id).select().single()
        : await (supabase as any).from('treas_fraud_rules').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-fraud-rules'] });
      toast.success('Fraud rule saved');
    },
  });

  return { ...list, upsert };
}

export function useTreasFraudAlerts() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-fraud-alerts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_fraud_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status, notes }: any) => {
      const { error } = await (supabase as any)
        .from('treas_fraud_alerts')
        .update({ status, resolution_notes: notes, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-fraud-alerts'] });
      toast.success('Alert resolved');
    },
  });

  return { ...list, resolve };
}

/* =====================================================
   INTERCOMPANY CASH
===================================================== */
export function useTreasICCash() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['treas-ic-cash'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_ic_cash_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const snapshot = useMutation({
    mutationFn: async () => {
      // simulate snapshot from active companies
      const { data: companies } = await (supabase as any).from('sap_companies').select('id, company_name, base_currency').limit(20);
      const today = new Date().toISOString().slice(0, 10);
      const rows = (companies || []).map((c: any) => ({
        snapshot_date: today,
        company_id: c.id,
        company_name: c.company_name,
        currency: c.base_currency || 'SAR',
        total_cash: Math.round(Math.random() * 5_000_000),
        total_cash_base: Math.round(Math.random() * 5_000_000),
        available_cash: Math.round(Math.random() * 4_500_000),
        restricted_cash: Math.round(Math.random() * 500_000),
        account_count: Math.ceil(Math.random() * 8),
        ic_receivable: Math.round(Math.random() * 1_000_000),
        ic_payable: Math.round(Math.random() * 800_000),
      }));
      if (rows.length === 0) return [];
      const { data, error } = await (supabase as any).from('treas_ic_cash_snapshots').insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treas-ic-cash'] });
      toast.success('Snapshot captured');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...list, snapshot };
}

/* =====================================================
   DAILY CASH POSITION
===================================================== */
export function useTreasDailyCashPosition() {
  const list = useQuery({
    queryKey: ['treas-daily-cash'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('treas_daily_cash_position')
        .select('*, treas_bank_accounts(account_name, currency)')
        .order('position_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });
  return list;
}
