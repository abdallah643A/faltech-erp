
-- =============================================
-- PROCUREMENT MANAGEMENT SYSTEM
-- SAP B1 Compatible Document Structure
-- =============================================

-- Purchase Requests (created from approved Material Requests)
CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number TEXT NOT NULL UNIQUE,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partially_ordered', 'fully_ordered', 'closed', 'cancelled')),
  requester_id UUID REFERENCES auth.users(id),
  requester_name TEXT,
  department TEXT,
  project_id UUID REFERENCES public.projects(id),
  material_request_id UUID REFERENCES public.material_requests(id),
  branch_id UUID REFERENCES public.branches(id),
  remarks TEXT,
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_request_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  warehouse TEXT,
  required_date DATE,
  vendor_code TEXT,
  vendor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Quotations (vendor quotes)
CREATE TABLE public.purchase_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pq_number TEXT NOT NULL UNIQUE,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'accepted', 'rejected', 'closed', 'cancelled')),
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id),
  purchase_request_id UUID REFERENCES public.purchase_requests(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  contact_person TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  remarks TEXT,
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_quotation_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_quotation_id UUID NOT NULL REFERENCES public.purchase_quotations(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  discount_percent NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 0,
  warehouse TEXT,
  vendor_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Orders (with amount-based approval)
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'partially_delivered', 'fully_delivered', 'closed', 'cancelled')),
  approval_status TEXT DEFAULT 'none' CHECK (approval_status IN ('none', 'pending', 'approved', 'rejected')),
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id),
  purchase_request_id UUID REFERENCES public.purchase_requests(id),
  purchase_quotation_id UUID REFERENCES public.purchase_quotations(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  contact_person TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_terms TEXT,
  shipping_address TEXT,
  remarks TEXT,
  -- Approval fields
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_reason TEXT,
  -- SAP fields
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  discount_percent NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 0,
  warehouse TEXT,
  received_quantity NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PO Approval Thresholds (amount-based)
CREATE TABLE public.po_approval_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  required_role app_role NOT NULL,
  approval_level INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default thresholds
INSERT INTO public.po_approval_thresholds (min_amount, max_amount, required_role, approval_level) VALUES
  (0, 10000, 'manager', 1),
  (10000, 50000, 'manager', 2),
  (50000, NULL, 'admin', 3);

-- Goods Receipt PO
CREATE TABLE public.goods_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grpo_number TEXT NOT NULL UNIQUE,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  project_id UUID REFERENCES public.projects(id),
  branch_id UUID REFERENCES public.branches(id),
  warehouse TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  remarks TEXT,
  received_by UUID REFERENCES auth.users(id),
  received_by_name TEXT,
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goods_receipt_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  ordered_quantity NUMERIC DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'EA',
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (received_quantity * unit_price) STORED,
  warehouse TEXT,
  batch_number TEXT,
  serial_numbers TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto number sequences
CREATE SEQUENCE IF NOT EXISTS pr_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pq_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS grpo_number_seq START 1;

-- Enable RLS on all tables
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Branch-based access (same pattern as existing tables)
-- Purchase Requests
CREATE POLICY "Users can view purchase requests in their branches" ON public.purchase_requests
  FOR SELECT TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Users can create purchase requests" ON public.purchase_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update purchase requests in their branches" ON public.purchase_requests
  FOR UPDATE TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Admins can delete purchase requests" ON public.purchase_requests
  FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Purchase Request Lines (inherit from parent)
CREATE POLICY "Users can view PR lines" ON public.purchase_request_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage PR lines" ON public.purchase_request_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update PR lines" ON public.purchase_request_lines
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete PR lines" ON public.purchase_request_lines
  FOR DELETE TO authenticated USING (true);

-- Purchase Quotations
CREATE POLICY "Users can view purchase quotations in their branches" ON public.purchase_quotations
  FOR SELECT TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Users can create purchase quotations" ON public.purchase_quotations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update purchase quotations" ON public.purchase_quotations
  FOR UPDATE TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Admins can delete purchase quotations" ON public.purchase_quotations
  FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Purchase Quotation Lines
CREATE POLICY "Users can view PQ lines" ON public.purchase_quotation_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage PQ lines" ON public.purchase_quotation_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update PQ lines" ON public.purchase_quotation_lines
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete PQ lines" ON public.purchase_quotation_lines
  FOR DELETE TO authenticated USING (true);

-- Purchase Orders
CREATE POLICY "Users can view purchase orders in their branches" ON public.purchase_orders
  FOR SELECT TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Users can create purchase orders" ON public.purchase_orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Admins can delete purchase orders" ON public.purchase_orders
  FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Purchase Order Lines
CREATE POLICY "Users can view PO lines" ON public.purchase_order_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage PO lines" ON public.purchase_order_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update PO lines" ON public.purchase_order_lines
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete PO lines" ON public.purchase_order_lines
  FOR DELETE TO authenticated USING (true);

-- PO Approval Thresholds
CREATE POLICY "Anyone can view thresholds" ON public.po_approval_thresholds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage thresholds" ON public.po_approval_thresholds
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Goods Receipts
CREATE POLICY "Users can view goods receipts in their branches" ON public.goods_receipts
  FOR SELECT TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Users can create goods receipts" ON public.goods_receipts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update goods receipts" ON public.goods_receipts
  FOR UPDATE TO authenticated USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Admins can delete goods receipts" ON public.goods_receipts
  FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Goods Receipt Lines
CREATE POLICY "Users can view GRPO lines" ON public.goods_receipt_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage GRPO lines" ON public.goods_receipt_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update GRPO lines" ON public.goods_receipt_lines
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete GRPO lines" ON public.goods_receipt_lines
  FOR DELETE TO authenticated USING (true);

-- Updated_at triggers
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_quotations_updated_at BEFORE UPDATE ON public.purchase_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_po_approval_thresholds_updated_at BEFORE UPDATE ON public.po_approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Auto-create Purchase Request from approved Material Request
CREATE OR REPLACE FUNCTION public.create_pr_from_approved_mr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pr_id UUID;
  v_pr_number TEXT;
  v_project_id UUID;
  v_branch_id UUID;
  v_mr_line RECORD;
  v_line_num INT := 1;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    v_pr_number := 'PR-' || LPAD(nextval('pr_number_seq')::TEXT, 6, '0');
    
    -- Try to find project_id from finance_alerts matching project_name
    SELECT fa.project_id, so.branch_id INTO v_project_id, v_branch_id
    FROM finance_alerts fa
    JOIN sales_orders so ON so.id = fa.sales_order_id
    WHERE fa.alert_type = 'procurement_start'
      AND so.customer_name = NEW.project_name
    LIMIT 1;

    -- If no match, use the MR's branch
    IF v_branch_id IS NULL THEN
      v_branch_id := NEW.branch_id;
    END IF;

    INSERT INTO purchase_requests (
      pr_number, doc_date, required_date, status,
      requester_id, requester_name, department,
      project_id, material_request_id, branch_id,
      remarks, created_by
    ) VALUES (
      v_pr_number, CURRENT_DATE, NEW.required_date, 'open',
      NEW.requested_by_id, NEW.requested_by_name, NEW.department,
      v_project_id, NEW.id, v_branch_id,
      'Auto-created from Material Request ' || NEW.mr_number,
      NEW.approved_by_3_id
    ) RETURNING id INTO v_pr_id;

    -- Copy MR lines to PR lines
    FOR v_mr_line IN
      SELECT * FROM material_request_lines WHERE material_request_id = NEW.id ORDER BY line_number
    LOOP
      INSERT INTO purchase_request_lines (
        purchase_request_id, line_num, item_code, item_description,
        quantity, unit, unit_price, notes
      ) VALUES (
        v_pr_id, v_line_num, v_mr_line.item_code, v_mr_line.description,
        v_mr_line.quantity, v_mr_line.unit, COALESCE(v_mr_line.estimated_price, 0),
        v_mr_line.notes
      );
      v_line_num := v_line_num + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-create PR
CREATE TRIGGER create_pr_on_mr_approval
  AFTER UPDATE ON public.material_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_pr_from_approved_mr();
