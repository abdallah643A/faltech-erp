-- Add company_id to all standalone tables that are missing it

-- Sales & Service
ALTER TABLE public.sales_employees ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_sales_employees_company ON public.sales_employees(company_id);

ALTER TABLE public.service_contracts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_service_contracts_company ON public.service_contracts(company_id);

ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_service_orders_company ON public.service_orders(company_id);

ALTER TABLE public.service_equipment ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_service_equipment_company ON public.service_equipment(company_id);

-- Procurement
ALTER TABLE public.purchase_quotations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_purchase_quotations_company ON public.purchase_quotations(company_id);

ALTER TABLE public.stock_transfer_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_requests_company ON public.stock_transfer_requests(company_id);

-- Quality & Manufacturing
ALTER TABLE public.quality_tests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_quality_tests_company ON public.quality_tests(company_id);

ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON public.work_orders(company_id);

-- POS
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_company ON public.pos_transactions(company_id);

ALTER TABLE public.pos_shifts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_company ON public.pos_shifts(company_id);

-- Warehouse
ALTER TABLE public.pick_lists ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_company ON public.pick_lists(company_id);

-- Projects (child tables queried directly)
ALTER TABLE public.project_contracts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_company ON public.project_contracts(company_id);

ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_company ON public.project_milestones(company_id);

-- WhatsApp & Communication
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
ALTER TABLE public.whatsapp_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- ZATCA
ALTER TABLE public.zatca_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);

-- Surveys & Site
ALTER TABLE public.survey_questionnaires ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_survey_questionnaires_company ON public.survey_questionnaires(company_id);

ALTER TABLE public.site_surveys ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_company ON public.site_surveys(company_id);

-- HR
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_training_programs_company ON public.training_programs(company_id);

-- Maintenance & Warranty
ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_company ON public.warranty_claims(company_id);

ALTER TABLE public.pm_plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_company ON public.pm_plans(company_id);

-- Dunning
ALTER TABLE public.dunning_letters ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.sap_companies(id);
CREATE INDEX IF NOT EXISTS idx_dunning_letters_company ON public.dunning_letters(company_id);