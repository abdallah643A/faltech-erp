-- Add contract and industrial project fields to sales_orders
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS is_contract boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_number text,
ADD COLUMN IF NOT EXISTS contract_date date,
ADD COLUMN IF NOT EXISTS contract_signed_date date,
ADD COLUMN IF NOT EXISTS contract_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS scope_of_work text,
ADD COLUMN IF NOT EXISTS terms_and_conditions text,
ADD COLUMN IF NOT EXISTS contract_file_url text,
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS delivery_terms text,
ADD COLUMN IF NOT EXISTS warranty_period text,
ADD COLUMN IF NOT EXISTS validity_period integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS payment_terms_details jsonb,
ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS submitted_to_finance_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finance_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finance_verified_by uuid,
ADD COLUMN IF NOT EXISTS finance_rejection_reason text;

-- Create index for project lookup
CREATE INDEX IF NOT EXISTS idx_sales_orders_project_id ON public.sales_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_is_contract ON public.sales_orders(is_contract);
CREATE INDEX IF NOT EXISTS idx_sales_orders_workflow_status ON public.sales_orders(workflow_status);

-- Function to create industrial project from sales order contract
CREATE OR REPLACE FUNCTION public.create_project_from_contract(p_sales_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_order RECORD;
BEGIN
  -- Get sales order details
  SELECT * INTO v_order FROM sales_orders WHERE id = p_sales_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;
  
  IF v_order.project_id IS NOT NULL THEN
    RETURN v_order.project_id;
  END IF;
  
  -- Create the industrial project
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
    'active',
    'industrial',
    'sales_initiation',
    COALESCE(v_order.contract_value, v_order.total),
    v_order.customer_id,
    v_order.created_by
  ) RETURNING id INTO v_project_id;
  
  -- Link sales order to project
  UPDATE sales_orders 
  SET project_id = v_project_id,
      sap_sales_order_id = p_sales_order_id::text
  WHERE id = p_sales_order_id;
  
  -- Update project with SAP reference
  UPDATE projects
  SET sap_sales_order_id = p_sales_order_id::text
  WHERE id = v_project_id;
  
  RETURN v_project_id;
END;
$$;

-- Function to submit contract to finance workflow
CREATE OR REPLACE FUNCTION public.submit_contract_to_finance(p_sales_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_phase_id uuid;
BEGIN
  -- Get or create project
  SELECT project_id INTO v_project_id FROM sales_orders WHERE id = p_sales_order_id;
  
  IF v_project_id IS NULL THEN
    v_project_id := create_project_from_contract(p_sales_order_id);
  END IF;
  
  -- Update sales order workflow status
  UPDATE sales_orders 
  SET workflow_status = 'pending_finance',
      submitted_to_finance_at = now()
  WHERE id = p_sales_order_id;
  
  -- Complete sales initiation phase
  UPDATE project_phases
  SET status = 'completed',
      completed_at = now()
  WHERE project_id = v_project_id AND phase = 'sales_initiation';
  
  -- Start finance verification phase
  UPDATE project_phases
  SET status = 'in_progress',
      started_at = now()
  WHERE project_id = v_project_id AND phase = 'finance_verification'
  RETURNING id INTO v_phase_id;
  
  -- Update project current phase
  UPDATE projects
  SET current_phase = 'finance_verification'
  WHERE id = v_project_id;
  
  -- Log activity
  PERFORM log_project_activity(
    v_project_id,
    'finance_verification',
    'workflow_started',
    'Contract submitted to Finance for verification'
  );
END;
$$;