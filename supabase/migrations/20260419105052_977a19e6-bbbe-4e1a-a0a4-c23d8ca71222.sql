
-- 1. Base-doc traceability
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS pr_id uuid,
  ADD COLUMN IF NOT EXISTS rfq_id uuid,
  ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'pending';

ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS base_line_id uuid,
  ADD COLUMN IF NOT EXISTS pr_line_id uuid;

ALTER TABLE public.goods_receipts
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS po_id uuid,
  ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'pending';

ALTER TABLE public.goods_receipt_lines
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS base_line_id uuid,
  ADD COLUMN IF NOT EXISTS po_line_id uuid;

ALTER TABLE public.ap_invoices
  ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS match_exception_id uuid,
  ADD COLUMN IF NOT EXISTS three_way_match_override_id uuid;

ALTER TABLE public.ap_invoice_lines
  ADD COLUMN IF NOT EXISTS po_line_id uuid,
  ADD COLUMN IF NOT EXISTS grpo_line_id uuid;

CREATE INDEX IF NOT EXISTS idx_po_base ON public.purchase_orders(base_doc_type, base_doc_id);
CREATE INDEX IF NOT EXISTS idx_grpo_po ON public.goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_apinv_match ON public.ap_invoices(match_status);

-- 2. Approval thresholds (per doc / cost-center / vendor-category)
CREATE TABLE IF NOT EXISTS public.procurement_approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  doc_type text NOT NULL,
  cost_center_code text,
  vendor_category text,
  min_amount numeric NOT NULL DEFAULT 0,
  max_amount numeric,
  approver_roles text[] NOT NULL DEFAULT '{}',
  approval_level integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.procurement_approval_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view procurement thresholds"
  ON public.procurement_approval_thresholds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage procurement thresholds"
  ON public.procurement_approval_thresholds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Match exceptions
CREATE TABLE IF NOT EXISTS public.match_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  ap_invoice_id uuid,
  po_id uuid,
  grpo_id uuid,
  exception_type text NOT NULL CHECK (exception_type IN ('qty_variance','price_variance','timing','missing_grpo','missing_po','dispute','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  variance_amount numeric,
  variance_percent numeric,
  expected_value numeric,
  actual_value numeric,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','overridden','resolved','rejected')),
  override_request_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text
);
ALTER TABLE public.match_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view match exceptions" ON public.match_exceptions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage match exceptions" ON public.match_exceptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_me_invoice ON public.match_exceptions(ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_me_status ON public.match_exceptions(status);

-- 4. Match override requests
CREATE TABLE IF NOT EXISTS public.match_override_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  ap_invoice_id uuid NOT NULL,
  exception_id uuid REFERENCES public.match_exceptions(id),
  reason text NOT NULL,
  requested_by uuid,
  requested_by_name text,
  requested_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approver_role text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text
);
ALTER TABLE public.match_override_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view match overrides" ON public.match_override_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage match overrides" ON public.match_override_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Supplier onboarding
CREATE TABLE IF NOT EXISTS public.supplier_onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  category text NOT NULL,
  question_en text NOT NULL,
  question_ar text,
  answer_type text NOT NULL DEFAULT 'text' CHECK (answer_type IN ('text','number','boolean','select','multiselect','file')),
  options jsonb,
  weight numeric DEFAULT 1,
  scoring_rule jsonb,
  is_required boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.supplier_onboarding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view onboarding questions" ON public.supplier_onboarding_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage onboarding questions" ON public.supplier_onboarding_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.supplier_onboarding_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  vendor_id uuid REFERENCES public.business_partners(id),
  legal_name text NOT NULL,
  trade_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  category text,
  country text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','active')),
  current_step integer DEFAULT 1,
  total_steps integer DEFAULT 4,
  answers jsonb DEFAULT '{}'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  qualification_score numeric,
  reviewer_id uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.supplier_onboarding_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view onboarding apps" ON public.supplier_onboarding_applications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage onboarding apps" ON public.supplier_onboarding_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Supplier KPI snapshots
CREATE TABLE IF NOT EXISTS public.supplier_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  vendor_id uuid REFERENCES public.business_partners(id),
  vendor_code text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_pos integer DEFAULT 0,
  total_grpos integer DEFAULT 0,
  on_time_grpos integer DEFAULT 0,
  late_grpos integer DEFAULT 0,
  on_time_pct numeric DEFAULT 0,
  qty_variance_pct numeric DEFAULT 0,
  price_variance_pct numeric DEFAULT 0,
  defect_count integer DEFAULT 0,
  total_spend numeric DEFAULT 0,
  match_exception_count integer DEFAULT 0,
  overall_score numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now()
);
ALTER TABLE public.supplier_kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view supplier kpi snapshots" ON public.supplier_kpi_snapshots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert supplier kpi snapshots" ON public.supplier_kpi_snapshots
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_supkpi_vendor_period ON public.supplier_kpi_snapshots(vendor_id, period_end);

-- 7. Three-way match enforcement function
CREATE OR REPLACE FUNCTION public.tg_ap_invoice_three_way_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty_tol numeric := 0.05;   -- 5% tolerance
  v_price_tol numeric := 0.02; -- 2% tolerance
  v_override_status text;
  v_po_total numeric;
  v_grpo_total numeric;
  v_inv_total numeric;
  v_qty_var numeric;
  v_price_var numeric;
  v_exception_id uuid;
BEGIN
  IF NEW.status NOT IN ('posted','approved') THEN
    RETURN NEW;
  END IF;

  -- if override is approved, skip enforcement
  IF NEW.three_way_match_override_id IS NOT NULL THEN
    SELECT status INTO v_override_status FROM public.match_override_requests WHERE id = NEW.three_way_match_override_id;
    IF v_override_status = 'approved' THEN
      NEW.match_status := 'overridden';
      RETURN NEW;
    END IF;
  END IF;

  -- if no PO link, skip (direct invoice)
  IF NEW.purchase_order_id IS NULL THEN
    NEW.match_status := 'no_po';
    RETURN NEW;
  END IF;

  v_inv_total := COALESCE(NEW.total, 0);
  SELECT COALESCE(total, 0) INTO v_po_total FROM public.purchase_orders WHERE id = NEW.purchase_order_id;
  SELECT COALESCE(SUM(total), 0) INTO v_grpo_total FROM public.goods_receipts WHERE po_id = NEW.purchase_order_id;

  -- Variance checks
  IF v_po_total > 0 THEN
    v_price_var := ABS(v_inv_total - v_po_total) / v_po_total;
  ELSE
    v_price_var := 0;
  END IF;

  IF v_grpo_total > 0 THEN
    v_qty_var := ABS(v_inv_total - v_grpo_total) / v_grpo_total;
  ELSE
    v_qty_var := 0;
  END IF;

  IF v_grpo_total = 0 THEN
    INSERT INTO public.match_exceptions (
      company_id, ap_invoice_id, po_id, exception_type, severity, reason,
      expected_value, actual_value, created_by
    ) VALUES (
      NEW.company_id, NEW.id, NEW.purchase_order_id, 'missing_grpo', 'high',
      'AP invoice posted without any matching goods receipt for PO',
      v_po_total, v_inv_total, auth.uid()
    ) RETURNING id INTO v_exception_id;
    NEW.match_status := 'exception';
    NEW.match_exception_id := v_exception_id;
    RAISE EXCEPTION 'THREE_WAY_MATCH_FAILED: no GRPO found for PO. Exception % logged. Request override to post.', v_exception_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_price_var > v_price_tol THEN
    INSERT INTO public.match_exceptions (
      company_id, ap_invoice_id, po_id, exception_type, severity,
      variance_amount, variance_percent, expected_value, actual_value, reason, created_by
    ) VALUES (
      NEW.company_id, NEW.id, NEW.purchase_order_id, 'price_variance',
      CASE WHEN v_price_var > 0.10 THEN 'critical' WHEN v_price_var > 0.05 THEN 'high' ELSE 'medium' END,
      v_inv_total - v_po_total, v_price_var * 100, v_po_total, v_inv_total,
      'Invoice total exceeds PO total beyond ' || (v_price_tol * 100)::text || '% tolerance',
      auth.uid()
    ) RETURNING id INTO v_exception_id;
    NEW.match_status := 'exception';
    NEW.match_exception_id := v_exception_id;
    RAISE EXCEPTION 'THREE_WAY_MATCH_FAILED: price variance %.2f%% exceeds tolerance. Exception % logged. Request override to post.',
      v_price_var * 100, v_exception_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_qty_var > v_qty_tol THEN
    INSERT INTO public.match_exceptions (
      company_id, ap_invoice_id, po_id, exception_type, severity,
      variance_amount, variance_percent, expected_value, actual_value, reason, created_by
    ) VALUES (
      NEW.company_id, NEW.id, NEW.purchase_order_id, 'qty_variance',
      CASE WHEN v_qty_var > 0.10 THEN 'high' ELSE 'medium' END,
      v_inv_total - v_grpo_total, v_qty_var * 100, v_grpo_total, v_inv_total,
      'Invoice total deviates from GRPO total beyond ' || (v_qty_tol * 100)::text || '% tolerance',
      auth.uid()
    ) RETURNING id INTO v_exception_id;
    NEW.match_status := 'exception';
    NEW.match_exception_id := v_exception_id;
    RAISE EXCEPTION 'THREE_WAY_MATCH_FAILED: qty/value variance %.2f%% vs GRPO. Exception % logged. Request override to post.',
      v_qty_var * 100, v_exception_id USING ERRCODE = 'check_violation';
  END IF;

  NEW.match_status := 'matched';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ap_invoice_three_way_match ON public.ap_invoices;
CREATE TRIGGER trg_ap_invoice_three_way_match
  BEFORE INSERT OR UPDATE OF status, total, purchase_order_id, three_way_match_override_id
  ON public.ap_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_ap_invoice_three_way_match();

-- 8. Override RPCs
CREATE OR REPLACE FUNCTION public.proc_create_match_override_request(p_invoice_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_company uuid; v_exc uuid;
BEGIN
  SELECT company_id, match_exception_id INTO v_company, v_exc FROM public.ap_invoices WHERE id = p_invoice_id;
  INSERT INTO public.match_override_requests (company_id, ap_invoice_id, exception_id, reason, requested_by, requested_by_name)
  VALUES (v_company, p_invoice_id, v_exc, p_reason, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.proc_approve_match_override(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invoice uuid; v_exc uuid;
BEGIN
  UPDATE public.match_override_requests
     SET status = 'approved', approved_by = auth.uid(), approved_at = now()
   WHERE id = p_request_id RETURNING ap_invoice_id, exception_id INTO v_invoice, v_exc;
  UPDATE public.ap_invoices SET three_way_match_override_id = p_request_id WHERE id = v_invoice;
  IF v_exc IS NOT NULL THEN
    UPDATE public.match_exceptions SET status = 'overridden', override_request_id = p_request_id, resolved_at = now(), resolved_by = auth.uid() WHERE id = v_exc;
  END IF;
END;
$$;

-- 9. Supplier scorecard recalc
CREATE OR REPLACE FUNCTION public.proc_recalc_supplier_scorecard(p_vendor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period_start date := (CURRENT_DATE - INTERVAL '90 days')::date;
  v_period_end date := CURRENT_DATE;
  v_total_pos integer; v_total_grpos integer;
  v_on_time integer; v_late integer;
  v_total_spend numeric; v_exceptions integer;
  v_on_time_pct numeric; v_overall numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_pos FROM public.purchase_orders WHERE vendor_id = p_vendor_id AND doc_date BETWEEN v_period_start AND v_period_end;
  SELECT COUNT(*) INTO v_total_grpos FROM public.goods_receipts WHERE vendor_id = p_vendor_id AND doc_date BETWEEN v_period_start AND v_period_end;
  SELECT COUNT(*) INTO v_on_time FROM public.goods_receipts gr JOIN public.purchase_orders po ON po.id = gr.po_id WHERE gr.vendor_id = p_vendor_id AND gr.doc_date BETWEEN v_period_start AND v_period_end AND gr.doc_date <= COALESCE(po.doc_due_date, gr.doc_date);
  v_late := GREATEST(v_total_grpos - v_on_time, 0);
  SELECT COALESCE(SUM(total),0) INTO v_total_spend FROM public.ap_invoices WHERE vendor_id = p_vendor_id AND doc_date BETWEEN v_period_start AND v_period_end;
  SELECT COUNT(*) INTO v_exceptions FROM public.match_exceptions me JOIN public.ap_invoices ai ON ai.id = me.ap_invoice_id WHERE ai.vendor_id = p_vendor_id AND me.created_at >= v_period_start;
  v_on_time_pct := CASE WHEN v_total_grpos > 0 THEN (v_on_time::numeric / v_total_grpos) * 100 ELSE 0 END;
  v_overall := GREATEST(0, LEAST(100, v_on_time_pct - (v_exceptions * 2)));
  INSERT INTO public.supplier_kpi_snapshots (vendor_id, period_start, period_end, total_pos, total_grpos, on_time_grpos, late_grpos, on_time_pct, total_spend, match_exception_count, overall_score)
  VALUES (p_vendor_id, v_period_start, v_period_end, v_total_pos, v_total_grpos, v_on_time, v_late, v_on_time_pct, v_total_spend, v_exceptions, v_overall);
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_recalc_supplier_after_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    PERFORM public.proc_recalc_supplier_scorecard(NEW.vendor_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grpo_recalc_supplier ON public.goods_receipts;
CREATE TRIGGER trg_grpo_recalc_supplier
  AFTER INSERT OR UPDATE OF status ON public.goods_receipts
  FOR EACH ROW WHEN (NEW.status IN ('open','closed','received'))
  EXECUTE FUNCTION public.tg_recalc_supplier_after_event();

DROP TRIGGER IF EXISTS trg_apinv_recalc_supplier ON public.ap_invoices;
CREATE TRIGGER trg_apinv_recalc_supplier
  AFTER INSERT OR UPDATE OF status ON public.ap_invoices
  FOR EACH ROW WHEN (NEW.status IN ('posted','approved'))
  EXECUTE FUNCTION public.tg_recalc_supplier_after_event();
