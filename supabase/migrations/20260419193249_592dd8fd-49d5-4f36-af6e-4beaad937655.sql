-- ============================================================
-- POS PR2: Service-layer RPCs (gift cards, loyalty, layaway,
-- repair workflow, branch benchmarking)
-- ============================================================

-- 1) Gift card redemption (atomic, with balance enforcement)
CREATE OR REPLACE FUNCTION public.pos_redeem_gift_card(
  p_card_id uuid,
  p_amount numeric,
  p_branch_id uuid DEFAULT NULL,
  p_transaction_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card record;
  v_new_bal numeric;
  v_status text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Redemption amount must be positive';
  END IF;

  SELECT id, company_id, current_balance, status, expiry_date
    INTO v_card
  FROM pos_gift_cards
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gift card not found';
  END IF;

  IF v_card.status NOT IN ('active') THEN
    RAISE EXCEPTION 'Gift card is not active (status=%)', v_card.status;
  END IF;

  IF v_card.expiry_date IS NOT NULL AND v_card.expiry_date < CURRENT_DATE THEN
    UPDATE pos_gift_cards SET status = 'expired' WHERE id = p_card_id;
    RAISE EXCEPTION 'Gift card has expired';
  END IF;

  IF p_amount > v_card.current_balance THEN
    RAISE EXCEPTION 'Insufficient balance (available=%, requested=%)', v_card.current_balance, p_amount;
  END IF;

  v_new_bal := v_card.current_balance - p_amount;
  v_status := CASE WHEN v_new_bal <= 0 THEN 'depleted' ELSE 'active' END;

  UPDATE pos_gift_cards
     SET current_balance = v_new_bal,
         status = v_status,
         updated_at = now()
   WHERE id = p_card_id;

  INSERT INTO pos_gift_card_transactions(
    company_id, gift_card_id, transaction_type, amount,
    balance_before, balance_after, branch_id, transaction_id
  ) VALUES (
    v_card.company_id, p_card_id, 'redeem', p_amount,
    v_card.current_balance, v_new_bal, p_branch_id, p_transaction_id
  );

  RETURN jsonb_build_object(
    'card_id', p_card_id,
    'redeemed', p_amount,
    'balance_after', v_new_bal,
    'status', v_status
  );
END;
$$;

-- 2) Loyalty redemption (validates wallet, posts transaction, updates balance)
CREATE OR REPLACE FUNCTION public.pos_redeem_loyalty_points(
  p_wallet_id uuid,
  p_points integer,
  p_source_module text DEFAULT 'pos',
  p_source_doc_id uuid DEFAULT NULL,
  p_source_doc_number text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet record;
  v_new_balance integer;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Redemption points must be positive';
  END IF;

  SELECT id, company_id, points_balance
    INTO v_wallet
  FROM customer_loyalty_wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loyalty wallet not found';
  END IF;

  IF p_points > COALESCE(v_wallet.points_balance, 0) THEN
    RAISE EXCEPTION 'Insufficient points (balance=%, requested=%)', v_wallet.points_balance, p_points;
  END IF;

  v_new_balance := v_wallet.points_balance - p_points;

  INSERT INTO loyalty_transactions(
    wallet_id, transaction_type, points, balance_after,
    source_module, source_document_id, source_document_number,
    description, company_id, created_by
  ) VALUES (
    p_wallet_id, 'redeem', -p_points, v_new_balance,
    p_source_module, p_source_doc_id, p_source_doc_number,
    COALESCE(p_description, 'Redeemed ' || p_points || ' points'),
    v_wallet.company_id, auth.uid()
  );

  UPDATE customer_loyalty_wallets
     SET points_balance = v_new_balance,
         updated_at = now()
   WHERE id = p_wallet_id;

  RETURN jsonb_build_object(
    'wallet_id', p_wallet_id,
    'redeemed_points', p_points,
    'balance_after', v_new_balance
  );
END;
$$;

-- 3) Layaway installment posting (records payment, recomputes remaining + status)
CREATE OR REPLACE FUNCTION public.pos_post_layaway_payment(
  p_layaway_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_paid_total numeric;
  v_next_num integer;
  v_remaining numeric;
  v_new_status text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;

  SELECT id, total_amount, status
    INTO v_order
  FROM pos_layaway_orders
  WHERE id = p_layaway_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Layaway order not found';
  END IF;

  IF v_order.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'Layaway is already %', v_order.status;
  END IF;

  SELECT COALESCE(SUM(amount), 0), COALESCE(MAX(payment_number), 0)
    INTO v_paid_total, v_next_num
  FROM pos_layaway_payments
  WHERE layaway_id = p_layaway_id AND status = 'paid';

  IF (v_paid_total + p_amount) > v_order.total_amount THEN
    RAISE EXCEPTION 'Payment exceeds outstanding balance (remaining=%)', v_order.total_amount - v_paid_total;
  END IF;

  v_next_num := v_next_num + 1;
  v_remaining := v_order.total_amount - (v_paid_total + p_amount);
  v_new_status := CASE WHEN v_remaining <= 0 THEN 'completed' ELSE 'in_progress' END;

  INSERT INTO pos_layaway_payments(
    layaway_id, payment_number, amount, payment_method, reference, status, paid_at
  ) VALUES (
    p_layaway_id, v_next_num, p_amount, p_payment_method, p_reference, 'paid', now()
  );

  UPDATE pos_layaway_orders
     SET remaining_amount = v_remaining,
         status = v_new_status,
         updated_at = now()
   WHERE id = p_layaway_id;

  RETURN jsonb_build_object(
    'layaway_id', p_layaway_id,
    'payment_number', v_next_num,
    'amount', p_amount,
    'remaining', v_remaining,
    'status', v_new_status
  );
END;
$$;

-- 4) Repair workflow status guard
CREATE OR REPLACE FUNCTION public.pos_transition_repair_status(
  p_repair_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair record;
  v_allowed text[];
BEGIN
  SELECT id, status INTO v_repair
  FROM pos_repair_orders
  WHERE id = p_repair_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair order not found';
  END IF;

  v_allowed := CASE v_repair.status
    WHEN 'intake'      THEN ARRAY['diagnosing','cancelled']
    WHEN 'diagnosing'  THEN ARRAY['quoted','cancelled']
    WHEN 'quoted'      THEN ARRAY['approved','rejected','cancelled']
    WHEN 'approved'    THEN ARRAY['in_repair','cancelled']
    WHEN 'in_repair'   THEN ARRAY['ready_for_pickup','cancelled']
    WHEN 'ready_for_pickup' THEN ARRAY['completed']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> % (allowed: %)',
      v_repair.status, p_new_status, v_allowed;
  END IF;

  UPDATE pos_repair_orders
     SET status = p_new_status,
         status_notes = COALESCE(p_notes, status_notes),
         updated_at = now()
   WHERE id = p_repair_id;

  RETURN jsonb_build_object(
    'repair_id', p_repair_id,
    'previous_status', v_repair.status,
    'new_status', p_new_status
  );
END;
$$;

-- 5) Branch benchmarking refresh (aggregates POS transactions into metrics)
CREATE OR REPLACE FUNCTION public.pos_refresh_branch_metrics(
  p_company_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_company_id IS NULL OR p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION 'company_id, period_start and period_end are required';
  END IF;

  DELETE FROM pos_branch_metrics
   WHERE company_id = p_company_id
     AND period_start = p_period_start
     AND period_end = p_period_end;

  WITH agg AS (
    SELECT
      branch_id,
      COUNT(*) FILTER (WHERE doc_type <> 'return')                        AS txn_count,
      COALESCE(SUM(grand_total) FILTER (WHERE doc_type <> 'return'), 0)   AS gross_sales,
      COALESCE(SUM(grand_total) FILTER (WHERE doc_type = 'return'), 0)    AS returns_total,
      COALESCE(AVG(grand_total) FILTER (WHERE doc_type <> 'return'), 0)   AS avg_ticket
    FROM pos_transactions
    WHERE company_id = p_company_id
      AND created_at::date BETWEEN p_period_start AND p_period_end
      AND branch_id IS NOT NULL
    GROUP BY branch_id
  )
  INSERT INTO pos_branch_metrics(
    company_id, branch_id, period_start, period_end,
    transaction_count, gross_sales, returns_total, net_sales, avg_ticket
  )
  SELECT
    p_company_id, branch_id, p_period_start, p_period_end,
    txn_count, gross_sales, returns_total, gross_sales - returns_total, avg_ticket
  FROM agg;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'company_id', p_company_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'rows_inserted', v_inserted
  );
END;
$$;