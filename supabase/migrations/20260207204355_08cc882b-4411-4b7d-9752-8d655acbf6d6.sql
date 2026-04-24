
-- Function to complete Technical Assessment and transition to Design & Costing
CREATE OR REPLACE FUNCTION public.complete_technical_assessment(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
BEGIN
  -- Get sales order info from project
  SELECT so.id, so.customer_name, so.contract_value, so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  -- Complete operations_verification phase
  UPDATE project_phases
  SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'operations_verification';

  -- Start design_costing phase
  UPDATE project_phases
  SET status = 'in_progress', started_at = now()
  WHERE project_id = p_project_id AND phase = 'design_costing';

  -- Update project current phase
  UPDATE projects
  SET current_phase = 'design_costing'
  WHERE id = p_project_id;

  -- Create alert for Design & Costing team
  INSERT INTO finance_alerts (
    sales_order_id, project_id, alert_type, title, description, priority, status, created_by
  ) VALUES (
    v_sales_order_id,
    p_project_id,
    'design_costing',
    'Design & Costing Required',
    'Technical Assessment completed for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || '). ' ||
    'Contract value: ' || COALESCE(v_contract_value, 0) || ' SAR. ' ||
    'Please create BOM with exact total cost and upload required attachments.',
    'high',
    'pending',
    auth.uid()
  );

  -- Resolve any remaining technical assessment alerts
  UPDATE finance_alerts
  SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type = 'technical_assessment' AND status = 'pending';

  -- Log activity
  PERFORM log_project_activity(p_project_id, 'operations_verification', 'phase_completed', 'Technical Assessment completed - advancing to Design & Costing');
  PERFORM log_project_activity(p_project_id, 'design_costing', 'workflow_started', 'Design & Costing phase started - awaiting BOM creation and cost estimation');
END;
$$;

-- Function to complete Design & Costing and handle cost variance workflow
CREATE OR REPLACE FUNCTION public.complete_design_costing(p_project_id uuid, p_exact_total_cost numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sales_order_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
  v_cost_difference NUMERIC;
  v_additional_payment NUMERIC;
BEGIN
  -- Get sales order info
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders so
  JOIN projects p ON p.id = p_project_id AND so.project_id = p.id
  LIMIT 1;

  -- Complete design_costing phase
  UPDATE project_phases
  SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'design_costing';

  -- Resolve design costing alerts
  UPDATE finance_alerts
  SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE project_id = p_project_id AND alert_type = 'design_costing' AND status = 'pending';

  -- Check if exact total cost exceeds the contract value
  IF p_exact_total_cost > v_contract_value THEN
    -- Cost is higher than original contract
    v_cost_difference := p_exact_total_cost - v_contract_value;
    -- Additional payment = 50% of the new total cost minus what was already paid (50% of original)
    v_additional_payment := (p_exact_total_cost * 0.5) - (v_contract_value * 0.5);

    -- Update project contract value to new cost
    UPDATE projects
    SET contract_value = p_exact_total_cost, current_phase = 'finance_gate_2'
    WHERE id = p_project_id;

    -- Update sales order contract value
    UPDATE sales_orders
    SET contract_value = p_exact_total_cost,
        workflow_status = 'cost_variance_pending'
    WHERE id = v_sales_order_id;

    -- Start finance_gate_2 phase (for sales team contact + finance confirmation)
    UPDATE project_phases
    SET status = 'in_progress', started_at = now()
    WHERE project_id = p_project_id AND phase = 'finance_gate_2';

    -- Create alert for Sales team to contact customer
    INSERT INTO finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, status, created_by
    ) VALUES (
      v_sales_order_id,
      p_project_id,
      'cost_variance_sales',
      'Customer Contact Required - Cost Increase',
      'Design & Costing for SO-' || COALESCE(v_doc_num::text, 'N/A') || ' (' || COALESCE(v_customer_name, 'N/A') || ') ' ||
      'shows exact cost of ' || p_exact_total_cost || ' SAR which exceeds the original contract value of ' || v_contract_value || ' SAR. ' ||
      'Cost difference: ' || v_cost_difference || ' SAR. ' ||
      'Additional 50% payment required: ' || v_additional_payment || ' SAR. ' ||
      'Please contact the customer to arrange the additional payment.',
      'high',
      'pending',
      auth.uid()
    );

    PERFORM log_project_activity(p_project_id, 'design_costing', 'phase_completed',
      'Design & Costing completed. Cost variance detected: ' || v_cost_difference || ' SAR above contract. Sales team notified.');
    PERFORM log_project_activity(p_project_id, 'finance_gate_2', 'workflow_started',
      'Finance Gate 2 started - awaiting customer contact and additional payment of ' || v_additional_payment || ' SAR');

  ELSE
    -- Cost is within or below contract - proceed directly to procurement
    UPDATE projects
    SET current_phase = 'procurement'
    WHERE id = p_project_id;

    UPDATE project_phases
    SET status = 'in_progress', started_at = now()
    WHERE project_id = p_project_id AND phase = 'procurement';

    PERFORM log_project_activity(p_project_id, 'design_costing', 'phase_completed',
      'Design & Costing completed. Cost (' || p_exact_total_cost || ' SAR) within contract value (' || v_contract_value || ' SAR). Proceeding to Procurement.');
  END IF;
END;
$$;
