
CREATE OR REPLACE FUNCTION public.create_project_from_contract(p_sales_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id uuid;
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM sales_orders WHERE id = p_sales_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;
  
  IF v_order.project_id IS NOT NULL THEN
    RETURN v_order.project_id;
  END IF;
  
  INSERT INTO projects (
    name,
    description,
    status,
    project_type,
    current_phase,
    contract_value,
    business_partner_id,
    created_by
  ) VALUES (
    COALESCE(v_order.contract_number, 'Contract-' || v_order.doc_num),
    'Industrial project for ' || v_order.customer_name,
    'in_progress',
    'industrial',
    'sales_initiation',
    COALESCE(v_order.contract_value, v_order.total),
    v_order.customer_id,
    v_order.created_by
  ) RETURNING id INTO v_project_id;
  
  UPDATE sales_orders 
  SET project_id = v_project_id,
      sap_sales_order_id = p_sales_order_id::text
  WHERE id = p_sales_order_id;
  
  UPDATE projects
  SET sap_sales_order_id = p_sales_order_id::text
  WHERE id = v_project_id;
  
  RETURN v_project_id;
END;
$function$;
