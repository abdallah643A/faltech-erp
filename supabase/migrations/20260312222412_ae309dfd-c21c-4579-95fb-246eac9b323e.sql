
-- Phase 2: BOM & MRP
CREATE TABLE public.bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_number TEXT UNIQUE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  description TEXT,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'active',
  uom TEXT DEFAULT 'EA',
  standard_qty NUMERIC DEFAULT 1,
  total_cost NUMERIC DEFAULT 0,
  project_id UUID,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE NOT NULL,
  line_num INT DEFAULT 1,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  uom TEXT DEFAULT 'EA',
  unit_cost NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  warehouse TEXT,
  scrap_percent NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mrp_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT UNIQUE,
  run_date TIMESTAMPTZ DEFAULT now(),
  horizon_days INT DEFAULT 30,
  status TEXT DEFAULT 'draft',
  total_planned_orders INT DEFAULT 0,
  total_shortage_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mrp_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrp_run_id UUID REFERENCES public.mrp_runs(id) ON DELETE CASCADE NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  required_qty NUMERIC DEFAULT 0,
  on_hand_qty NUMERIC DEFAULT 0,
  on_order_qty NUMERIC DEFAULT 0,
  shortage_qty NUMERIC DEFAULT 0,
  suggested_action TEXT DEFAULT 'purchase',
  suggested_qty NUMERIC DEFAULT 0,
  due_date DATE,
  source_document TEXT,
  source_id TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Pick & Pack, Quality Management
CREATE TABLE public.pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_number TEXT UNIQUE,
  source_type TEXT DEFAULT 'sales_order',
  source_id UUID,
  source_number TEXT,
  status TEXT DEFAULT 'open',
  picker_id UUID,
  picker_name TEXT,
  warehouse TEXT,
  priority TEXT DEFAULT 'normal',
  picked_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pick_list_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID REFERENCES public.pick_lists(id) ON DELETE CASCADE NOT NULL,
  line_num INT DEFAULT 1,
  item_code TEXT,
  item_description TEXT NOT NULL,
  ordered_qty NUMERIC DEFAULT 0,
  picked_qty NUMERIC DEFAULT 0,
  packed_qty NUMERIC DEFAULT 0,
  bin_location TEXT,
  batch_number TEXT,
  serial_number TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quality_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_number TEXT UNIQUE,
  test_name TEXT NOT NULL,
  test_type TEXT DEFAULT 'incoming',
  item_code TEXT,
  item_description TEXT,
  batch_number TEXT,
  production_order_id UUID REFERENCES public.production_orders(id),
  sample_size INT DEFAULT 1,
  inspector_id UUID,
  inspector_name TEXT,
  status TEXT DEFAULT 'pending',
  result TEXT DEFAULT 'pending',
  pass_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  defect_rate NUMERIC DEFAULT 0,
  notes TEXT,
  inspected_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.quality_test_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_test_id UUID REFERENCES public.quality_tests(id) ON DELETE CASCADE NOT NULL,
  parameter_name TEXT NOT NULL,
  specification TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  actual_value NUMERIC,
  text_result TEXT,
  pass_fail TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4: Dunning & Bank Reconciliation
CREATE TABLE public.dunning_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  days_overdue INT NOT NULL,
  fee_amount NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  letter_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dunning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number TEXT UNIQUE,
  run_date DATE DEFAULT CURRENT_DATE,
  posting_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'draft',
  total_customers INT DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_letters INT DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dunning_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dunning_run_id UUID REFERENCES public.dunning_runs(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_code TEXT,
  customer_name TEXT NOT NULL,
  dunning_level INT DEFAULT 1,
  total_overdue NUMERIC DEFAULT 0,
  fee_amount NUMERIC DEFAULT 0,
  interest_amount NUMERIC DEFAULT 0,
  total_due NUMERIC DEFAULT 0,
  oldest_invoice_date DATE,
  days_overdue INT DEFAULT 0,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  sent_via TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recon_number TEXT UNIQUE,
  bank_account TEXT NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance NUMERIC DEFAULT 0,
  book_balance NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  matched_count INT DEFAULT 0,
  unmatched_count INT DEFAULT 0,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bank_recon_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE NOT NULL,
  line_type TEXT DEFAULT 'statement',
  reference TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  transaction_date DATE,
  matched BOOLEAN DEFAULT false,
  matched_to_id UUID,
  matched_to_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 5: Audit Trail & Form Settings
CREATE TABLE public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_trail_table ON public.audit_trail(table_name);
CREATE INDEX idx_audit_trail_record ON public.audit_trail(record_id);
CREATE INDEX idx_audit_trail_user ON public.audit_trail(user_id);
CREATE INDEX idx_audit_trail_created ON public.audit_trail(created_at DESC);

CREATE TABLE public.user_form_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  form_key TEXT NOT NULL,
  visible_columns TEXT[],
  column_order TEXT[],
  column_widths JSONB,
  default_filters JSONB,
  sort_by TEXT,
  sort_direction TEXT DEFAULT 'asc',
  rows_per_page INT DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, form_key)
);

-- Enable RLS on all tables
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_test_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_recon_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_form_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "auth_all" ON public.bill_of_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.bom_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.mrp_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.mrp_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.pick_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.pick_list_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.quality_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.quality_test_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.dunning_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.dunning_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.dunning_letters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.bank_reconciliations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.bank_recon_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_view_audit" ON public.audit_trail FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));
CREATE POLICY "system_insert_audit" ON public.audit_trail FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_own_settings" ON public.user_form_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Audit trail trigger function
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_user_id UUID;
  v_email TEXT;
  v_name TEXT;
  k TEXT;
BEGIN
  v_user_id := auth.uid();
  SELECT email, full_name INTO v_email, v_name FROM profiles WHERE user_id = v_user_id LIMIT 1;
  
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO audit_trail (table_name, record_id, action, old_values, user_id, user_email, user_name)
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', v_old, v_user_id, v_email, v_name);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    INSERT INTO audit_trail (table_name, record_id, action, new_values, user_id, user_email, user_name)
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', v_new, v_user_id, v_email, v_name);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changed := ARRAY[]::TEXT[];
    FOR k IN SELECT jsonb_object_keys(v_new)
    LOOP
      IF v_old->k IS DISTINCT FROM v_new->k AND k NOT IN ('updated_at', 'last_synced_at') THEN
        v_changed := array_append(v_changed, k);
      END IF;
    END LOOP;
    IF array_length(v_changed, 1) > 0 THEN
      INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_fields, user_id, user_email, user_name)
      VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', v_old, v_new, v_changed, v_user_id, v_email, v_name);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Apply audit trail to key tables
CREATE TRIGGER audit_sales_orders AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_ar_invoices AFTER INSERT OR UPDATE OR DELETE ON public.ar_invoices FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_business_partners AFTER INSERT OR UPDATE OR DELETE ON public.business_partners FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_incoming_payments AFTER INSERT OR UPDATE OR DELETE ON public.incoming_payments FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
