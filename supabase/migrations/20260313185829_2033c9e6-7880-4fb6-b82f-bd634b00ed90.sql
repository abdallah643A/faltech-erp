-- CRM
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.customer_segments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.customer_tags ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.follow_up_rules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- HR
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.leave_balances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.leave_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.performance_cycles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.performance_goals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.job_applicants ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.hr_managers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Banking & POS
ALTER TABLE public.bank_reconciliations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.bank_pos_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.bank_pos_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.bank_pos_terminals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.currency_exchange_rates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Finance
ALTER TABLE public.finance_alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.financial_clearances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.financial_scenarios ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.payment_certificates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.contingency_reserves ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.contingency_releases ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.variance_explanations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.cost_variances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.distribution_rules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.depreciation_runs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.dunning_runs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.dunning_levels ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.inventory_valuation ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Project Control
ALTER TABLE public.project_control_alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.project_control_thresholds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.project_baselines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.evm_snapshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Inventory
ALTER TABLE public.batch_serial_numbers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.bin_locations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.item_warehouse_info ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.external_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.external_invoice_reservations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Manufacturing
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.mrp_runs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- IT Service
ALTER TABLE public.it_tickets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_cmdb ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_changes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_problems ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_service_catalog ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_sla_configs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_knowledge_base ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.it_incident_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Documents & Config
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.numbering_series ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.mail_configuration ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.mr_workflow_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.approval_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.asset_categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- CPMS
ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.cpms_clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.cpms_resources ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Other
ALTER TABLE public.opportunity_competitors ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_visits_company_id ON public.visits(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON public.attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_it_tickets_company_id ON public.it_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_alerts_company_id ON public.finance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_clearances_company_id ON public.financial_clearances(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_certificates_company_id ON public.payment_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_company_id ON public.bank_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_company_id ON public.production_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON public.leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_payslips_company_id ON public.payslips(company_id);
CREATE INDEX IF NOT EXISTS idx_cpms_projects_company_id ON public.cpms_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_numbering_series_company_id ON public.numbering_series(company_id);