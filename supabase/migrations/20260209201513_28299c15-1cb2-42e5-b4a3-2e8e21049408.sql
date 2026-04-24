
-- 1. RPC: Complete procurement phase → advance to manufacturing with alert
CREATE OR REPLACE FUNCTION public.complete_procurement_phase(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_doc_num INT;
BEGIN
  SELECT so.id, so.customer_name, so.doc_num
  INTO v_sales_order_id, v_customer_name, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  UPDATE project_phases SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'procurement';

  UPDATE project_phases SET status = 'in_progress', started_at = now()
  WHERE project_id = p_project_id AND phase = 'production';

  UPDATE projects SET current_phase = 'production' WHERE id = p_project_id;

  INSERT INTO finance_alerts (
    sales_order_id, project_id, alert_type, title, description, priority, status, created_by
  ) VALUES (
    v_sales_order_id, p_project_id, 'manufacturing_start',
    'Manufacturing Ready to Start',
    'Procurement completed for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). '
    || 'All materials are available. Please create production orders and begin manufacturing.',
    'high', 'pending', auth.uid()
  );

  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type = 'procurement_start' AND status = 'pending';

  PERFORM log_project_activity(p_project_id, 'procurement', 'phase_completed', 'Procurement completed - advancing to Manufacturing');
  PERFORM log_project_activity(p_project_id, 'production', 'workflow_started', 'Manufacturing phase started');
END;
$function$;

-- 2. RPC: Manufacturing near completion → trigger final payment phase + notify sales
CREATE OR REPLACE FUNCTION public.trigger_final_payment_request(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
  v_total_paid NUMERIC;
  v_remaining NUMERIC;
BEGIN
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  -- Calculate total payments received for this contract
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_paid
  FROM incoming_payments
  WHERE sales_order_id = v_sales_order_id AND status != 'cancelled';

  v_remaining := v_contract_value - v_total_paid;

  -- Complete production phase
  UPDATE project_phases SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'production';

  -- Start final_payment phase
  UPDATE project_phases SET status = 'in_progress', started_at = now()
  WHERE project_id = p_project_id AND phase = 'final_payment';

  UPDATE projects SET current_phase = 'final_payment' WHERE id = p_project_id;

  -- Create alert for Sales Rep to contact customer for final payment
  INSERT INTO finance_alerts (
    sales_order_id, project_id, alert_type, title, description, priority, status, created_by
  ) VALUES (
    v_sales_order_id, p_project_id, 'final_payment_sales',
    'Final Payment Required - Contact Customer',
    'Manufacturing near completion for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). ' ||
    'Contract value: ' || v_contract_value || ' SAR. Total paid: ' || v_total_paid || ' SAR. ' ||
    'Remaining balance: ' || v_remaining || ' SAR. ' ||
    'Please contact the customer to arrange the final payment before delivery.',
    'high', 'pending', auth.uid()
  );

  -- Resolve manufacturing alerts
  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type = 'manufacturing_start' AND status = 'pending';

  PERFORM log_project_activity(p_project_id, 'production', 'phase_completed', 'Manufacturing completed - awaiting final payment');
  PERFORM log_project_activity(p_project_id, 'final_payment', 'workflow_started',
    'Final payment phase started. Remaining: ' || v_remaining || ' SAR');
END;
$function$;

-- 3. RPC: Finance confirms Gate 2 (cost variance additional payment) via incoming payments
CREATE OR REPLACE FUNCTION public.confirm_finance_gate_2(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
  v_total_paid NUMERIC;
  v_required_50pct NUMERIC;
BEGIN
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  -- Check actual incoming payments
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_paid
  FROM incoming_payments
  WHERE sales_order_id = v_sales_order_id AND status != 'cancelled';

  v_required_50pct := v_contract_value * 0.5;

  IF v_total_paid < v_required_50pct THEN
    RAISE EXCEPTION 'Insufficient payments. Required: % SAR (50%% of new cost % SAR). Received: % SAR. Please ensure incoming payments are linked to this contract.',
      v_required_50pct, v_contract_value, v_total_paid;
  END IF;

  -- Complete finance_gate_2
  UPDATE project_phases SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'finance_gate_2';

  -- Advance to procurement
  UPDATE project_phases SET status = 'in_progress', started_at = now()
  WHERE project_id = p_project_id AND phase = 'procurement';

  UPDATE projects SET current_phase = 'procurement' WHERE id = p_project_id;

  UPDATE sales_orders SET workflow_status = 'finance_approved' WHERE id = v_sales_order_id;

  -- Create procurement alert
  INSERT INTO finance_alerts (
    sales_order_id, project_id, alert_type, title, description, priority, status, created_by
  ) VALUES (
    v_sales_order_id, p_project_id, 'procurement_start',
    'Procurement Phase Started',
    'Finance Gate 2 approved for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). ' ||
    'Total payments verified: ' || v_total_paid || ' SAR. ' ||
    'Please begin material requests and purchasing for this contract.',
    'high', 'pending', auth.uid()
  );

  -- Resolve cost variance alerts
  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type IN ('cost_variance_sales', 'cost_variance_finance') AND status = 'pending';

  PERFORM log_project_activity(p_project_id, 'finance_gate_2', 'phase_approved',
    'Finance Gate 2 approved. 50% of new cost verified (' || v_total_paid || '/' || v_required_50pct || ' SAR). Advancing to Procurement.');
END;
$function$;

-- 4. RPC: Finance confirms final payment (Gate 3) → advance to logistics/installation
CREATE OR REPLACE FUNCTION public.confirm_final_payment(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
  v_total_paid NUMERIC;
BEGIN
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  -- Check actual incoming payments = 100% of contract
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_paid
  FROM incoming_payments
  WHERE sales_order_id = v_sales_order_id AND status != 'cancelled';

  IF v_total_paid < v_contract_value THEN
    RAISE EXCEPTION 'Insufficient payments for final clearance. Required: % SAR (100%%). Received: % SAR. Remaining: % SAR.',
      v_contract_value, v_total_paid, (v_contract_value - v_total_paid);
  END IF;

  -- Complete final_payment phase
  UPDATE project_phases SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'final_payment';

  -- Advance to logistics (delivery & installation)
  UPDATE project_phases SET status = 'in_progress', started_at = now()
  WHERE project_id = p_project_id AND phase = 'logistics';

  UPDATE projects SET current_phase = 'logistics' WHERE id = p_project_id;

  -- Create alert for Installation team
  INSERT INTO finance_alerts (
    sales_order_id, project_id, alert_type, title, description, priority, status, created_by
  ) VALUES (
    v_sales_order_id, p_project_id, 'installation_ready',
    'Ready for Delivery & Installation',
    'Full payment confirmed for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). ' ||
    'Total paid: ' || v_total_paid || ' SAR (100% of ' || v_contract_value || ' SAR). ' ||
    'Please schedule delivery and installation with the customer.',
    'high', 'pending', auth.uid()
  );

  -- Resolve final payment alerts
  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type IN ('final_payment_sales', 'final_payment_finance') AND status = 'pending';

  PERFORM log_project_activity(p_project_id, 'final_payment', 'phase_approved',
    'Final payment verified (100%). Total: ' || v_total_paid || ' SAR. Advancing to Delivery & Installation.');
  PERFORM log_project_activity(p_project_id, 'logistics', 'workflow_started', 'Delivery & Installation phase started');
END;
$function$;

-- 5. Also add procurement alert when design_costing completes without cost variance (currently goes straight to procurement with no alert)
-- Update complete_design_costing to also create procurement alert when cost is within budget
CREATE OR REPLACE FUNCTION public.complete_design_costing(p_project_id uuid, p_exact_total_cost numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
  v_cost_difference NUMERIC;
  v_additional_payment NUMERIC;
BEGIN
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  UPDATE project_phases SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'design_costing';

  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type = 'design_costing' AND status = 'pending';

  IF p_exact_total_cost > v_contract_value THEN
    v_cost_difference := p_exact_total_cost - v_contract_value;
    v_additional_payment := (p_exact_total_cost * 0.5) - (v_contract_value * 0.5);

    UPDATE projects SET contract_value = p_exact_total_cost, current_phase = 'finance_gate_2'
    WHERE id = p_project_id;

    UPDATE sales_orders SET contract_value = p_exact_total_cost, workflow_status = 'cost_variance_pending'
    WHERE id = v_sales_order_id;

    UPDATE project_phases SET status = 'in_progress', started_at = now()
    WHERE project_id = p_project_id AND phase = 'finance_gate_2';

    INSERT INTO finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, status, created_by
    ) VALUES (
      v_sales_order_id, p_project_id, 'cost_variance_sales',
      'Customer Contact Required - Cost Increase',
      'Design & Costing for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || ') '
      || 'shows exact cost of ' || p_exact_total_cost || ' SAR which exceeds the original contract value of ' || v_contract_value || ' SAR. '
      || 'Cost difference: ' || v_cost_difference || ' SAR. '
      || 'Additional 50% payment required: ' || v_additional_payment || ' SAR. '
      || 'Please contact the customer to arrange the additional payment.',
      'high', 'pending', auth.uid()
    );

    PERFORM log_project_activity(p_project_id, 'design_costing', 'phase_completed',
      'Design & Costing completed. Cost variance detected: ' || v_cost_difference || ' SAR above contract.');
    PERFORM log_project_activity(p_project_id, 'finance_gate_2', 'workflow_started',
      'Finance Gate 2 started - awaiting additional payment of ' || v_additional_payment || ' SAR');
  ELSE
    -- Cost within budget - go to procurement with alert
    UPDATE projects SET current_phase = 'procurement' WHERE id = p_project_id;

    UPDATE project_phases SET status = 'in_progress', started_at = now()
    WHERE project_id = p_project_id AND phase = 'procurement';

    -- Skip finance_gate_2
    UPDATE project_phases SET status = 'skipped', completed_at = now()
    WHERE project_id = p_project_id AND phase = 'finance_gate_2';

    -- Create procurement alert
    INSERT INTO finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, status, created_by
    ) VALUES (
      v_sales_order_id, p_project_id, 'procurement_start',
      'Procurement Phase Started',
      'Design & Costing completed for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). '
      || 'Cost (' || p_exact_total_cost || ' SAR) is within contract value (' || v_contract_value || ' SAR). '
      || 'Please begin material requests and purchasing.',
      'high', 'pending', auth.uid()
    );

    PERFORM log_project_activity(p_project_id, 'design_costing', 'phase_completed',
      'Design & Costing completed. Cost within budget. Proceeding to Procurement.');
  END IF;
END;
$function$;
