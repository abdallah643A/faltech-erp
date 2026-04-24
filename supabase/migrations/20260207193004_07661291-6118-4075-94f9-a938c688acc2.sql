
CREATE OR REPLACE FUNCTION public.approve_financial_clearance(p_clearance_id uuid, p_notes text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sales_order_id UUID;
  v_project_id UUID;
  v_customer_name TEXT;
  v_contract_value NUMERIC;
  v_doc_num INT;
BEGIN
  SELECT sales_order_id, project_id INTO v_sales_order_id, v_project_id
  FROM financial_clearances WHERE id = p_clearance_id;
  
  -- Get sales order details for alert description
  SELECT customer_name, contract_value, doc_num 
  INTO v_customer_name, v_contract_value, v_doc_num
  FROM sales_orders WHERE id = v_sales_order_id;
  
  UPDATE financial_clearances
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
      clearance_notes = COALESCE(p_notes, clearance_notes)
  WHERE id = p_clearance_id;
  
  UPDATE sales_orders
  SET workflow_status = 'finance_approved', finance_verified_at = now(), finance_verified_by = auth.uid()
  WHERE id = v_sales_order_id;
  
  IF v_project_id IS NOT NULL THEN
    UPDATE project_phases SET status = 'completed', completed_at = now()
    WHERE project_id = v_project_id AND phase = 'finance_verification';
    
    -- Advance to Technical Assessment phase (operations_verification)
    UPDATE project_phases SET status = 'in_progress', started_at = now()
    WHERE project_id = v_project_id AND phase = 'operations_verification';
    
    UPDATE projects SET current_phase = 'operations_verification'
    WHERE id = v_project_id;
    
    PERFORM log_project_activity(v_project_id, 'finance_verification', 'phase_approved', '50% down payment verified - advancing to Technical Assessment');
    
    -- Create alert for Technical Assessment team
    INSERT INTO finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, status, created_by
    ) VALUES (
      v_sales_order_id,
      v_project_id,
      'technical_assessment',
      'Technical Assessment Required',
      'Finance Gate 1 approved for SO-' || v_doc_num || ' (' || v_customer_name || '). ' ||
      'Contract value: ' || COALESCE(v_contract_value, 0) || '. ' ||
      'Site survey and technical specifications are now required. Please schedule a site visit and collect customer signature.',
      'high',
      'pending',
      auth.uid()
    );
    
    PERFORM log_project_activity(v_project_id, 'operations_verification', 'workflow_started', 'Technical Assessment phase started - awaiting site survey and customer approval');
  END IF;
  
  -- Resolve existing finance alerts
  UPDATE finance_alerts SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE sales_order_id = v_sales_order_id AND status = 'pending' AND alert_type = 'payment_verification';
END;
$function$;
