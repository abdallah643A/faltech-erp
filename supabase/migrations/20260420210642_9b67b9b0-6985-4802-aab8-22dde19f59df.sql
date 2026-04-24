
CREATE TABLE IF NOT EXISTS public.global_country_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  pack_code TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region TEXT,
  pack_type TEXT DEFAULT 'generic',
  supported_modules TEXT[] DEFAULT ARRAY['tax','invoicing','e_documents','withholding','banking','payroll','statutory_reports','language','calendar'],
  default_currency TEXT,
  default_language TEXT,
  tax_config JSONB DEFAULT '{}'::jsonb,
  invoice_config JSONB DEFAULT '{}'::jsonb,
  e_document_config JSONB DEFAULT '{}'::jsonb,
  withholding_config JSONB DEFAULT '{}'::jsonb,
  banking_config JSONB DEFAULT '{}'::jsonb,
  payroll_config JSONB DEFAULT '{}'::jsonb,
  statutory_config JSONB DEFAULT '{}'::jsonb,
  calendar_config JSONB DEFAULT '{}'::jsonb,
  language_config JSONB DEFAULT '{}'::jsonb,
  is_template BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, pack_code, version)
);
ALTER TABLE public.global_country_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_country_packs" ON public.global_country_packs;
CREATE POLICY "auth_crud_global_country_packs" ON public.global_country_packs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_regulatory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  country_pack_id UUID REFERENCES public.global_country_packs(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_domain TEXT NOT NULL,
  formula_expression TEXT NOT NULL,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  priority INTEGER DEFAULT 100,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, rule_code, version)
);
ALTER TABLE public.global_regulatory_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_regulatory_rules" ON public.global_regulatory_rules;
CREATE POLICY "auth_crud_global_regulatory_rules" ON public.global_regulatory_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_legal_entity_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  legal_entity_id UUID,
  legal_entity_name TEXT NOT NULL,
  country_pack_id UUID REFERENCES public.global_country_packs(id),
  country_code TEXT NOT NULL,
  activation_mode TEXT DEFAULT 'legal_entity_override',
  tax_profile_id UUID,
  active_modules TEXT[] DEFAULT ARRAY['tax','invoicing'],
  regulatory_obligations JSONB DEFAULT '[]'::jsonb,
  entity_identifiers JSONB DEFAULT '{}'::jsonb,
  fiscal_calendar_code TEXT,
  primary_language TEXT,
  secondary_languages TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  go_live_date DATE,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, legal_entity_name, country_code)
);
ALTER TABLE public.global_legal_entity_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_legal_entity_compliance" ON public.global_legal_entity_compliance;
CREATE POLICY "auth_crud_global_legal_entity_compliance" ON public.global_legal_entity_compliance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  legal_entity_compliance_id UUID REFERENCES public.global_legal_entity_compliance(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  tax_registration_number TEXT,
  tax_scheme TEXT DEFAULT 'VAT',
  filing_frequency TEXT DEFAULT 'monthly',
  tax_rates JSONB DEFAULT '[]'::jsonb,
  exemption_rules JSONB DEFAULT '[]'::jsonb,
  reverse_charge_rules JSONB DEFAULT '[]'::jsonb,
  withholding_rules JSONB DEFAULT '[]'::jsonb,
  rounding_rule TEXT DEFAULT 'commercial',
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.global_tax_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_tax_profiles" ON public.global_tax_profiles;
CREATE POLICY "auth_crud_global_tax_profiles" ON public.global_tax_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_regional_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  calendar_code TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  country_code TEXT,
  weekend_days INTEGER[] DEFAULT ARRAY[5,6],
  fiscal_year_start_month INTEGER DEFAULT 1,
  holidays JSONB DEFAULT '[]'::jsonb,
  reporting_blackout_dates JSONB DEFAULT '[]'::jsonb,
  payroll_cutoff_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, calendar_code)
);
ALTER TABLE public.global_regional_calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_regional_calendars" ON public.global_regional_calendars;
CREATE POLICY "auth_crud_global_regional_calendars" ON public.global_regional_calendars FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_language_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  country_code TEXT,
  direction TEXT DEFAULT 'ltr',
  number_format TEXT DEFAULT '1,234.56',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  labels JSONB DEFAULT '{}'::jsonb,
  document_terms JSONB DEFAULT '{}'::jsonb,
  legal_phrases JSONB DEFAULT '{}'::jsonb,
  print_layout_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, language_code, country_code)
);
ALTER TABLE public.global_language_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_language_packs" ON public.global_language_packs;
CREATE POLICY "auth_crud_global_language_packs" ON public.global_language_packs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_statutory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  country_pack_id UUID REFERENCES public.global_country_packs(id) ON DELETE CASCADE,
  report_code TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_domain TEXT DEFAULT 'tax',
  filing_frequency TEXT DEFAULT 'monthly',
  due_day INTEGER,
  output_formats TEXT[] DEFAULT ARRAY['pdf','xlsx','xml'],
  data_sources JSONB DEFAULT '[]'::jsonb,
  calculation_rules JSONB DEFAULT '{}'::jsonb,
  submission_config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, report_code, version)
);
ALTER TABLE public.global_statutory_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_statutory_reports" ON public.global_statutory_reports;
CREATE POLICY "auth_crud_global_statutory_reports" ON public.global_statutory_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_banking_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  format_code TEXT NOT NULL,
  format_name TEXT NOT NULL,
  country_code TEXT,
  format_type TEXT DEFAULT 'payment_file',
  standard TEXT DEFAULT 'ISO20022',
  file_extension TEXT DEFAULT 'xml',
  layout_definition JSONB DEFAULT '{}'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  bank_specific_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, format_code)
);
ALTER TABLE public.global_banking_formats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_banking_formats" ON public.global_banking_formats;
CREATE POLICY "auth_crud_global_banking_formats" ON public.global_banking_formats FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_payroll_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  country_pack_id UUID REFERENCES public.global_country_packs(id) ON DELETE CASCADE,
  rule_set_code TEXT NOT NULL,
  rule_set_name TEXT NOT NULL,
  earnings_rules JSONB DEFAULT '[]'::jsonb,
  deduction_rules JSONB DEFAULT '[]'::jsonb,
  social_insurance_rules JSONB DEFAULT '[]'::jsonb,
  income_tax_rules JSONB DEFAULT '[]'::jsonb,
  end_of_service_rules JSONB DEFAULT '[]'::jsonb,
  payslip_config JSONB DEFAULT '{}'::jsonb,
  formula_context JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, rule_set_code, version)
);
ALTER TABLE public.global_payroll_rule_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_payroll_rule_sets" ON public.global_payroll_rule_sets;
CREATE POLICY "auth_crud_global_payroll_rule_sets" ON public.global_payroll_rule_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.global_compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  performed_by_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.global_compliance_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_crud_global_compliance_audit_log" ON public.global_compliance_audit_log;
CREATE POLICY "auth_crud_global_compliance_audit_log" ON public.global_compliance_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.global_evaluate_formula_preview(p_formula TEXT, p_context JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'formula', p_formula,
    'context', p_context,
    'status', 'preview_only',
    'note', 'Formula execution is governed by the application low-code evaluator and stored here for versioned compliance governance.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.global_clone_country_pack(p_source_pack_id UUID, p_new_pack_code TEXT, p_new_pack_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO public.global_country_packs (
    company_id, pack_code, pack_name, country_code, region, pack_type, supported_modules, default_currency, default_language,
    tax_config, invoice_config, e_document_config, withholding_config, banking_config, payroll_config, statutory_config, calendar_config, language_config,
    is_template, is_active, version, effective_from, effective_to
  )
  SELECT company_id, p_new_pack_code, p_new_pack_name, country_code, region, pack_type, supported_modules, default_currency, default_language,
    tax_config, invoice_config, e_document_config, withholding_config, banking_config, payroll_config, statutory_config, calendar_config, language_config,
    false, true, 1, CURRENT_DATE, NULL
  FROM public.global_country_packs WHERE id = p_source_pack_id
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

CREATE TRIGGER trg_global_country_packs_updated BEFORE UPDATE ON public.global_country_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_regulatory_rules_updated BEFORE UPDATE ON public.global_regulatory_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_legal_entity_compliance_updated BEFORE UPDATE ON public.global_legal_entity_compliance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_tax_profiles_updated BEFORE UPDATE ON public.global_tax_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_regional_calendars_updated BEFORE UPDATE ON public.global_regional_calendars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_language_packs_updated BEFORE UPDATE ON public.global_language_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_statutory_reports_updated BEFORE UPDATE ON public.global_statutory_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_banking_formats_updated BEFORE UPDATE ON public.global_banking_formats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_payroll_rule_sets_updated BEFORE UPDATE ON public.global_payroll_rule_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
