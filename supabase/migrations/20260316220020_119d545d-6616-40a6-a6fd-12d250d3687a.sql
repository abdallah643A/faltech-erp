
-- Asset Retirement Schedules
CREATE TABLE public.asset_retirement_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  planned_retirement_date DATE NOT NULL,
  retirement_reason TEXT,
  disposal_method TEXT DEFAULT 'sale',
  estimated_salvage_value NUMERIC DEFAULT 0,
  regulatory_requirement TEXT,
  compliance_deadline DATE,
  notification_sent BOOLEAN DEFAULT false,
  notification_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset Insurance Tracking
CREATE TABLE public.asset_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  policy_number TEXT NOT NULL,
  provider TEXT NOT NULL,
  coverage_type TEXT DEFAULT 'comprehensive',
  premium_amount NUMERIC DEFAULT 0,
  coverage_amount NUMERIC DEFAULT 0,
  deductible NUMERIC DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset Impairment Testing
CREATE TABLE public.asset_impairments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  test_date DATE NOT NULL,
  book_value_before NUMERIC NOT NULL DEFAULT 0,
  fair_value NUMERIC NOT NULL DEFAULT 0,
  recoverable_amount NUMERIC NOT NULL DEFAULT 0,
  impairment_loss NUMERIC NOT NULL DEFAULT 0,
  book_value_after NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  test_method TEXT DEFAULT 'fair_value_less_costs',
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compliance Audit Records
CREATE TABLE public.asset_compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'audit',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to_name TEXT,
  regulatory_body TEXT,
  reference_number TEXT,
  findings TEXT,
  corrective_actions TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_retirement_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_impairments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_compliance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage asset_retirement_schedules" ON public.asset_retirement_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage asset_insurance" ON public.asset_insurance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage asset_impairments" ON public.asset_impairments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage asset_compliance_records" ON public.asset_compliance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
