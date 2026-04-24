
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS credit_override_id uuid REFERENCES public.credit_override_requests(id),
  ADD COLUMN IF NOT EXISTS credit_status text DEFAULT 'ok';

ALTER TABLE public.sales_order_lines
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS base_line_id uuid;

ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS zatca_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS zatca_qr text,
  ADD COLUMN IF NOT EXISTS zatca_uuid text,
  ADD COLUMN IF NOT EXISTS zatca_cleared_at timestamptz;

ALTER TABLE public.ar_invoice_lines
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS base_line_id uuid;

ALTER TABLE public.ar_returns
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_memo_id uuid;

ALTER TABLE public.ar_return_lines
  ADD COLUMN IF NOT EXISTS base_line_id uuid;

ALTER TABLE public.ar_credit_memos
  ADD COLUMN IF NOT EXISTS base_doc_id uuid,
  ADD COLUMN IF NOT EXISTS base_doc_type text,
  ADD COLUMN IF NOT EXISTS zatca_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS zatca_qr text,
  ADD COLUMN IF NOT EXISTS zatca_uuid text,
  ADD COLUMN IF NOT EXISTS zatca_cleared_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_so_base ON public.sales_orders(base_doc_type, base_doc_id);
CREATE INDEX IF NOT EXISTS idx_ari_base ON public.ar_invoices(base_doc_type, base_doc_id);
CREATE INDEX IF NOT EXISTS idx_arret_base ON public.ar_returns(base_doc_type, base_doc_id);

CREATE OR REPLACE FUNCTION public.tg_so_enforce_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit record;
  v_total numeric;
  v_available numeric;
  v_override_status text;
BEGIN
  IF COALESCE(NEW.status, 'draft') NOT IN ('open','submitted','approved','posted') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_limit
    FROM public.customer_credit_limits
   WHERE customer_code = NEW.customer_code
   LIMIT 1;

  IF v_limit IS NULL THEN
    NEW.credit_status := 'no_limit_configured';
    RETURN NEW;
  END IF;

  IF v_limit.credit_status = 'blocked' THEN
    RAISE EXCEPTION 'CREDIT_BLOCKED: customer % is blocked from new orders', NEW.customer_code
      USING ERRCODE = 'check_violation';
  END IF;

  v_total := COALESCE(NEW.total, 0);
  v_available := v_limit.approved_credit_limit - COALESCE(v_limit.current_outstanding, 0);

  IF v_total > v_available THEN
    IF NEW.credit_override_id IS NOT NULL THEN
      SELECT status INTO v_override_status
        FROM public.credit_override_requests
       WHERE id = NEW.credit_override_id;
      IF v_override_status = 'approved' THEN
        NEW.credit_status := 'override_approved';
        RETURN NEW;
      END IF;
    END IF;
    NEW.credit_status := 'over_limit';
    RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: order total % exceeds available credit % for customer %. Request a credit override.',
      v_total, v_available, NEW.customer_code
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.credit_status := 'ok';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_so_enforce_credit ON public.sales_orders;
CREATE TRIGGER trg_so_enforce_credit
  BEFORE INSERT OR UPDATE OF status, total, credit_override_id
  ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_so_enforce_credit();

CREATE OR REPLACE FUNCTION public.ar_create_credit_memo_from_return(p_return_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ret record;
  v_cm_id uuid;
  v_doc_num integer;
BEGIN
  SELECT * INTO v_ret FROM public.ar_returns WHERE id = p_return_id;
  IF v_ret IS NULL THEN
    RAISE EXCEPTION 'Return % not found', p_return_id;
  END IF;
  IF v_ret.credit_memo_id IS NOT NULL THEN
    RETURN v_ret.credit_memo_id;
  END IF;
  IF v_ret.status NOT IN ('approved','received') THEN
    RAISE EXCEPTION 'Return must be approved or received before credit memo creation (current: %)', v_ret.status;
  END IF;

  SELECT COALESCE(MAX(doc_num), 0) + 1 INTO v_doc_num FROM public.ar_credit_memos;

  INSERT INTO public.ar_credit_memos (
    doc_num, doc_date, posting_date, customer_code, customer_name, customer_id,
    currency, subtotal, tax_amount, total, status, remarks,
    base_doc_id, base_doc_type, branch_id, company_id, created_by
  ) VALUES (
    v_doc_num, CURRENT_DATE, CURRENT_DATE, v_ret.customer_code, v_ret.customer_name, v_ret.customer_id,
    v_ret.currency, v_ret.subtotal, v_ret.tax_amount, v_ret.total, 'open',
    'Auto-generated from RMA #' || v_ret.doc_num,
    v_ret.id, 'ar_return', v_ret.branch_id, v_ret.company_id, auth.uid()
  ) RETURNING id INTO v_cm_id;

  INSERT INTO public.ar_credit_memo_lines (credit_memo_id, line_num, item_code, item_description, quantity, unit_price, line_total, tax_code, unit, warehouse)
  SELECT v_cm_id,
         row_number() OVER (ORDER BY l.id)::int,
         l.item_code, l.item_description, l.quantity, l.unit_price, l.line_total, l.tax_code, l.unit, l.warehouse
    FROM public.ar_return_lines l
   WHERE l.return_id = p_return_id;

  UPDATE public.ar_returns
     SET credit_memo_id = v_cm_id, status = 'credited', updated_at = now()
   WHERE id = p_return_id;

  RETURN v_cm_id;
END;
$$;

CREATE OR REPLACE VIEW public.v_collections_workbench AS
SELECT
  bp.id AS customer_id,
  bp.card_code,
  bp.card_name,
  cl.approved_credit_limit,
  cl.current_outstanding,
  cl.risk_level,
  cl.credit_status,
  COALESCE((SELECT SUM(balance_due) FROM public.ar_invoices WHERE customer_code = bp.card_code AND status IN ('open','overdue','partially_paid')), 0) AS total_open_ar,
  COALESCE((SELECT SUM(balance_due) FROM public.ar_invoices WHERE customer_code = bp.card_code AND status = 'overdue'), 0) AS total_overdue,
  (SELECT MAX(created_at) FROM public.collection_communications WHERE customer_id = bp.id) AS last_contact_at,
  (SELECT COUNT(*) FROM public.collection_promises WHERE customer_id = bp.id AND status = 'pending') AS open_promises,
  (SELECT MAX(dunning_level) FROM public.dunning_letters WHERE customer_id = bp.id) AS current_dunning_level
FROM public.business_partners bp
LEFT JOIN public.customer_credit_limits cl ON cl.customer_code = bp.card_code
WHERE bp.card_type = 'C';

GRANT SELECT ON public.v_collections_workbench TO authenticated;
