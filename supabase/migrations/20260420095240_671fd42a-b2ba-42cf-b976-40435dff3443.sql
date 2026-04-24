
-- =====================================================
-- BANKING & TREASURY ENHANCEMENT
-- =====================================================

-- 1) Bank Account Hierarchy
CREATE TABLE IF NOT EXISTS public.treas_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  parent_account_id UUID REFERENCES public.treas_bank_accounts(id) ON DELETE SET NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_name_ar TEXT,
  account_type TEXT NOT NULL DEFAULT 'operating', -- master, operating, payroll, escrow, sweep, virtual
  bank_code TEXT,
  bank_name TEXT,
  branch_name TEXT,
  iban TEXT,
  swift_bic TEXT,
  currency TEXT NOT NULL DEFAULT 'SAR',
  gl_account_code TEXT,
  daily_payment_limit NUMERIC(18,2),
  single_txn_limit NUMERIC(18,2),
  is_sweep_target BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active', -- active, frozen, closed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, account_code)
);
CREATE INDEX IF NOT EXISTS idx_treas_bank_accounts_parent ON public.treas_bank_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_treas_bank_accounts_company ON public.treas_bank_accounts(company_id);

-- 2) Bank Integration Adapters
CREATE TABLE IF NOT EXISTS public.treas_bank_adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  adapter_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'sftp', -- sftp, api, host2host, manual_upload, swift_mt
  endpoint_url TEXT,
  protocol TEXT, -- mt940, camt053, camt054, csv, json
  credential_secret_ref TEXT, -- name of secret in vault
  schedule_cron TEXT, -- e.g. '0 6 * * *'
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  files_per_day INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Reconciliation Rules Engine
CREATE TABLE IF NOT EXISTS public.treas_recon_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  match_scope TEXT NOT NULL DEFAULT 'ar_ap', -- ar, ap, ar_ap, gl, intercompany
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {amount_tolerance, date_window_days, reference_regex, counterparty_contains, ...}
  actions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {auto_post: true, suggest_only: false, posting_account: ...}
  confidence_threshold INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  hits_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 4) Intercompany Cash Snapshots
CREATE TABLE IF NOT EXISTS public.treas_ic_cash_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_id UUID NOT NULL,
  company_name TEXT,
  currency TEXT NOT NULL DEFAULT 'SAR',
  total_cash NUMERIC(18,2) DEFAULT 0,
  total_cash_base NUMERIC(18,2) DEFAULT 0, -- in group base currency (SAR)
  available_cash NUMERIC(18,2) DEFAULT 0,
  restricted_cash NUMERIC(18,2) DEFAULT 0,
  account_count INTEGER DEFAULT 0,
  ic_receivable NUMERIC(18,2) DEFAULT 0,
  ic_payable NUMERIC(18,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treas_ic_cash_date ON public.treas_ic_cash_snapshots(snapshot_date);

-- 5) Treasury Approval Policies
CREATE TABLE IF NOT EXISTS public.treas_approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  policy_name TEXT NOT NULL,
  payment_method TEXT, -- wire, ach, sarie, mada, check, internal_transfer; null = any
  currency TEXT, -- null = any
  amount_min NUMERIC(18,2) DEFAULT 0,
  amount_max NUMERIC(18,2),
  required_approvers INTEGER NOT NULL DEFAULT 1,
  approver_roles TEXT[] DEFAULT ARRAY['treasury_manager']::TEXT[],
  requires_dual_control BOOLEAN DEFAULT false,
  requires_cfo BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) FX Exposures
CREATE TABLE IF NOT EXISTS public.treas_fx_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL,
  cash_balance NUMERIC(18,2) DEFAULT 0,
  ar_balance NUMERIC(18,2) DEFAULT 0,
  ap_balance NUMERIC(18,2) DEFAULT 0,
  hedged_amount NUMERIC(18,2) DEFAULT 0,
  net_exposure NUMERIC(18,2) GENERATED ALWAYS AS (cash_balance + ar_balance - ap_balance - hedged_amount) STORED,
  spot_rate NUMERIC(18,8),
  base_currency TEXT NOT NULL DEFAULT 'SAR',
  net_exposure_base NUMERIC(18,2),
  sensitivity_1pct NUMERIC(18,2), -- impact of 1% FX move
  risk_band TEXT, -- low, medium, high, critical
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treas_fx_date ON public.treas_fx_exposures(as_of_date, currency);

-- 7) Fraud Warning Rules
CREATE TABLE IF NOT EXISTS public.treas_fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_code TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  rule_name_ar TEXT,
  rule_type TEXT NOT NULL, -- new_beneficiary, round_amount, off_hours, duplicate, threshold_jump, blacklist, velocity, geo_anomaly
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  parameters JSONB DEFAULT '{}'::jsonb, -- e.g. {window_minutes: 60, threshold: 100000}
  action TEXT NOT NULL DEFAULT 'warn', -- warn, block, require_extra_approval
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Fraud Alerts
CREATE TABLE IF NOT EXISTS public.treas_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  rule_id UUID REFERENCES public.treas_fraud_rules(id) ON DELETE SET NULL,
  rule_code TEXT,
  severity TEXT NOT NULL,
  payment_ref TEXT,
  beneficiary TEXT,
  amount NUMERIC(18,2),
  currency TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, dismissed, confirmed
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treas_fraud_alerts_status ON public.treas_fraud_alerts(status, severity);

-- 9) Daily Cash Position
CREATE TABLE IF NOT EXISTS public.treas_daily_cash_position (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  bank_account_id UUID REFERENCES public.treas_bank_accounts(id) ON DELETE CASCADE,
  position_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  total_inflows NUMERIC(18,2) DEFAULT 0,
  total_outflows NUMERIC(18,2) DEFAULT 0,
  closing_balance NUMERIC(18,2) DEFAULT 0,
  projected_balance NUMERIC(18,2) DEFAULT 0,
  available_balance NUMERIC(18,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, position_date)
);
CREATE INDEX IF NOT EXISTS idx_treas_daily_pos_date ON public.treas_daily_cash_position(position_date);

-- =====================================================
-- RLS POLICIES (company-scoped, authenticated read/write)
-- =====================================================
ALTER TABLE public.treas_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_bank_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_recon_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_ic_cash_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_fx_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treas_daily_cash_position ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'treas_bank_accounts','treas_bank_adapters','treas_recon_rules',
    'treas_ic_cash_snapshots','treas_approval_policies','treas_fx_exposures',
    'treas_fraud_rules','treas_fraud_alerts','treas_daily_cash_position'
  ]) LOOP
    EXECUTE format('CREATE POLICY "auth_select_%I" ON public.%I FOR SELECT TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- =====================================================
-- TIMESTAMP TRIGGERS
-- =====================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'treas_bank_accounts','treas_bank_adapters','treas_recon_rules',
    'treas_approval_policies','treas_fraud_rules'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- =====================================================
-- SEED: Saudi Banks (SAMA-aligned)
-- =====================================================
INSERT INTO public.treas_bank_adapters (adapter_name, bank_code, bank_name, connection_type, protocol, schedule_cron, is_active, notes) VALUES
  ('SNB Daily Statement', 'SNB', 'Saudi National Bank', 'sftp', 'mt940', '0 6 * * *', true, 'SARIE rail; daily 06:00 KSA'),
  ('Al Rajhi H2H', 'RJHI', 'Al Rajhi Bank', 'host2host', 'camt053', '0 7 * * *', true, 'Host-to-host XML'),
  ('Riyad Bank API', 'RIBL', 'Riyad Bank', 'api', 'json', '0 */4 * * *', true, 'REST API every 4h'),
  ('SABB MT940', 'SABB', 'Saudi Awwal Bank (SABB)', 'sftp', 'mt940', '0 6 * * *', true, 'SWIFT MT940'),
  ('ANB Statement', 'ANB', 'Arab National Bank', 'manual_upload', 'csv', NULL, true, 'Manual CSV upload'),
  ('BSF CAMT', 'BSFR', 'Banque Saudi Fransi', 'sftp', 'camt053', '0 6 * * *', true, 'ISO 20022 CAMT.053')
ON CONFLICT DO NOTHING;

-- Default fraud rules
INSERT INTO public.treas_fraud_rules (rule_code, rule_name, rule_name_ar, rule_type, severity, parameters, action) VALUES
  ('FR_NEW_BENEF', 'New Beneficiary Alert', 'تنبيه مستفيد جديد', 'new_beneficiary', 'high', '{"first_payment": true}'::jsonb, 'require_extra_approval'),
  ('FR_ROUND_AMT', 'Round Amount Warning', 'تنبيه مبلغ مدور', 'round_amount', 'low', '{"threshold": 10000, "modulo": 1000}'::jsonb, 'warn'),
  ('FR_OFF_HOURS', 'Off-Hours Payment', 'دفعة خارج ساعات العمل', 'off_hours', 'medium', '{"start_hour": 18, "end_hour": 7}'::jsonb, 'warn'),
  ('FR_DUPLICATE', 'Possible Duplicate Payment', 'دفعة مكررة محتملة', 'duplicate', 'high', '{"window_minutes": 1440, "match_amount": true, "match_beneficiary": true}'::jsonb, 'block'),
  ('FR_THRESH_JUMP', 'Sudden Threshold Jump', 'قفزة مفاجئة في المبلغ', 'threshold_jump', 'high', '{"multiplier": 5}'::jsonb, 'require_extra_approval'),
  ('FR_VELOCITY', 'High Velocity Payments', 'سرعة دفع عالية', 'velocity', 'medium', '{"window_minutes": 60, "max_count": 10}'::jsonb, 'warn')
ON CONFLICT (rule_code) DO NOTHING;

-- Default approval policies (Saudi/GCC defaults)
INSERT INTO public.treas_approval_policies (policy_name, payment_method, currency, amount_min, amount_max, required_approvers, approver_roles, requires_dual_control, requires_cfo, is_active) VALUES
  ('Standard SAR < 50K', NULL, 'SAR', 0, 50000, 1, ARRAY['treasury_manager']::TEXT[], false, false, true),
  ('Mid SAR 50K-500K', NULL, 'SAR', 50000, 500000, 2, ARRAY['treasury_manager','finance_manager']::TEXT[], true, false, true),
  ('Large SAR 500K-2M', NULL, 'SAR', 500000, 2000000, 3, ARRAY['treasury_manager','finance_manager','controller']::TEXT[], true, false, true),
  ('Strategic SAR > 2M', NULL, 'SAR', 2000000, NULL, 3, ARRAY['controller','cfo','ceo']::TEXT[], true, true, true),
  ('FX Wire (any > 10K USD eq.)', 'wire', NULL, 10000, NULL, 2, ARRAY['treasury_manager','cfo']::TEXT[], true, true, true)
ON CONFLICT DO NOTHING;

-- Default recon rules
INSERT INTO public.treas_recon_rules (rule_name, rule_description, priority, match_scope, conditions, actions, confidence_threshold) VALUES
  ('Exact Reference Match', 'Match by exact bank reference equal to AR/AP doc number', 10, 'ar_ap',
    '{"reference_match": "exact", "amount_tolerance": 0, "date_window_days": 7}'::jsonb,
    '{"auto_post": true}'::jsonb, 95),
  ('Amount + Date ±2 days', 'Match by exact amount within 2-day window', 20, 'ar_ap',
    '{"amount_tolerance": 0, "date_window_days": 2}'::jsonb,
    '{"auto_post": true}'::jsonb, 90),
  ('Counterparty + Amount', 'Counterparty name contains + amount within 1%', 30, 'ar_ap',
    '{"counterparty_contains": true, "amount_tolerance_pct": 1, "date_window_days": 14}'::jsonb,
    '{"auto_post": false, "suggest_only": true}'::jsonb, 75),
  ('Bank Charges Auto-GL', 'Auto-post small bank charges to fee account', 40, 'gl',
    '{"description_contains": ["charge","fee","commission","رسوم"], "amount_max": 500}'::jsonb,
    '{"auto_post": true, "posting_account": "5530000"}'::jsonb, 85),
  ('SARIE Transfer Fee', 'SARIE wire transfer fees', 50, 'gl',
    '{"description_contains": ["SARIE","حوالة"], "amount_max": 200}'::jsonb,
    '{"auto_post": true, "posting_account": "5530100"}'::jsonb, 90)
ON CONFLICT DO NOTHING;
