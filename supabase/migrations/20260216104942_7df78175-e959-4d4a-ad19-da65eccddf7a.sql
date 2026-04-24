
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
  v_so_created_by UUID;
  v_so_creator_name TEXT;
  v_so_creator_email TEXT;
  v_cert_number TEXT;
  v_final_type_id UUID;
BEGIN
  SELECT so.id, so.customer_name, COALESCE(so.contract_value, so.total), so.doc_num, so.created_by
  INTO v_sales_order_id, v_customer_name, v_contract_value, v_doc_num, v_so_created_by
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

  -- === AUTO-CREATE PAYMENT CERTIFICATE FOR REMAINING AMOUNT ===
  IF v_remaining > 0 THEN
    v_cert_number := 'PC-' || LPAD(EXTRACT(EPOCH FROM now())::BIGINT::TEXT, 10, '0');
    
    -- Get the "Final" certificate type (or first available)
    SELECT id INTO v_final_type_id
    FROM payment_certificate_types
    WHERE LOWER(name) = 'final' AND is_active = true
    LIMIT 1;
    
    IF v_final_type_id IS NULL THEN
      SELECT id INTO v_final_type_id
      FROM payment_certificate_types
      WHERE is_active = true
      ORDER BY sort_order
      LIMIT 1;
    END IF;
    
    IF v_final_type_id IS NOT NULL THEN
      INSERT INTO payment_certificates (
        certificate_number, sales_order_id, certificate_type_id,
        amount, notes, status, created_by, notified_user_id, notification_sent_at
      ) VALUES (
        v_cert_number, v_sales_order_id, v_final_type_id,
        v_remaining,
        'Auto-generated: Production finishing for SO-' || COALESCE(v_doc_num::text, 'N/A') || 
        '. Remaining balance: ' || v_remaining || ' SAR. Please collect payment from customer (' || COALESCE(v_customer_name, 'N/A') || ').',
        'submitted', auth.uid(), v_so_created_by, now()
      );
    END IF;
  END IF;

  -- === SEND NOTIFICATION TO CONTRACT CREATOR ===
  IF v_so_created_by IS NOT NULL THEN
    -- Get creator info
    SELECT full_name, email INTO v_so_creator_name, v_so_creator_email
    FROM profiles WHERE user_id = v_so_created_by;

    INSERT INTO workflow_notifications (
      user_id, project_id, sales_order_id, phase, title, message, notification_type, link_url
    ) VALUES (
      v_so_created_by, p_project_id, v_sales_order_id,
      'final_payment',
      'Final Payment Collection Required - SO-' || COALESCE(v_doc_num::text, 'N/A'),
      'Production is finishing for ' || COALESCE(v_customer_name, 'N/A') || ' (SO-' || COALESCE(v_doc_num::text, 'N/A') || '). ' ||
      'Remaining balance: ' || v_remaining || ' SAR. A payment certificate has been issued. ' ||
      'Please contact the customer to collect the final payment before delivery.',
      'payment',
      '/payment-certificates'
    );
  END IF;

  PERFORM log_project_activity(p_project_id, 'production', 'phase_completed', 'Manufacturing completed - awaiting final payment');
  PERFORM log_project_activity(p_project_id, 'final_payment', 'workflow_started',
    'Final payment phase started. Remaining: ' || v_remaining || ' SAR. Payment certificate auto-created.');
END;
$function$;
