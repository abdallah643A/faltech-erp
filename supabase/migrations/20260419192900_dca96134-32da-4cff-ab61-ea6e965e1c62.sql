-- 1. Customer-facing order tracker tokens
CREATE TABLE IF NOT EXISTS public.pos_order_tracker_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  order_type text NOT NULL,
  order_id uuid NOT NULL,
  customer_phone text,
  customer_email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_pos_tracker_token ON public.pos_order_tracker_tokens(token);
ALTER TABLE public.pos_order_tracker_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read tracker" ON public.pos_order_tracker_tokens;
DROP POLICY IF EXISTS "auth write tracker" ON public.pos_order_tracker_tokens;
CREATE POLICY "anon read tracker" ON public.pos_order_tracker_tokens FOR SELECT USING (true);
CREATE POLICY "auth write tracker" ON public.pos_order_tracker_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Race-safe shift open
CREATE OR REPLACE FUNCTION public.pos_open_shift(
  p_company_id uuid, p_cashier_name text, p_opening_float numeric DEFAULT 0,
  p_branch_id uuid DEFAULT NULL, p_terminal_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_existing uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT id INTO v_existing FROM pos_cashier_shifts
  WHERE cashier_id = v_user AND status = 'open' AND COALESCE(branch_id::text,'') = COALESCE(p_branch_id::text,'')
  LIMIT 1;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'shift_already_open' USING DETAIL = v_existing::text; END IF;
  INSERT INTO pos_cashier_shifts (company_id, cashier_id, cashier_name, opening_float, branch_id, terminal_id, shift_number, status)
  VALUES (p_company_id, v_user, p_cashier_name, p_opening_float, p_branch_id, p_terminal_id,
    'SH-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,6), 'open')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 3. Atomic shift close: recompute expected from real transactions
CREATE OR REPLACE FUNCTION public.pos_close_shift(
  p_shift_id uuid, p_actual_cash numeric, p_actual_card numeric,
  p_actual_digital_wallet numeric DEFAULT 0, p_actual_bank_transfer numeric DEFAULT 0,
  p_variance_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shift pos_cashier_shifts;
  v_exp_cash numeric := 0; v_exp_card numeric := 0; v_exp_wallet numeric := 0; v_exp_bank numeric := 0;
  v_sales_count int := 0; v_sales_amt numeric := 0; v_returns_count int := 0; v_returns_amt numeric := 0;
  v_actual_total numeric; v_total_var numeric; v_status text;
BEGIN
  SELECT * INTO v_shift FROM pos_cashier_shifts WHERE id = p_shift_id FOR UPDATE;
  IF v_shift.id IS NULL THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF v_shift.status <> 'open' THEN RAISE EXCEPTION 'shift_not_open'; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN payment_method='cash' AND doc_type<>'return' THEN grand_total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method IN ('card','credit_card','debit_card') AND doc_type<>'return' THEN grand_total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method IN ('wallet','digital_wallet','mada_wallet') AND doc_type<>'return' THEN grand_total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method IN ('bank_transfer','transfer') AND doc_type<>'return' THEN grand_total ELSE 0 END),0),
    COUNT(*) FILTER (WHERE doc_type<>'return' AND status='completed'),
    COALESCE(SUM(CASE WHEN doc_type<>'return' AND status='completed' THEN grand_total ELSE 0 END),0),
    COUNT(*) FILTER (WHERE doc_type='return'),
    COALESCE(SUM(CASE WHEN doc_type='return' THEN ABS(grand_total) ELSE 0 END),0)
  INTO v_exp_cash, v_exp_card, v_exp_wallet, v_exp_bank, v_sales_count, v_sales_amt, v_returns_count, v_returns_amt
  FROM pos_transactions WHERE shift_id = p_shift_id;

  v_exp_cash := v_exp_cash + COALESCE(v_shift.opening_float,0);
  v_actual_total := p_actual_cash + p_actual_card + p_actual_digital_wallet + p_actual_bank_transfer;
  v_total_var := v_actual_total - (v_exp_cash + v_exp_card + v_exp_wallet + v_exp_bank);
  v_status := CASE WHEN ABS(v_total_var) < 1 THEN 'balanced'
                   WHEN ABS(v_total_var) <= 5 THEN 'within_tolerance'
                   WHEN v_total_var > 0 THEN 'over' ELSE 'short' END;

  UPDATE pos_cashier_shifts SET
    status = 'closed', closed_at = now(),
    expected_cash = v_exp_cash, expected_card = v_exp_card,
    expected_digital_wallet = v_exp_wallet, expected_bank_transfer = v_exp_bank,
    expected_total = v_exp_cash + v_exp_card + v_exp_wallet + v_exp_bank,
    actual_cash = p_actual_cash, actual_card = p_actual_card,
    actual_digital_wallet = p_actual_digital_wallet, actual_bank_transfer = p_actual_bank_transfer,
    actual_total = v_actual_total,
    cash_variance = p_actual_cash - v_exp_cash,
    card_variance = p_actual_card - v_exp_card,
    total_variance = v_total_var, variance_status = v_status,
    variance_notes = p_variance_notes,
    total_sales_count = v_sales_count, total_sales_amount = v_sales_amt,
    total_returns_count = v_returns_count, total_returns_amount = v_returns_amt
  WHERE id = p_shift_id;

  RETURN jsonb_build_object(
    'shift_id', p_shift_id, 'expected_total', v_exp_cash + v_exp_card + v_exp_wallet + v_exp_bank,
    'actual_total', v_actual_total, 'variance', v_total_var, 'status', v_status
  );
END $$;

-- 4. Permission-aware shift approval
CREATE OR REPLACE FUNCTION public.pos_approve_shift(p_shift_id uuid, p_role_name text, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_can boolean := false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT can_close_shift INTO v_can FROM pos_cashier_permissions
  WHERE role_name = p_role_name AND COALESCE(is_active,true) = true LIMIT 1;
  IF NOT COALESCE(v_can,false) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  UPDATE pos_cashier_shifts SET
    manager_approved = true, manager_id = v_user, manager_approved_at = now(),
    manager_notes = p_notes, status = 'reconciled'
  WHERE id = p_shift_id AND status = 'closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_closed_or_missing'; END IF;
END $$;

-- 5. Return approval with refund-limit guard
CREATE OR REPLACE FUNCTION public.pos_approve_return(p_return_id uuid, p_role_name text, p_restocking_decision text DEFAULT 'restock')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_amount numeric; v_can boolean; v_limit numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT total_refund_amount INTO v_amount FROM pos_return_requests WHERE id = p_return_id;
  IF v_amount IS NULL THEN RAISE EXCEPTION 'return_not_found'; END IF;
  SELECT can_approve_return, COALESCE(return_limit, refund_limit, 0) INTO v_can, v_limit
  FROM pos_cashier_permissions WHERE role_name = p_role_name AND COALESCE(is_active,true) = true LIMIT 1;
  IF NOT COALESCE(v_can,false) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_limit > 0 AND v_amount > v_limit THEN RAISE EXCEPTION 'refund_exceeds_limit' USING DETAIL = v_limit::text; END IF;
  UPDATE pos_return_requests SET
    status = 'approved', approved_by = v_user, approved_at = now(),
    restocking_decision = p_restocking_decision
  WHERE id = p_return_id;
END $$;

-- 6. Offline conflict resolution
CREATE OR REPLACE FUNCTION public.pos_resolve_offline_conflict(p_offline_tx_id uuid, p_resolution text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_resolution NOT IN ('keep_local','keep_server','merge','discard') THEN
    RAISE EXCEPTION 'invalid_resolution';
  END IF;
  UPDATE pos_offline_transactions SET
    sync_status = CASE p_resolution
      WHEN 'discard' THEN 'discarded'
      WHEN 'keep_server' THEN 'superseded'
      ELSE 'resolved' END,
    conflict_resolution = p_resolution,
    updated_at = now()
  WHERE id = p_offline_tx_id;
END $$;

-- 7. Customer order tracker
CREATE OR REPLACE FUNCTION public.pos_create_tracker_token(p_order_type text, p_order_id uuid, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  v_token := encode(gen_random_bytes(12), 'hex');
  INSERT INTO pos_order_tracker_tokens (token, order_type, order_id, customer_phone, customer_email, created_by)
  VALUES (v_token, p_order_type, p_order_id, p_phone, p_email, auth.uid());
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.pos_lookup_order_status(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rec record; v_data jsonb;
BEGIN
  SELECT * INTO v_rec FROM pos_order_tracker_tokens WHERE token = p_token AND expires_at > now();
  IF v_rec.token IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  IF v_rec.order_type = 'pickup' THEN
    SELECT jsonb_build_object('order_no', order_number, 'status', order_status, 'ready_at', ready_at, 'eta', estimated_ready_time)
    INTO v_data FROM pos_pickup_orders WHERE id = v_rec.order_id;
  ELSIF v_rec.order_type = 'layaway' THEN
    SELECT jsonb_build_object('order_no', layaway_number, 'status', status, 'total', total_amount, 'paid', total_amount - remaining_amount, 'remaining', remaining_amount)
    INTO v_data FROM pos_layaway_orders WHERE id = v_rec.order_id;
  ELSIF v_rec.order_type = 'repair' THEN
    SELECT jsonb_build_object('order_no', repair_number, 'status', repair_status, 'item', item_description, 'eta', estimated_completion)
    INTO v_data FROM pos_repair_orders WHERE id = v_rec.order_id;
  END IF;

  RETURN jsonb_build_object('found', true, 'order_type', v_rec.order_type, 'data', COALESCE(v_data, '{}'::jsonb));
END $$;