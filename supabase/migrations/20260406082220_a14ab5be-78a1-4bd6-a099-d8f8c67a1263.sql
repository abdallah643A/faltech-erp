
-- Intercompany Company Relationships
CREATE TABLE public.ic_company_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  source_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  target_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  relationship_type TEXT NOT NULL DEFAULT 'sister' CHECK (relationship_type IN ('parent_subsidiary','subsidiary_parent','sister','branch_to_branch')),
  direction TEXT NOT NULL DEFAULT 'two_way' CHECK (direction IN ('one_way','two_way')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  ic_customer_code TEXT,
  ic_vendor_code TEXT,
  ic_customer_bp_id UUID REFERENCES public.business_partners(id),
  ic_vendor_bp_id UUID REFERENCES public.business_partners(id),
  due_to_account TEXT,
  due_from_account TEXT,
  ic_revenue_account TEXT,
  ic_expense_account TEXT,
  ic_inventory_account TEXT,
  ic_clearing_account TEXT,
  tax_policy TEXT DEFAULT 'exempt' CHECK (tax_policy IN ('exempt','standard','reverse_charge','zero_rated')),
  transfer_pricing_method TEXT DEFAULT 'cost_plus' CHECK (transfer_pricing_method IN ('cost_plus','fixed_markup','price_list','last_purchase','standard_cost','moving_average','item_specific')),
  default_markup_percent NUMERIC(5,2) DEFAULT 0,
  currency_handling TEXT DEFAULT 'source' CHECK (currency_handling IN ('source','target','group')),
  exchange_rate_source TEXT DEFAULT 'daily' CHECK (exchange_rate_source IN ('daily','monthly','fixed','manual')),
  auto_post BOOLEAN NOT NULL DEFAULT false,
  draft_only BOOLEAN NOT NULL DEFAULT true,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approval_threshold NUMERIC(15,2),
  settlement_frequency TEXT DEFAULT 'monthly' CHECK (settlement_frequency IN ('daily','weekly','monthly','quarterly','manual')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_company_id, target_company_id)
);

ALTER TABLE public.ic_company_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_rel_select" ON public.ic_company_relationships FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_rel_insert" ON public.ic_company_relationships FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_rel_update" ON public.ic_company_relationships FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_rel_delete" ON public.ic_company_relationships FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_rel_updated_at BEFORE UPDATE ON public.ic_company_relationships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BP Mappings
CREATE TABLE public.ic_bp_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  source_bp_id UUID REFERENCES public.business_partners(id),
  source_bp_code TEXT NOT NULL,
  source_bp_name TEXT,
  target_bp_code TEXT NOT NULL,
  target_bp_name TEXT,
  mapping_type TEXT DEFAULT 'customer_to_vendor' CHECK (mapping_type IN ('customer_to_vendor','vendor_to_customer','both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_bp_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_bp_select" ON public.ic_bp_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_bp_insert" ON public.ic_bp_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_bp_update" ON public.ic_bp_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_bp_delete" ON public.ic_bp_mappings FOR DELETE TO authenticated USING (true);

-- Item Mappings
CREATE TABLE public.ic_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  source_item_code TEXT NOT NULL,
  source_item_name TEXT,
  target_item_code TEXT NOT NULL,
  target_item_name TEXT,
  source_uom TEXT,
  target_uom TEXT,
  uom_conversion_factor NUMERIC(10,4) DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_item_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_item_select" ON public.ic_item_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_item_insert" ON public.ic_item_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_item_update" ON public.ic_item_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_item_delete" ON public.ic_item_mappings FOR DELETE TO authenticated USING (true);

-- Account Mappings
CREATE TABLE public.ic_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  source_account_code TEXT NOT NULL,
  source_account_name TEXT,
  target_account_code TEXT NOT NULL,
  target_account_name TEXT,
  account_purpose TEXT DEFAULT 'general' CHECK (account_purpose IN ('general','revenue','expense','inventory','cogs','clearing','due_to','due_from','tax','variance')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_account_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_acct_select" ON public.ic_account_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_acct_insert" ON public.ic_account_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_acct_update" ON public.ic_account_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_acct_delete" ON public.ic_account_mappings FOR DELETE TO authenticated USING (true);

-- Tax Mappings
CREATE TABLE public.ic_tax_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  source_tax_code TEXT NOT NULL,
  source_tax_name TEXT,
  target_tax_code TEXT NOT NULL,
  target_tax_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_tax_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_tax_select" ON public.ic_tax_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_tax_insert" ON public.ic_tax_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_tax_update" ON public.ic_tax_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_tax_delete" ON public.ic_tax_mappings FOR DELETE TO authenticated USING (true);

-- Warehouse Mappings
CREATE TABLE public.ic_warehouse_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  source_warehouse_code TEXT NOT NULL,
  source_warehouse_name TEXT,
  target_warehouse_code TEXT NOT NULL,
  target_warehouse_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_warehouse_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_wh_select" ON public.ic_warehouse_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_wh_insert" ON public.ic_warehouse_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_wh_update" ON public.ic_warehouse_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_wh_delete" ON public.ic_warehouse_mappings FOR DELETE TO authenticated USING (true);

-- Transfer Pricing Rules
CREATE TABLE public.ic_transfer_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  pricing_method TEXT NOT NULL DEFAULT 'cost_plus' CHECK (pricing_method IN ('cost_plus','fixed_markup','fixed_price','price_list','last_purchase','standard_cost','moving_average')),
  markup_percent NUMERIC(5,2) DEFAULT 0,
  fixed_price NUMERIC(15,2),
  price_list_name TEXT,
  scope_type TEXT DEFAULT 'all' CHECK (scope_type IN ('all','item','item_group','warehouse','project','transaction_type')),
  scope_value TEXT,
  effective_from DATE,
  effective_to DATE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_transfer_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_tp_select" ON public.ic_transfer_pricing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_tp_insert" ON public.ic_transfer_pricing_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_tp_update" ON public.ic_transfer_pricing_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_tp_delete" ON public.ic_transfer_pricing_rules FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_tp_updated_at BEFORE UPDATE ON public.ic_transfer_pricing_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mirror Rules
CREATE TABLE public.ic_mirror_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  source_doc_type TEXT NOT NULL,
  target_doc_type TEXT NOT NULL,
  mirror_timing TEXT NOT NULL DEFAULT 'on_post' CHECK (mirror_timing IN ('on_save','on_post','on_approval','manual')),
  auto_create BOOLEAN NOT NULL DEFAULT false,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  copy_remarks BOOLEAN DEFAULT true,
  copy_attachments BOOLEAN DEFAULT false,
  copy_dimensions BOOLEAN DEFAULT true,
  apply_transfer_pricing BOOLEAN DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_mirror_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_mirror_select" ON public.ic_mirror_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_mirror_insert" ON public.ic_mirror_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_mirror_update" ON public.ic_mirror_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_mirror_delete" ON public.ic_mirror_rules FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_mirror_updated_at BEFORE UPDATE ON public.ic_mirror_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IC Transactions (main log)
CREATE TABLE public.ic_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id),
  mirror_rule_id UUID REFERENCES public.ic_mirror_rules(id),
  transaction_number TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale_purchase','stock_transfer','service_recharge','expense_recharge','down_payment','credit_memo','return','settlement','cancellation')),
  source_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  source_doc_type TEXT NOT NULL,
  source_doc_id TEXT,
  source_doc_number TEXT,
  target_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  target_doc_type TEXT,
  target_doc_id TEXT,
  target_doc_number TEXT,
  source_posting_status TEXT DEFAULT 'pending' CHECK (source_posting_status IN ('pending','posted','failed','reversed')),
  target_posting_status TEXT DEFAULT 'pending' CHECK (target_posting_status IN ('pending','draft','posted','failed','reversed')),
  mirror_status TEXT DEFAULT 'pending' CHECK (mirror_status IN ('pending','processing','completed','failed','cancelled','reversed')),
  source_je_id TEXT,
  target_je_id TEXT,
  source_currency TEXT DEFAULT 'SAR',
  target_currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC(15,6) DEFAULT 1,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  transfer_price_total NUMERIC(15,2) DEFAULT 0,
  markup_amount NUMERIC(15,2) DEFAULT 0,
  pricing_rule_id UUID REFERENCES public.ic_transfer_pricing_rules(id),
  elimination_tag TEXT,
  is_eliminated BOOLEAN DEFAULT false,
  initiated_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_txn_select" ON public.ic_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_txn_insert" ON public.ic_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_txn_update" ON public.ic_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_txn_delete" ON public.ic_transactions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_txn_updated_at BEFORE UPDATE ON public.ic_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS ic_transaction_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ic_transaction_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    NEW.transaction_number := 'IC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('ic_transaction_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ic_txn_number BEFORE INSERT ON public.ic_transactions
FOR EACH ROW EXECUTE FUNCTION public.generate_ic_transaction_number();

-- IC Transaction Lines
CREATE TABLE public.ic_transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.ic_transactions(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL DEFAULT 1,
  source_item_code TEXT,
  source_item_name TEXT,
  target_item_code TEXT,
  target_item_name TEXT,
  source_warehouse TEXT,
  target_warehouse TEXT,
  quantity NUMERIC(15,4) DEFAULT 0,
  source_unit_price NUMERIC(15,4) DEFAULT 0,
  transfer_price NUMERIC(15,4) DEFAULT 0,
  markup_amount NUMERIC(15,2) DEFAULT 0,
  line_total NUMERIC(15,2) DEFAULT 0,
  tax_code TEXT,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  source_account TEXT,
  target_account TEXT,
  dimension_1 TEXT,
  dimension_2 TEXT,
  dimension_3 TEXT,
  dimension_4 TEXT,
  project_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_transaction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_txn_lines_select" ON public.ic_transaction_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_txn_lines_insert" ON public.ic_transaction_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_txn_lines_update" ON public.ic_transaction_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_txn_lines_delete" ON public.ic_transaction_lines FOR DELETE TO authenticated USING (true);

-- Settlements
CREATE TABLE public.ic_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.ic_company_relationships(id),
  settlement_number TEXT NOT NULL,
  settlement_type TEXT NOT NULL DEFAULT 'netting' CHECK (settlement_type IN ('netting','payment','clearing','manual')),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_from DATE,
  period_to DATE,
  source_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  target_company_id UUID NOT NULL REFERENCES public.sap_companies(id),
  due_to_amount NUMERIC(15,2) DEFAULT 0,
  due_from_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) DEFAULT 0,
  settlement_currency TEXT DEFAULT 'SAR',
  exchange_rate NUMERIC(15,6) DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','posted','cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  posted_je_id TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_settle_select" ON public.ic_settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_settle_insert" ON public.ic_settlements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_settle_update" ON public.ic_settlements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_settle_delete" ON public.ic_settlements FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_settle_updated_at BEFORE UPDATE ON public.ic_settlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS ic_settlement_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ic_settlement_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.settlement_number IS NULL OR NEW.settlement_number = '' THEN
    NEW.settlement_number := 'ICS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('ic_settlement_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ic_settle_number BEFORE INSERT ON public.ic_settlements
FOR EACH ROW EXECUTE FUNCTION public.generate_ic_settlement_number();

-- Settlement Items
CREATE TABLE public.ic_settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.ic_settlements(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.ic_transactions(id),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  direction TEXT NOT NULL CHECK (direction IN ('due_to','due_from')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_settlement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_si_select" ON public.ic_settlement_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_si_insert" ON public.ic_settlement_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_si_update" ON public.ic_settlement_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_si_delete" ON public.ic_settlement_items FOR DELETE TO authenticated USING (true);

-- Exceptions
CREATE TABLE public.ic_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.sap_companies(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.ic_transactions(id),
  relationship_id UUID REFERENCES public.ic_company_relationships(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('mapping_error','tax_error','account_error','currency_error','period_error','posting_error','approval_error','validation_error','system_error')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  description TEXT,
  error_details JSONB,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored','auto_resolved')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ic_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_exc_select" ON public.ic_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_exc_insert" ON public.ic_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ic_exc_update" ON public.ic_exceptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_exc_delete" ON public.ic_exceptions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ic_exc_updated_at BEFORE UPDATE ON public.ic_exceptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ic_rel_source ON public.ic_company_relationships(source_company_id);
CREATE INDEX idx_ic_rel_target ON public.ic_company_relationships(target_company_id);
CREATE INDEX idx_ic_txn_relationship ON public.ic_transactions(relationship_id);
CREATE INDEX idx_ic_txn_status ON public.ic_transactions(mirror_status);
CREATE INDEX idx_ic_txn_source ON public.ic_transactions(source_company_id);
CREATE INDEX idx_ic_txn_target ON public.ic_transactions(target_company_id);
CREATE INDEX idx_ic_exc_status ON public.ic_exceptions(status);
CREATE INDEX idx_ic_settle_status ON public.ic_settlements(status);
