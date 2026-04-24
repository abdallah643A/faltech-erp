
-- Enhanced Landed Cost documents (v2)
CREATE TABLE public.lc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL,
  reference_no TEXT,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_date DATE DEFAULT CURRENT_DATE,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  warehouse_id UUID,
  lc_type TEXT NOT NULL DEFAULT 'import_shipment',
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_name TEXT,
  shipment_no TEXT,
  container_no TEXT,
  bill_of_entry TEXT,
  customs_ref TEXT,
  incoterm TEXT,
  currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC DEFAULT 1,
  project_id UUID,
  cost_center_id UUID,
  department TEXT,
  business_unit TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'draft',
  approval_status TEXT DEFAULT 'none',
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID,
  reversal_reason TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  total_base_cost NUMERIC DEFAULT 0,
  total_charges NUMERIC DEFAULT 0,
  total_capitalized NUMERIC DEFAULT 0,
  total_recoverable_tax NUMERIC DEFAULT 0,
  total_non_recoverable_tax NUMERIC DEFAULT 0,
  total_landed_cost NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Source documents linked to LC
CREATE TABLE public.lc_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'goods_receipt',
  source_id UUID,
  source_number TEXT,
  source_vendor TEXT,
  source_date DATE,
  source_total NUMERIC DEFAULT 0,
  allocation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Item lines from source documents
CREATE TABLE public.lc_item_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  source_document_id UUID REFERENCES public.lc_source_documents(id) ON DELETE CASCADE,
  line_num INTEGER DEFAULT 1,
  item_code TEXT,
  item_name TEXT,
  item_group TEXT,
  uom TEXT,
  received_qty NUMERIC DEFAULT 0,
  open_qty NUMERIC DEFAULT 0,
  base_unit_cost NUMERIC DEFAULT 0,
  base_line_amount NUMERIC DEFAULT 0,
  warehouse TEXT,
  batch_serial TEXT,
  project TEXT,
  cost_center TEXT,
  department TEXT,
  weight NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 0,
  num_packages INTEGER DEFAULT 0,
  customs_value NUMERIC DEFAULT 0,
  manual_factor NUMERIC,
  allocated_landed_cost NUMERIC DEFAULT 0,
  final_unit_cost NUMERIC DEFAULT 0,
  final_line_cost NUMERIC DEFAULT 0,
  inventory_value_impact NUMERIC DEFAULT 0,
  variance_amount NUMERIC DEFAULT 0,
  variance_pct NUMERIC DEFAULT 0,
  line_status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Charge/cost component lines
CREATE TABLE public.lc_charge_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  line_num INTEGER DEFAULT 1,
  charge_code TEXT,
  charge_description TEXT,
  charge_category TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  reference_document TEXT,
  currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC DEFAULT 1,
  amount_foreign NUMERIC DEFAULT 0,
  amount_local NUMERIC DEFAULT 0,
  tax_applicable BOOLEAN DEFAULT false,
  tax_amount NUMERIC DEFAULT 0,
  recoverable_tax NUMERIC DEFAULT 0,
  non_recoverable_tax NUMERIC DEFAULT 0,
  total_charge NUMERIC DEFAULT 0,
  charge_account TEXT,
  treatment TEXT DEFAULT 'capitalize',
  allocation_method TEXT DEFAULT 'by_value',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allocation junction: charge → item
CREATE TABLE public.lc_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  charge_line_id UUID REFERENCES public.lc_charge_lines(id) ON DELETE CASCADE NOT NULL,
  item_line_id UUID REFERENCES public.lc_item_lines(id) ON DELETE CASCADE NOT NULL,
  allocation_basis NUMERIC DEFAULT 0,
  allocation_pct NUMERIC DEFAULT 0,
  allocated_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Approval workflow history
CREATE TABLE public.lc_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  acted_by UUID,
  acted_by_name TEXT,
  acted_at TIMESTAMPTZ DEFAULT now(),
  comments TEXT,
  from_status TEXT,
  to_status TEXT
);

-- GL account mappings per charge category
CREATE TABLE public.lc_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  charge_category TEXT NOT NULL,
  inventory_account TEXT,
  clearing_account TEXT,
  expense_account TEXT,
  tax_account TEXT,
  rounding_account TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company-level LC control settings
CREATE TABLE public.lc_control_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id) UNIQUE,
  default_allocation_method TEXT DEFAULT 'by_value',
  default_currency TEXT DEFAULT 'SAR',
  posting_require_approval BOOLEAN DEFAULT true,
  duplicate_lc_on_receipt TEXT DEFAULT 'warning',
  tolerance_pct NUMERIC DEFAULT 5,
  tolerance_amount NUMERIC DEFAULT 1000,
  rounding_account TEXT,
  clearing_account TEXT,
  capitalize_non_recoverable_tax BOOLEAN DEFAULT true,
  exclude_recoverable_tax BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE public.lc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lc_document_id UUID REFERENCES public.lc_documents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.lc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_item_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_charge_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth users manage lc_documents" ON public.lc_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_source_documents" ON public.lc_source_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_item_lines" ON public.lc_item_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_charge_lines" ON public.lc_charge_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_allocations" ON public.lc_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_approval_history" ON public.lc_approval_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_account_mappings" ON public.lc_account_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_control_settings" ON public.lc_control_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage lc_audit_logs" ON public.lc_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_lc_documents_company ON public.lc_documents(company_id);
CREATE INDEX idx_lc_documents_status ON public.lc_documents(status);
CREATE INDEX idx_lc_documents_vendor ON public.lc_documents(vendor_id);
CREATE INDEX idx_lc_source_documents_lc ON public.lc_source_documents(lc_document_id);
CREATE INDEX idx_lc_item_lines_lc ON public.lc_item_lines(lc_document_id);
CREATE INDEX idx_lc_charge_lines_lc ON public.lc_charge_lines(lc_document_id);
CREATE INDEX idx_lc_allocations_lc ON public.lc_allocations(lc_document_id);
CREATE INDEX idx_lc_allocations_charge ON public.lc_allocations(charge_line_id);
CREATE INDEX idx_lc_allocations_item ON public.lc_allocations(item_line_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.lc_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER lc_documents_updated BEFORE UPDATE ON public.lc_documents FOR EACH ROW EXECUTE FUNCTION public.lc_update_timestamp();
CREATE TRIGGER lc_account_mappings_updated BEFORE UPDATE ON public.lc_account_mappings FOR EACH ROW EXECUTE FUNCTION public.lc_update_timestamp();
CREATE TRIGGER lc_control_settings_updated BEFORE UPDATE ON public.lc_control_settings FOR EACH ROW EXECUTE FUNCTION public.lc_update_timestamp();
