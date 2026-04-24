
-- Idea 173: POS Repair and Service Intake
CREATE TABLE public.pos_repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  item_code TEXT,
  item_description TEXT NOT NULL,
  serial_number TEXT,
  issue_description TEXT NOT NULL,
  issue_category TEXT DEFAULT 'general',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  repair_status TEXT DEFAULT 'received' CHECK (repair_status IN ('received','diagnosing','waiting_approval','approved','in_repair','completed','delivered','cancelled')),
  technician_id TEXT,
  technician_notes TEXT,
  customer_approved BOOLEAN DEFAULT false,
  customer_approved_at TIMESTAMPTZ,
  warranty_covered BOOLEAN DEFAULT false,
  warranty_reference TEXT,
  invoice_id UUID,
  estimated_completion DATE,
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_repair_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_pos_repair_number() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.repair_number IS NULL OR NEW.repair_number = '' THEN
    NEW.repair_number := 'RPR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_repair_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_repair_number BEFORE INSERT ON public.pos_repair_orders FOR EACH ROW EXECUTE FUNCTION public.generate_pos_repair_number();

CREATE TABLE public.pos_repair_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES public.pos_repair_orders(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_repair_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_repair_orders" ON public.pos_repair_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_repair_log" ON public.pos_repair_status_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Idea 174: Electronic Shelf Label Integration
CREATE TABLE public.pos_shelf_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  item_code TEXT NOT NULL,
  item_description TEXT,
  system_price NUMERIC DEFAULT 0,
  label_price NUMERIC DEFAULT 0,
  label_device_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','error','offline')),
  last_synced_at TIMESTAMPTZ,
  discrepancy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_shelf_label_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  item_code TEXT NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  change_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','applied','failed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_shelf_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shelf_label_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_shelf_labels" ON public.pos_shelf_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_shelf_queue" ON public.pos_shelf_label_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Idea 175: Abandoned Cart / Quote Recovery
CREATE TABLE public.pos_abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  cart_items JSONB DEFAULT '[]',
  cart_total NUMERIC DEFAULT 0,
  cart_type TEXT DEFAULT 'basket' CHECK (cart_type IN ('basket','quotation','draft_order')),
  recovery_status TEXT DEFAULT 'abandoned' CHECK (recovery_status IN ('abandoned','contacted','follow_up','recovered','expired','declined')),
  abandonment_reason TEXT,
  cashier_id UUID,
  cashier_name TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  recovered_order_id UUID,
  recovered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_abandoned_carts" ON public.pos_abandoned_carts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Idea 176: Store Operations Task Board
CREATE TABLE public.pos_store_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_type TEXT DEFAULT 'checklist' CHECK (task_type IN ('checklist','price_check','display_audit','cash_check','replenishment','queue_management','handover','custom')),
  checklist_category TEXT DEFAULT 'opening' CHECK (checklist_category IN ('opening','midday','closing','ad_hoc')),
  assigned_role TEXT,
  assigned_to UUID,
  assigned_name TEXT,
  shift TEXT DEFAULT 'morning' CHECK (shift IN ('morning','afternoon','evening','night')),
  priority TEXT DEFAULT 'medium',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  due_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_store_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_store_tasks" ON public.pos_store_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Idea 177: Branch Transfer Selling Assist
CREATE TABLE public.pos_branch_transfer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  source_branch_id UUID REFERENCES public.branches(id),
  destination_branch_id UUID REFERENCES public.branches(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_collected BOOLEAN DEFAULT false,
  transfer_status TEXT DEFAULT 'requested' CHECK (transfer_status IN ('requested','approved','in_transit','received','ready_pickup','picked_up','cancelled')),
  expected_arrival DATE,
  actual_arrival DATE,
  pickup_confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_branch_transfer_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_pos_branch_transfer_number() RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    NEW.transfer_number := 'BTS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_branch_transfer_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_branch_transfer_number BEFORE INSERT ON public.pos_branch_transfer_orders FOR EACH ROW EXECUTE FUNCTION public.generate_pos_branch_transfer_number();

ALTER TABLE public.pos_branch_transfer_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_branch_transfers" ON public.pos_branch_transfer_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Idea 178: Customer Feedback at Checkout
CREATE TABLE public.pos_customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  transaction_id TEXT,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_type TEXT DEFAULT 'general' CHECK (feedback_type IN ('general','service','product','speed','cleanliness','staff','other')),
  feedback_text TEXT,
  reason_tags TEXT[] DEFAULT '{}',
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative')),
  cashier_id UUID,
  cashier_name TEXT,
  is_escalated BOOLEAN DEFAULT false,
  escalation_notes TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_customer_feedback" ON public.pos_customer_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);
