-- =========================================================
-- CPMS Contractor Suite Enhancement
-- Subcontracts, VOs, IPCs, Retention, CTC, Delays, Productivity, Transmittals, Tower
-- =========================================================

-- ---------- Subcontracts ----------
CREATE TABLE IF NOT EXISTS public.cpms_subcontracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  subcontract_no text NOT NULL,
  subcontract_no_ar text,
  subcontractor_id uuid,
  subcontractor_name text NOT NULL,
  subcontractor_name_ar text,
  trade text,
  scope_summary text,
  scope_summary_ar text,
  award_date date,
  start_date date,
  end_date date,
  contract_value numeric(18,2) NOT NULL DEFAULT 0,
  approved_vo_value numeric(18,2) NOT NULL DEFAULT 0,
  revised_value numeric(18,2) GENERATED ALWAYS AS (contract_value + approved_vo_value) STORED,
  retention_pct numeric(6,3) NOT NULL DEFAULT 10,
  advance_pct numeric(6,3) NOT NULL DEFAULT 0,
  advance_recovered numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  fidic_clause text,
  payment_terms text,
  status text NOT NULL DEFAULT 'draft', -- draft, active, suspended, closed, terminated
  performance_score numeric(5,2),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, subcontract_no)
);
CREATE INDEX IF NOT EXISTS idx_subc_project ON public.cpms_subcontracts(project_id);
CREATE INDEX IF NOT EXISTS idx_subc_status  ON public.cpms_subcontracts(status);

-- ---------- Subcontract IPC (Interim Payment Certs to Subs) ----------
CREATE TABLE IF NOT EXISTS public.cpms_subcontract_ipc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  subcontract_id uuid NOT NULL REFERENCES public.cpms_subcontracts(id) ON DELETE CASCADE,
  ipc_no integer NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  cumulative_work_done numeric(18,2) NOT NULL DEFAULT 0,
  previous_certified numeric(18,2) NOT NULL DEFAULT 0,
  this_period numeric(18,2) GENERATED ALWAYS AS (cumulative_work_done - previous_certified) STORED,
  retention_amount numeric(18,2) NOT NULL DEFAULT 0,
  advance_recovery numeric(18,2) NOT NULL DEFAULT 0,
  vat_amount numeric(18,2) NOT NULL DEFAULT 0,
  net_payable numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, approved, paid, rejected
  approved_at timestamptz,
  approved_by uuid,
  paid_at timestamptz,
  ap_invoice_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subcontract_id, ipc_no)
);
CREATE INDEX IF NOT EXISTS idx_subipc_proj ON public.cpms_subcontract_ipc(project_id);

-- ---------- Variation Orders ----------
CREATE TABLE IF NOT EXISTS public.cpms_variation_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  subcontract_id uuid REFERENCES public.cpms_subcontracts(id) ON DELETE SET NULL,
  vo_no text NOT NULL,
  vo_date date NOT NULL DEFAULT CURRENT_DATE,
  party text NOT NULL DEFAULT 'client', -- client | subcontractor
  fidic_clause text DEFAULT '13.3',
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  cost_impact numeric(18,2) NOT NULL DEFAULT 0,
  time_impact_days integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected, withdrawn
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  rejection_reason text,
  attachments_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vo_no)
);
CREATE INDEX IF NOT EXISTS idx_vo_proj   ON public.cpms_variation_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_vo_status ON public.cpms_variation_orders(status);

-- ---------- Client IPC / Progress Billing ----------
CREATE TABLE IF NOT EXISTS public.cpms_client_ipc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  ipc_no integer NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  contract_value numeric(18,2) NOT NULL DEFAULT 0,
  approved_vo_value numeric(18,2) NOT NULL DEFAULT 0,
  cumulative_work_done numeric(18,2) NOT NULL DEFAULT 0,
  previous_certified numeric(18,2) NOT NULL DEFAULT 0,
  this_period numeric(18,2) GENERATED ALWAYS AS (cumulative_work_done - previous_certified) STORED,
  materials_on_site numeric(18,2) NOT NULL DEFAULT 0,
  retention_pct numeric(6,3) NOT NULL DEFAULT 10,
  retention_amount numeric(18,2) NOT NULL DEFAULT 0,
  advance_recovery numeric(18,2) NOT NULL DEFAULT 0,
  vat_amount numeric(18,2) NOT NULL DEFAULT 0,
  net_certified numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, certified, invoiced, collected, rejected
  submitted_at timestamptz,
  certified_at timestamptz,
  certified_by uuid,
  ar_invoice_id uuid,
  collected_at timestamptz,
  notes text,
  notes_ar text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, ipc_no)
);
CREATE INDEX IF NOT EXISTS idx_cipc_proj ON public.cpms_client_ipc(project_id);

-- ---------- Retention Ledger ----------
CREATE TABLE IF NOT EXISTS public.cpms_retention_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  party text NOT NULL DEFAULT 'client', -- client | subcontractor
  subcontract_id uuid REFERENCES public.cpms_subcontracts(id) ON DELETE SET NULL,
  ipc_id uuid,
  movement_type text NOT NULL, -- withhold | release_first_half | release_second_half | adjustment
  amount numeric(18,2) NOT NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ret_project ON public.cpms_retention_ledger(project_id);

-- ---------- Cost-to-Complete Snapshots ----------
CREATE TABLE IF NOT EXISTS public.cpms_ctc_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  bac numeric(18,2) NOT NULL DEFAULT 0,           -- Budget at Completion
  pv  numeric(18,2) NOT NULL DEFAULT 0,           -- Planned Value
  ev  numeric(18,2) NOT NULL DEFAULT 0,           -- Earned Value
  ac  numeric(18,2) NOT NULL DEFAULT 0,           -- Actual Cost
  committed numeric(18,2) NOT NULL DEFAULT 0,
  etc numeric(18,2) NOT NULL DEFAULT 0,           -- Estimate to Complete
  eac numeric(18,2) NOT NULL DEFAULT 0,           -- Estimate at Completion
  vac numeric(18,2) GENERATED ALWAYS AS (bac - eac) STORED,
  cpi numeric(8,4),
  spi numeric(8,4),
  forecast_margin_pct numeric(8,4),
  health text,                                    -- green | amber | red
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, snapshot_date)
);

-- ---------- Delay Events / EOT Register ----------
CREATE TABLE IF NOT EXISTS public.cpms_delay_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  event_no text NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  cause_category text NOT NULL, -- weather, client_change, design, supplier, force_majeure, other
  description text,
  description_ar text,
  impact_days integer NOT NULL DEFAULT 0,
  recoverable boolean NOT NULL DEFAULT false,
  fidic_clause text DEFAULT '8.5',
  eot_claimed_days integer NOT NULL DEFAULT 0,
  eot_granted_days integer NOT NULL DEFAULT 0,
  cost_impact numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open', -- open, notified, claimed, awarded, rejected, closed
  notified_at timestamptz,
  resolved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, event_no)
);
CREATE INDEX IF NOT EXISTS idx_delay_proj ON public.cpms_delay_events(project_id);

-- ---------- Productivity Ledger ----------
CREATE TABLE IF NOT EXISTS public.cpms_productivity_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  resource_type text NOT NULL, -- labor | equipment | crew
  resource_code text,
  resource_name text,
  trade text,
  cost_code text,
  output_qty numeric(18,3) NOT NULL DEFAULT 0,
  uom text,
  manhours numeric(18,3) NOT NULL DEFAULT 0,
  equipment_hours numeric(18,3) NOT NULL DEFAULT 0,
  budget_rate numeric(18,4),                       -- hours per UOM (target)
  actual_rate numeric(18,4) GENERATED ALWAYS AS (
    CASE WHEN output_qty > 0 THEN (manhours + equipment_hours) / output_qty ELSE NULL END
  ) STORED,
  productivity_factor numeric(8,4),                -- budget_rate / actual_rate
  weather text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_proj_date ON public.cpms_productivity_ledger(project_id, log_date);

-- ---------- Document Transmittals ----------
CREATE TABLE IF NOT EXISTS public.cpms_doc_transmittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  transmittal_no text NOT NULL,
  direction text NOT NULL, -- outgoing | incoming
  party text NOT NULL,     -- client | consultant | subcontractor | supplier | other
  party_name text NOT NULL,
  subject text NOT NULL,
  subject_ar text,
  doc_count integer NOT NULL DEFAULT 0,
  sent_date date,
  received_date date,
  due_date date,
  response_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, acknowledged, responded, closed, overdue
  ecm_folder_path text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, transmittal_no)
);
CREATE INDEX IF NOT EXISTS idx_trans_proj ON public.cpms_doc_transmittals(project_id);

-- ---------- Control Tower Snapshots (fast reads) ----------
CREATE TABLE IF NOT EXISTS public.cpms_control_tower_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  schedule_pct numeric(6,3),
  cost_pct numeric(6,3),
  cpi numeric(8,4),
  spi numeric(8,4),
  open_ncrs integer NOT NULL DEFAULT 0,
  open_rfis integer NOT NULL DEFAULT 0,
  open_vos integer NOT NULL DEFAULT 0,
  open_delays integer NOT NULL DEFAULT 0,
  hse_incidents integer NOT NULL DEFAULT 0,
  retention_held numeric(18,2) NOT NULL DEFAULT 0,
  cash_in numeric(18,2) NOT NULL DEFAULT 0,
  cash_out numeric(18,2) NOT NULL DEFAULT 0,
  health text NOT NULL DEFAULT 'green',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, snapshot_date)
);

-- ---------- updated_at triggers (reuse public.update_updated_at_column) ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column' AND pronamespace='public'::regnamespace) THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'cpms_subcontracts','cpms_subcontract_ipc','cpms_variation_orders','cpms_client_ipc',
    'cpms_delay_events','cpms_doc_transmittals'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_uat ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_uat BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ---------- RLS ----------
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'cpms_subcontracts','cpms_subcontract_ipc','cpms_variation_orders','cpms_client_ipc',
    'cpms_retention_ledger','cpms_ctc_snapshots','cpms_delay_events',
    'cpms_productivity_ledger','cpms_doc_transmittals','cpms_control_tower_snapshots'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t || '_write', t);
  END LOOP;
END $$;