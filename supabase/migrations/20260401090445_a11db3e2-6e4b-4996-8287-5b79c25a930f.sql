
CREATE TABLE public.required_field_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  field_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module, field_name)
);

ALTER TABLE public.required_field_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view required field settings"
  ON public.required_field_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage required field settings"
  ON public.required_field_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed system-default required fields (these cannot be un-required)
INSERT INTO public.required_field_settings (company_id, module, field_name, is_required, is_system_default) VALUES
-- Leads
(NULL, 'leads', 'company_name', true, true),
(NULL, 'leads', 'contact_person', true, true),
-- Opportunities
(NULL, 'opportunities', 'opportunity_name', true, true),
(NULL, 'opportunities', 'bp_code', true, true),
-- Sales Orders
(NULL, 'sales_orders', 'customer_name', true, true),
(NULL, 'sales_orders', 'customer_code', true, true),
-- Purchase Orders
(NULL, 'purchase_orders', 'vendor_name', true, true),
(NULL, 'purchase_orders', 'vendor_code', true, true),
-- AR Invoices
(NULL, 'ar_invoices', 'customer_name', true, true),
(NULL, 'ar_invoices', 'customer_code', true, true),
-- AP Invoices
(NULL, 'ap_invoices', 'vendor_name', true, true),
-- Quotations
(NULL, 'quotations', 'customer_name', true, true),
-- Activities
(NULL, 'activities', 'subject', true, true),
(NULL, 'activities', 'type', true, true),
-- Business Partners
(NULL, 'business_partners', 'card_name', true, true),
(NULL, 'business_partners', 'card_code', true, true),
-- Items
(NULL, 'items', 'item_code', true, true),
(NULL, 'items', 'item_name', true, true),
-- Projects
(NULL, 'projects', 'name', true, true),
-- RFIs
(NULL, 'rfis', 'subject', true, true),
(NULL, 'rfis', 'question', true, true),
-- Shipments
(NULL, 'shipments', 'shipment_type', true, true),
-- Budget Items
(NULL, 'budget_items', 'category', true, true),
(NULL, 'budget_items', 'planned_amount', true, true),
-- Employees
(NULL, 'employees', 'first_name', true, true),
(NULL, 'employees', 'last_name', true, true),
-- Material Requests
(NULL, 'material_requests', 'project_name', true, true),
-- Deliveries
(NULL, 'deliveries', 'customer_name', true, true),
-- Incoming Payments
(NULL, 'incoming_payments', 'total_amount', true, true),
-- Cost Codes
(NULL, 'cost_codes', 'code', true, true),
(NULL, 'cost_codes', 'title', true, true),
-- SOV
(NULL, 'schedule_of_values', 'description', true, true),
(NULL, 'schedule_of_values', 'contract_amount', true, true),
-- Phases
(NULL, 'project_phases', 'phase_name', true, true),
-- Performance Reviews
(NULL, 'performance_reviews', 'reviewer_name', true, true),
-- Deals
(NULL, 'deals', 'deal_name', true, true),
-- Standards
(NULL, 'tmo_standards', 'name', true, true);
