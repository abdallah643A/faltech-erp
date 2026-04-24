
-- =============================================
-- POS Module 166: Subscription & Membership Billing
-- =============================================
CREATE TABLE public.pos_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  plan_name TEXT NOT NULL,
  plan_name_ar TEXT,
  description TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  features JSONB DEFAULT '[]'::jsonb,
  usage_entitlements JSONB DEFAULT '{}'::jsonb,
  auto_renew BOOLEAN DEFAULT true,
  grace_period_days INTEGER DEFAULT 7,
  suspension_after_days INTEGER DEFAULT 14,
  cancellation_notice_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  plan_id UUID REFERENCES public.pos_subscription_plans(id),
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  membership_number TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT DEFAULT 'manual',
  last_payment_date DATE,
  last_payment_amount NUMERIC,
  total_paid NUMERIC DEFAULT 0,
  suspension_date DATE,
  suspension_reason TEXT,
  cancellation_date DATE,
  cancellation_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_membership_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_membership_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.membership_number IS NULL OR NEW.membership_number = '' THEN
    NEW.membership_number := 'MEM-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_membership_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_membership_number BEFORE INSERT ON public.pos_memberships
FOR EACH ROW EXECUTE FUNCTION public.generate_membership_number();

CREATE TABLE public.pos_membership_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES public.pos_memberships(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  payment_reference TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- POS Module 167: Smart Receipt Personalization
-- =============================================
CREATE TABLE public.pos_receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  template_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  header_logo_url TEXT,
  header_text TEXT,
  header_text_ar TEXT,
  footer_text TEXT,
  footer_text_ar TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your purchase!',
  thank_you_message_ar TEXT DEFAULT 'شكراً لتسوقكم معنا!',
  show_loyalty_summary BOOLEAN DEFAULT true,
  show_next_offer BOOLEAN DEFAULT true,
  show_feedback_qr BOOLEAN DEFAULT true,
  show_warranty_info BOOLEAN DEFAULT true,
  show_return_policy BOOLEAN DEFAULT true,
  return_policy_text TEXT,
  return_policy_text_ar TEXT,
  feedback_url TEXT,
  layout_config JSONB DEFAULT '{}'::jsonb,
  paper_size TEXT DEFAULT '80mm',
  is_bilingual BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- POS Module 168: Sales Target Tracker
-- =============================================
CREATE TABLE public.pos_sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_user_id UUID,
  target_type TEXT NOT NULL DEFAULT 'branch',
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_target NUMERIC DEFAULT 0,
  margin_target NUMERIC DEFAULT 0,
  basket_size_target NUMERIC DEFAULT 0,
  units_per_transaction_target NUMERIC DEFAULT 0,
  transaction_count_target INTEGER DEFAULT 0,
  loyalty_signup_target INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_sales_target_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES public.pos_sales_targets(id) ON DELETE CASCADE NOT NULL,
  progress_date DATE NOT NULL,
  actual_sales NUMERIC DEFAULT 0,
  actual_margin NUMERIC DEFAULT 0,
  actual_basket_size NUMERIC DEFAULT 0,
  actual_units_per_transaction NUMERIC DEFAULT 0,
  actual_transaction_count INTEGER DEFAULT 0,
  actual_loyalty_signups INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- POS Module 169: Inventory Reservation for Quotes
-- =============================================
CREATE TABLE public.pos_inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  reservation_number TEXT,
  source_type TEXT NOT NULL DEFAULT 'quotation',
  source_id UUID,
  source_doc_number TEXT,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT,
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  item_description TEXT,
  warehouse_code TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  reserved_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active',
  converted_to_sale BOOLEAN DEFAULT false,
  sale_doc_id UUID,
  released_at TIMESTAMPTZ,
  released_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_reservation_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_pos_reservation_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
    NEW.reservation_number := 'RSV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_reservation_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_number BEFORE INSERT ON public.pos_inventory_reservations
FOR EACH ROW EXECUTE FUNCTION public.generate_pos_reservation_number();

-- =============================================
-- POS Module 170: Layaway & Installment Sales
-- =============================================
CREATE TABLE public.pos_layaway_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  layaway_number TEXT,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  remaining_amount NUMERIC DEFAULT 0,
  installment_count INTEGER DEFAULT 1,
  installment_amount NUMERIC DEFAULT 0,
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending_deposit',
  release_conditions TEXT,
  cancellation_policy TEXT,
  cancellation_fee_percent NUMERIC DEFAULT 10,
  overdue_days INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  sale_doc_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pos_layaway_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_layaway_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.layaway_number IS NULL OR NEW.layaway_number = '' THEN
    NEW.layaway_number := 'LAY-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('pos_layaway_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_layaway_number BEFORE INSERT ON public.pos_layaway_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_layaway_number();

CREATE TABLE public.pos_layaway_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layaway_id UUID REFERENCES public.pos_layaway_orders(id) ON DELETE CASCADE NOT NULL,
  payment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  status TEXT DEFAULT 'pending',
  late_fee NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- POS Module 171: Digital Signature & OTP
-- =============================================
CREATE TABLE public.pos_digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  transaction_type TEXT NOT NULL,
  transaction_id UUID,
  transaction_reference TEXT,
  verification_method TEXT NOT NULL DEFAULT 'signature',
  signature_data TEXT,
  signature_image_url TEXT,
  otp_code TEXT,
  otp_sent_to TEXT,
  otp_sent_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  otp_attempts INTEGER DEFAULT 0,
  signer_name TEXT,
  signer_role TEXT,
  signer_id TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  device_info TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- POS Module 172: Advanced Cashier Permissions
-- =============================================
CREATE TABLE public.pos_cashier_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  role_name TEXT NOT NULL,
  role_name_ar TEXT,
  description TEXT,
  can_refund BOOLEAN DEFAULT false,
  refund_limit NUMERIC,
  can_void BOOLEAN DEFAULT false,
  void_limit NUMERIC,
  can_discount BOOLEAN DEFAULT false,
  max_discount_percent NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,
  can_price_override BOOLEAN DEFAULT false,
  price_override_limit_percent NUMERIC DEFAULT 0,
  can_open_drawer BOOLEAN DEFAULT false,
  can_delete_draft BOOLEAN DEFAULT false,
  can_approve_return BOOLEAN DEFAULT false,
  return_limit NUMERIC,
  can_close_shift BOOLEAN DEFAULT true,
  can_reopen_shift BOOLEAN DEFAULT false,
  can_credit_sale BOOLEAN DEFAULT false,
  credit_limit NUMERIC,
  requires_manager_approval_above NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pos_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  cashier_user_id UUID NOT NULL,
  permission_role_id UUID REFERENCES public.pos_cashier_permissions(id),
  override_type TEXT NOT NULL,
  override_value JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_membership_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales_target_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_layaway_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_layaway_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_cashier_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_permission_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "auth_select" ON public.pos_subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_subscription_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_memberships FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_membership_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_membership_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_receipt_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_receipt_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_sales_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_sales_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_sales_target_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_sales_target_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_inventory_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_inventory_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_layaway_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_layaway_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_layaway_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_layaway_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_digital_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_digital_signatures FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_cashier_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_cashier_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_select" ON public.pos_permission_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON public.pos_permission_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Timestamps triggers
CREATE TRIGGER update_pos_subscription_plans_updated_at BEFORE UPDATE ON public.pos_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_memberships_updated_at BEFORE UPDATE ON public.pos_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_receipt_templates_updated_at BEFORE UPDATE ON public.pos_receipt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_sales_targets_updated_at BEFORE UPDATE ON public.pos_sales_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_inventory_reservations_updated_at BEFORE UPDATE ON public.pos_inventory_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_layaway_orders_updated_at BEFORE UPDATE ON public.pos_layaway_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_cashier_permissions_updated_at BEFORE UPDATE ON public.pos_cashier_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
