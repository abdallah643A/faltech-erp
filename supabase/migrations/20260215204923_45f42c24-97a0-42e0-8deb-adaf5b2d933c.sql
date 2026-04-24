
CREATE OR REPLACE FUNCTION public.create_pr_from_approved_mr()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Use MR's branch if available
    IF v_branch_id IS NULL THEN
      v_branch_id := NEW.branch_id;
    END IF;

    INSERT INTO purchase_requests (
      pr_number, doc_date, required_date, status,
      requester_id, requester_name, department,
      project_id, material_request_id, branch_id,
      remarks, created_by
    ) VALUES (
      v_pr_number, CURRENT_DATE, COALESCE(NEW.due_out_date::date, CURRENT_DATE + INTERVAL '14 days'), 'open',
      NEW.requested_by_id, NEW.requested_by_name, NEW.department,
      v_project_id, NEW.id, v_branch_id,
      'Auto-created from Material Request ' || NEW.mr_number,
      NEW.approved_by_3_id
    ) RETURNING id INTO v_pr_id;

    -- Copy MR lines to PR lines using correct column names
    FOR v_mr_line IN
      SELECT * FROM material_request_lines WHERE material_request_id = NEW.id ORDER BY line_num
    LOOP
      INSERT INTO purchase_request_lines (
        purchase_request_id, line_num, item_code, item_description,
        quantity, unit, unit_price, notes
      ) VALUES (
        v_pr_id, v_line_num, v_mr_line.part_no, v_mr_line.description,
        v_mr_line.quantity, v_mr_line.unit_of_measurement, 0,
        v_mr_line.remark
      );
      v_line_num := v_line_num + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
