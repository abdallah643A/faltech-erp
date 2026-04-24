
-- =====================================================
-- 1. COA overrides per entity
-- =====================================================
CREATE TABLE public.fin_coa_entity_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE NOT NULL,
  account_code TEXT NOT NULL,
  custom_name TEXT,
  custom_name_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blocked_for_posting BOOLEAN NOT NULL DEFAULT false,
  require_cost_center BOOLEAN NOT NULL DEFAULT false,
  require_project BOOLEAN NOT NULL DEFAULT false,
  require_dimension_1 BOOLEAN NOT NULL DEFAULT false,
  default_tax_code TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, account_code)
);
ALTER TABLE public.fin_coa_entity_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_coa_overrides" ON public.fin_coa_entity_overrides FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_coa_overrides" ON public.fin_coa_entity_overrides FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 2. Accounting dimensions (master)
-- =====================================================
CREATE TABLE public.fin_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  dimension_code TEXT NOT NULL,
  dimension_name TEXT NOT NULL,
  dimension_name_ar TEXT,
  dimension_type TEXT NOT NULL DEFAULT 'cost_center',
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, dimension_code)
);
ALTER TABLE public.fin_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_dims" ON public.fin_dimensions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_dims" ON public.fin_dimensions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.fin_dimension_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id UUID NOT NULL REFERENCES public.fin_dimensions(id) ON DELETE CASCADE,
  value_code TEXT NOT NULL,
  value_name TEXT NOT NULL,
  value_name_ar TEXT,
  parent_value_id UUID REFERENCES public.fin_dimension_values(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dimension_id, value_code)
);
ALTER TABLE public.fin_dimension_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_dim_vals" ON public.fin_dimension_values FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_dim_vals" ON public.fin_dimension_values FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 3. Recurring JE runs (history)
-- =====================================================
CREATE TABLE public.fin_recurring_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  template_name TEXT,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE SET NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  je_id UUID,
  je_doc_number TEXT,
  total_amount NUMERIC(18,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  triggered_by UUID,
  triggered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_recurring_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_recur_runs" ON public.fin_recurring_runs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_recur_runs" ON public.fin_recurring_runs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. Intercompany consolidation runs
-- =====================================================
CREATE TABLE public.fin_consolidation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  period_number INT,
  parent_company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  consolidation_currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'draft',
  total_eliminations INT DEFAULT 0,
  total_elim_amount NUMERIC(18,2) DEFAULT 0,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_consolidation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_cons_runs" ON public.fin_consolidation_runs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_cons_runs" ON public.fin_consolidation_runs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 5. Sensitive transaction approval chains
-- =====================================================
CREATE TABLE public.fin_approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  threshold_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  approval_levels INT NOT NULL DEFAULT 1,
  level_1_role TEXT,
  level_2_role TEXT,
  level_3_role TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_accounts TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_approval_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_appr_pol" ON public.fin_approval_policies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_appr_pol" ON public.fin_approval_policies FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.fin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.fin_approval_policies(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID,
  document_number TEXT,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  current_level INT NOT NULL DEFAULT 1,
  required_levels INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  level_1_approver UUID,
  level_1_approver_name TEXT,
  level_1_approved_at TIMESTAMPTZ,
  level_1_notes TEXT,
  level_2_approver UUID,
  level_2_approver_name TEXT,
  level_2_approved_at TIMESTAMPTZ,
  level_2_notes TEXT,
  level_3_approver UUID,
  level_3_approver_name TEXT,
  level_3_approved_at TIMESTAMPTZ,
  level_3_notes TEXT,
  rejected_by UUID,
  rejected_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  requested_by UUID,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_appr_req" ON public.fin_approval_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_appr_req" ON public.fin_approval_requests FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 6. Financial statement designer
-- =====================================================
CREATE TABLE public.fin_statement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  statement_type TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'IFRS',
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_statement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_stmt_tpl" ON public.fin_statement_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_stmt_tpl" ON public.fin_statement_templates FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.fin_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.fin_statement_templates(id) ON DELETE CASCADE,
  parent_line_id UUID REFERENCES public.fin_statement_lines(id) ON DELETE CASCADE,
  line_order INT NOT NULL DEFAULT 0,
  line_code TEXT,
  line_label TEXT NOT NULL,
  line_label_ar TEXT,
  line_type TEXT NOT NULL DEFAULT 'detail',
  account_codes TEXT[],
  formula TEXT,
  sign_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1,
  is_bold BOOLEAN NOT NULL DEFAULT false,
  is_underline BOOLEAN NOT NULL DEFAULT false,
  show_in_summary BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_statement_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_stmt_lines" ON public.fin_statement_lines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_stmt_lines" ON public.fin_statement_lines FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 7. Audit packs
-- =====================================================
CREATE TABLE public.fin_audit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  pack_name TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  period_number INT,
  pack_type TEXT NOT NULL DEFAULT 'period_close',
  status TEXT NOT NULL DEFAULT 'draft',
  total_evidence_files INT DEFAULT 0,
  total_je_count INT DEFAULT 0,
  total_amount NUMERIC(18,2) DEFAULT 0,
  prepared_by UUID,
  prepared_by_name TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_audit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_audit_pk" ON public.fin_audit_packs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_audit_pk" ON public.fin_audit_packs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.fin_audit_pack_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.fin_audit_packs(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  reference_id UUID,
  reference_label TEXT,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_audit_pack_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_audit_ev" ON public.fin_audit_pack_evidence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_audit_ev" ON public.fin_audit_pack_evidence FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 8. Tax localization rules
-- =====================================================
CREATE TABLE public.fin_tax_localization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  region_code TEXT,
  rule_name TEXT NOT NULL,
  rule_name_ar TEXT,
  tax_type TEXT NOT NULL,
  rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  account_code TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  authority TEXT,
  reporting_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_tax_localization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_tax_loc" ON public.fin_tax_localization FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_tax_loc" ON public.fin_tax_localization FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 9. Controller close-readiness snapshots
-- =====================================================
CREATE TABLE public.fin_close_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  period_id UUID,
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  unposted_je_count INT DEFAULT 0,
  unbalanced_je_count INT DEFAULT 0,
  pending_approvals INT DEFAULT 0,
  open_recon_items INT DEFAULT 0,
  ic_unmatched INT DEFAULT 0,
  checklist_completed INT DEFAULT 0,
  checklist_total INT DEFAULT 0,
  readiness_score NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fin_close_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_close_rd" ON public.fin_close_readiness FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_write_close_rd" ON public.fin_close_readiness FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER trg_coa_overrides_upd BEFORE UPDATE ON public.fin_coa_entity_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dims_upd BEFORE UPDATE ON public.fin_dimensions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cons_runs_upd BEFORE UPDATE ON public.fin_consolidation_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_appr_pol_upd BEFORE UPDATE ON public.fin_approval_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_appr_req_upd BEFORE UPDATE ON public.fin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stmt_tpl_upd BEFORE UPDATE ON public.fin_statement_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_audit_pk_upd BEFORE UPDATE ON public.fin_audit_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_loc_upd BEFORE UPDATE ON public.fin_tax_localization FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Saudi/GCC + IFRS defaults
-- =====================================================

-- Tax localization (ZATCA / GCC VAT / WHT)
INSERT INTO public.fin_tax_localization (country_code, rule_name, rule_name_ar, tax_type, rate, account_code, authority, reporting_code) VALUES
('SA', 'Standard VAT 15%', 'ضريبة القيمة المضافة 15%', 'vat_standard', 15.00, '21501', 'ZATCA', 'V15'),
('SA', 'Zero-Rated VAT', 'ضريبة القيمة المضافة - صفر', 'vat_zero', 0.00, '21502', 'ZATCA', 'V00'),
('SA', 'Exempt VAT', 'معفى من الضريبة', 'vat_exempt', 0.00, NULL, 'ZATCA', 'VEX'),
('SA', 'WHT - Services 5%', 'ضريبة استقطاع - خدمات 5%', 'wht', 5.00, '21601', 'ZATCA', 'WHT5'),
('SA', 'WHT - Royalties 15%', 'ضريبة استقطاع - حقوق الملكية 15%', 'wht', 15.00, '21602', 'ZATCA', 'WHT15'),
('AE', 'UAE VAT 5%', 'ضريبة القيمة المضافة الإمارات 5%', 'vat_standard', 5.00, '21503', 'FTA', 'V05'),
('BH', 'Bahrain VAT 10%', 'ضريبة القيمة المضافة البحرين 10%', 'vat_standard', 10.00, '21504', 'NBR', 'V10'),
('OM', 'Oman VAT 5%', 'ضريبة القيمة المضافة عمان 5%', 'vat_standard', 5.00, '21505', 'OTA', 'V05'),
('QA', 'Qatar - No VAT', 'قطر - بدون ضريبة', 'none', 0.00, NULL, 'GTA', 'NONE'),
('KW', 'Kuwait - No VAT', 'الكويت - بدون ضريبة', 'none', 0.00, NULL, 'KTA', 'NONE');

-- IFRS statement templates
INSERT INTO public.fin_statement_templates (id, template_name, template_name_ar, statement_type, framework, is_system, description) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'IFRS Statement of Financial Position', 'بيان المركز المالي - معايير IFRS', 'balance_sheet', 'IFRS', true, 'IAS 1 compliant balance sheet'),
('00000000-0000-0000-0000-000000000002'::uuid, 'IFRS Statement of Profit or Loss', 'بيان الأرباح والخسائر - IFRS', 'income_statement', 'IFRS', true, 'IAS 1 compliant P&L by function'),
('00000000-0000-0000-0000-000000000003'::uuid, 'IFRS Statement of Cash Flows', 'بيان التدفقات النقدية - IFRS', 'cash_flow', 'IFRS', true, 'IAS 7 indirect method'),
('00000000-0000-0000-0000-000000000004'::uuid, 'IFRS Statement of Changes in Equity', 'بيان التغيرات في حقوق الملكية', 'equity_changes', 'IFRS', true, 'IAS 1 SOCE');

-- Sample IFRS balance sheet structure
INSERT INTO public.fin_statement_lines (template_id, line_order, line_code, line_label, line_label_ar, line_type, is_bold) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 10, 'NCA', 'Non-current assets', 'الأصول غير المتداولة', 'header', true),
('00000000-0000-0000-0000-000000000001'::uuid, 20, 'PPE', 'Property, plant and equipment', 'الممتلكات والمعدات', 'detail', false),
('00000000-0000-0000-0000-000000000001'::uuid, 30, 'INTANG', 'Intangible assets', 'الأصول غير الملموسة', 'detail', false),
('00000000-0000-0000-0000-000000000001'::uuid, 40, 'NCA_TOT', 'Total non-current assets', 'إجمالي الأصول غير المتداولة', 'subtotal', true),
('00000000-0000-0000-0000-000000000001'::uuid, 50, 'CA', 'Current assets', 'الأصول المتداولة', 'header', true),
('00000000-0000-0000-0000-000000000001'::uuid, 60, 'INV', 'Inventories', 'المخزون', 'detail', false),
('00000000-0000-0000-0000-000000000001'::uuid, 70, 'AR', 'Trade and other receivables', 'الذمم المدينة', 'detail', false),
('00000000-0000-0000-0000-000000000001'::uuid, 80, 'CASH', 'Cash and cash equivalents', 'النقد وما في حكمه', 'detail', false),
('00000000-0000-0000-0000-000000000001'::uuid, 90, 'CA_TOT', 'Total current assets', 'إجمالي الأصول المتداولة', 'subtotal', true),
('00000000-0000-0000-0000-000000000001'::uuid, 100, 'TA', 'TOTAL ASSETS', 'إجمالي الأصول', 'total', true);

-- Sample IFRS P&L structure
INSERT INTO public.fin_statement_lines (template_id, line_order, line_code, line_label, line_label_ar, line_type, is_bold) VALUES
('00000000-0000-0000-0000-000000000002'::uuid, 10, 'REV', 'Revenue', 'الإيرادات', 'detail', true),
('00000000-0000-0000-0000-000000000002'::uuid, 20, 'COGS', 'Cost of sales', 'تكلفة المبيعات', 'detail', false),
('00000000-0000-0000-0000-000000000002'::uuid, 30, 'GP', 'Gross profit', 'إجمالي الربح', 'subtotal', true),
('00000000-0000-0000-0000-000000000002'::uuid, 40, 'OPEX', 'Operating expenses', 'المصروفات التشغيلية', 'detail', false),
('00000000-0000-0000-0000-000000000002'::uuid, 50, 'OP', 'Operating profit', 'الربح التشغيلي', 'subtotal', true),
('00000000-0000-0000-0000-000000000002'::uuid, 60, 'FIN', 'Finance costs', 'تكاليف التمويل', 'detail', false),
('00000000-0000-0000-0000-000000000002'::uuid, 70, 'PBT', 'Profit before tax', 'الربح قبل الضريبة', 'subtotal', true),
('00000000-0000-0000-0000-000000000002'::uuid, 80, 'TAX', 'Income tax / Zakat', 'ضريبة الدخل / الزكاة', 'detail', false),
('00000000-0000-0000-0000-000000000002'::uuid, 90, 'NP', 'NET PROFIT', 'صافي الربح', 'total', true);

-- Default sensitive transaction approval policies
INSERT INTO public.fin_approval_policies (policy_name, document_type, threshold_amount, currency, approval_levels, level_1_role, level_2_role, level_3_role) VALUES
('Standard JE Approval', 'journal_entry', 50000, 'SAR', 1, 'controller', NULL, NULL),
('Material JE Approval', 'journal_entry', 250000, 'SAR', 2, 'controller', 'cfo', NULL),
('High-Risk JE Approval', 'journal_entry', 1000000, 'SAR', 3, 'controller', 'cfo', 'ceo'),
('Manual Cash Posting', 'cash_journal', 25000, 'SAR', 2, 'accountant', 'controller', NULL),
('Period-End Adjustment', 'adjusting_entry', 10000, 'SAR', 2, 'accountant', 'controller', NULL);

-- Default dimensions
INSERT INTO public.fin_dimensions (dimension_code, dimension_name, dimension_name_ar, dimension_type, sort_order) VALUES
('CC', 'Cost Center', 'مركز التكلفة', 'cost_center', 1),
('PRJ', 'Project', 'المشروع', 'project', 2),
('REG', 'Region', 'المنطقة', 'region', 3),
('SEG', 'Business Segment', 'قطاع الأعمال', 'segment', 4);

-- Indexes
CREATE INDEX idx_coa_overrides_company ON public.fin_coa_entity_overrides(company_id);
CREATE INDEX idx_dim_values_dim ON public.fin_dimension_values(dimension_id);
CREATE INDEX idx_recur_runs_template ON public.fin_recurring_runs(template_id);
CREATE INDEX idx_appr_req_status ON public.fin_approval_requests(status);
CREATE INDEX idx_appr_req_doc ON public.fin_approval_requests(document_id);
CREATE INDEX idx_stmt_lines_tpl ON public.fin_statement_lines(template_id);
CREATE INDEX idx_audit_pack_company ON public.fin_audit_packs(company_id);
CREATE INDEX idx_close_rd_period ON public.fin_close_readiness(fiscal_year, period_number);
