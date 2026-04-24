
-- Create finance alerts table
CREATE TABLE public.finance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL DEFAULT 'payment_verification',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  assigned_to UUID,
  created_by UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment verifications table
CREATE TABLE public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  payment_term_number INTEGER NOT NULL DEFAULT 1,
  payment_type TEXT DEFAULT 'down_payment',
  expected_amount NUMERIC DEFAULT 0,
  verified_amount NUMERIC DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_reference TEXT,
  payment_method TEXT,
  bank_name TEXT,
  bank_account TEXT,
  confirmation_document_url TEXT,
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial clearances table
CREATE TABLE public.financial_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  clearance_type TEXT DEFAULT 'contract_approval',
  status TEXT DEFAULT 'pending',
  total_contract_value NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  outstanding_amount NUMERIC DEFAULT 0,
  clearance_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_clearances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_alerts
CREATE POLICY "Finance users can view alerts"
ON public.finance_alerts FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Finance users can manage alerts"
ON public.finance_alerts FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS Policies for payment_verifications
CREATE POLICY "Finance users can view verifications"
ON public.payment_verifications FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Finance users can manage verifications"
ON public.payment_verifications FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS Policies for financial_clearances
CREATE POLICY "Finance users can view clearances"
ON public.financial_clearances FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Finance users can manage clearances"
ON public.financial_clearances FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Function to create finance alert when contract is submitted
CREATE OR REPLACE FUNCTION public.create_finance_alert_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create alert when workflow_status changes to 'pending_finance'
  IF NEW.workflow_status = 'pending_finance' AND (OLD.workflow_status IS NULL OR OLD.workflow_status != 'pending_finance') THEN
    INSERT INTO public.finance_alerts (
      sales_order_id,
      project_id,
      alert_type,
      title,
      description,
      priority,
      created_by
    ) VALUES (
      NEW.id,
      NEW.project_id,
      'payment_verification',
      'New Contract Pending Finance Verification',
      'Contract ' || COALESCE(NEW.contract_number, 'SO-' || NEW.doc_num) || ' for ' || NEW.customer_name || ' requires payment verification. Contract value: ' || COALESCE(NEW.contract_value, NEW.total),
      'high',
      NEW.created_by
    );
    
    -- Also create initial payment verification record for down payment
    INSERT INTO public.payment_verifications (
      sales_order_id,
      project_id,
      payment_term_number,
      payment_type,
      expected_amount,
      created_by
    ) VALUES (
      NEW.id,
      NEW.project_id,
      1,
      'down_payment',
      COALESCE(NEW.contract_value, NEW.total) * 0.3, -- Default 30% down payment
      NEW.created_by
    );
    
    -- Create financial clearance record
    INSERT INTO public.financial_clearances (
      sales_order_id,
      project_id,
      clearance_type,
      total_contract_value,
      outstanding_amount,
      created_by
    ) VALUES (
      NEW.id,
      NEW.project_id,
      'contract_approval',
      COALESCE(NEW.contract_value, NEW.total),
      COALESCE(NEW.contract_value, NEW.total),
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for finance alerts
DROP TRIGGER IF EXISTS create_finance_alert_trigger ON public.sales_orders;
CREATE TRIGGER create_finance_alert_trigger
AFTER UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.create_finance_alert_on_submit();

-- Function to approve financial clearance and progress project
CREATE OR REPLACE FUNCTION public.approve_financial_clearance(p_clearance_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sales_order_id UUID;
  v_project_id UUID;
BEGIN
  -- Get the sales order and project IDs
  SELECT sales_order_id, project_id INTO v_sales_order_id, v_project_id
  FROM financial_clearances WHERE id = p_clearance_id;
  
  -- Update clearance status
  UPDATE financial_clearances
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      clearance_notes = COALESCE(p_notes, clearance_notes)
  WHERE id = p_clearance_id;
  
  -- Update sales order workflow status
  UPDATE sales_orders
  SET workflow_status = 'finance_approved',
      finance_verified_at = now(),
      finance_verified_by = auth.uid()
  WHERE id = v_sales_order_id;
  
  -- Update project phase if exists
  IF v_project_id IS NOT NULL THEN
    UPDATE project_phases
    SET status = 'completed', completed_at = now()
    WHERE project_id = v_project_id AND phase = 'finance_verification';
    
    UPDATE project_phases
    SET status = 'in_progress', started_at = now()
    WHERE project_id = v_project_id AND phase = 'operations_verification';
    
    UPDATE projects
    SET current_phase = 'operations_verification'
    WHERE id = v_project_id;
    
    PERFORM log_project_activity(v_project_id, 'finance_verification', 'phase_approved', 'Finance verification approved');
  END IF;
  
  -- Mark related alerts as resolved
  UPDATE finance_alerts
  SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE sales_order_id = v_sales_order_id AND status = 'pending';
END;
$$;

-- Function to reject financial clearance
CREATE OR REPLACE FUNCTION public.reject_financial_clearance(p_clearance_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sales_order_id UUID;
  v_project_id UUID;
BEGIN
  SELECT sales_order_id, project_id INTO v_sales_order_id, v_project_id
  FROM financial_clearances WHERE id = p_clearance_id;
  
  UPDATE financial_clearances
  SET status = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = p_reason
  WHERE id = p_clearance_id;
  
  UPDATE sales_orders
  SET workflow_status = 'finance_rejected',
      finance_rejection_reason = p_reason
  WHERE id = v_sales_order_id;
  
  IF v_project_id IS NOT NULL THEN
    PERFORM log_project_activity(v_project_id, 'finance_verification', 'phase_rejected', p_reason);
  END IF;
  
  UPDATE finance_alerts
  SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE sales_order_id = v_sales_order_id AND status = 'pending';
END;
$$;
