
-- =========================================================
-- Strategic Sourcing Events
-- =========================================================
CREATE TABLE public.proc_sourcing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  event_number text NOT NULL,
  event_name text NOT NULL,
  event_name_ar text,
  sourcing_strategy text NOT NULL DEFAULT 'rfq' CHECK (sourcing_strategy IN ('rfq','rfp','rfi','auction','direct_award','framework')),
  category_id uuid REFERENCES public.procurement_categories(id) ON DELETE SET NULL,
  region_code text,
  baseline_spend numeric(18,2) NOT NULL DEFAULT 0,
  target_savings_pct numeric(6,2) NOT NULL DEFAULT 0,
  achieved_savings numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  award_date date,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','evaluating','awarded','cancelled','closed')),
  awarded_vendor_id uuid,
  awarded_vendor_name text,
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_sourcing_events_company ON public.proc_sourcing_events(company_id);
CREATE INDEX idx_sourcing_events_status ON public.proc_sourcing_events(status);

CREATE TABLE public.proc_sourcing_event_bidders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.proc_sourcing_events(id) ON DELETE CASCADE,
  vendor_id uuid,
  vendor_name text NOT NULL,
  vendor_code text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  technical_score numeric(6,2),
  commercial_score numeric(6,2),
  total_score numeric(6,2),
  bid_amount numeric(18,2),
  bid_currency text DEFAULT 'SAR',
  is_awarded boolean NOT NULL DEFAULT false,
  rank int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sourcing_bidders_event ON public.proc_sourcing_event_bidders(event_id);

-- =========================================================
-- Tolerance Rules
-- =========================================================
CREATE TABLE public.proc_tolerance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  category_id uuid REFERENCES public.procurement_categories(id) ON DELETE SET NULL,
  vendor_id uuid,
  doc_scope text NOT NULL DEFAULT 'all' CHECK (doc_scope IN ('all','grpo','invoice','po')),
  price_variance_pct numeric(6,2) NOT NULL DEFAULT 5,
  qty_variance_pct numeric(6,2) NOT NULL DEFAULT 5,
  over_receipt_pct numeric(6,2) NOT NULL DEFAULT 0,
  under_receipt_pct numeric(6,2) NOT NULL DEFAULT 10,
  amount_threshold numeric(18,2),
  action_on_breach text NOT NULL DEFAULT 'warn' CHECK (action_on_breach IN ('warn','block','approve_required')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_tolerance_company ON public.proc_tolerance_rules(company_id);

-- =========================================================
-- Vendor Risk Scoring (time series)
-- =========================================================
CREATE TABLE public.proc_vendor_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  vendor_code text,
  vendor_name text,
  scored_at timestamptz NOT NULL DEFAULT now(),
  score_period text NOT NULL DEFAULT 'monthly' CHECK (score_period IN ('monthly','quarterly','annual','adhoc')),
  financial_risk numeric(5,2) NOT NULL DEFAULT 0,
  operational_risk numeric(5,2) NOT NULL DEFAULT 0,
  compliance_risk numeric(5,2) NOT NULL DEFAULT 0,
  geopolitical_risk numeric(5,2) NOT NULL DEFAULT 0,
  esg_risk numeric(5,2) NOT NULL DEFAULT 0,
  concentration_risk numeric(5,2) NOT NULL DEFAULT 0,
  overall_score numeric(5,2) NOT NULL DEFAULT 0,
  risk_tier text NOT NULL DEFAULT 'low' CHECK (risk_tier IN ('low','medium','high','critical')),
  trend text NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving','stable','deteriorating')),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_vrisk_company_vendor ON public.proc_vendor_risk_scores(company_id, vendor_id, scored_at DESC);

-- =========================================================
-- Compliance Document Expiry Alerts
-- =========================================================
CREATE TABLE public.proc_compliance_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_label text NOT NULL,
  warn_days_before int[] NOT NULL DEFAULT ARRAY[90,60,30,7],
  is_mandatory boolean NOT NULL DEFAULT true,
  block_po_on_expiry boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_compl_rules_company ON public.proc_compliance_alert_rules(company_id);

CREATE TABLE public.proc_compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  vendor_name text,
  document_id uuid,
  document_type text NOT NULL,
  expiry_date date NOT NULL,
  days_until_expiry int NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical','expired')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_compl_alerts_company_status ON public.proc_compliance_alerts(company_id, status);

-- =========================================================
-- Regional Dimensions
-- =========================================================
CREATE TABLE public.proc_regional_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  region_code text NOT NULL,
  region_name text NOT NULL,
  region_name_ar text,
  country_code text NOT NULL DEFAULT 'SA',
  market_tier text NOT NULL DEFAULT 'domestic' CHECK (market_tier IN ('domestic','regional','international')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_regions_company ON public.proc_regional_dimensions(company_id);

-- =========================================================
-- RLS Enable
-- =========================================================
ALTER TABLE public.proc_sourcing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_sourcing_event_bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_tolerance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_vendor_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_compliance_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_regional_dimensions ENABLE ROW LEVEL SECURITY;

-- Permissive read/write for authenticated users (matches existing procurement pattern)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'proc_sourcing_events','proc_sourcing_event_bidders','proc_tolerance_rules',
    'proc_vendor_risk_scores','proc_compliance_alert_rules','proc_compliance_alerts',
    'proc_regional_dimensions'
  ])
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_sel', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t||'_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true)', t||'_upd', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)', t||'_del', t);
  END LOOP;
END $$;

-- =========================================================
-- Updated-at triggers
-- =========================================================
CREATE TRIGGER trg_sourcing_events_upd BEFORE UPDATE ON public.proc_sourcing_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tolerance_rules_upd BEFORE UPDATE ON public.proc_tolerance_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compl_rules_upd BEFORE UPDATE ON public.proc_compliance_alert_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed Saudi/GCC defaults (no company_id => global defaults)
-- =========================================================
INSERT INTO public.proc_regional_dimensions (region_code, region_name, region_name_ar, country_code, market_tier) VALUES
  ('KSA-C','Central Region','المنطقة الوسطى','SA','domestic'),
  ('KSA-W','Western Region','المنطقة الغربية','SA','domestic'),
  ('KSA-E','Eastern Region','المنطقة الشرقية','SA','domestic'),
  ('KSA-N','Northern Region','المنطقة الشمالية','SA','domestic'),
  ('KSA-S','Southern Region','المنطقة الجنوبية','SA','domestic'),
  ('GCC','Gulf Cooperation Council','مجلس التعاون','GCC','regional'),
  ('INTL','International','دولي','XX','international');

INSERT INTO public.proc_tolerance_rules (rule_name, doc_scope, price_variance_pct, qty_variance_pct, over_receipt_pct, under_receipt_pct, action_on_breach) VALUES
  ('CAPEX – strict','all',2,2,0,5,'block'),
  ('OPEX – standard','all',5,5,2,10,'warn'),
  ('Services','invoice',10,0,0,0,'approve_required'),
  ('Materials – flexible','grpo',5,10,5,15,'warn');

INSERT INTO public.proc_compliance_alert_rules (document_type, document_label, warn_days_before, is_mandatory, block_po_on_expiry) VALUES
  ('commercial_registration','Commercial Registration (CR)',ARRAY[90,60,30,7],true,true),
  ('vat_certificate','VAT Certificate',ARRAY[60,30,7],true,true),
  ('gosi_certificate','GOSI Certificate',ARRAY[60,30,7],true,false),
  ('saudization_certificate','Saudization (Nitaqat)',ARRAY[60,30,7],true,false),
  ('zatca_compliance','ZATCA E-Invoicing Compliance',ARRAY[60,30,7],true,true),
  ('iso_certification','ISO Certification',ARRAY[90,60,30],false,false),
  ('insurance_policy','Insurance Policy',ARRAY[60,30,7],true,false);
