
-- Workflow notifications table
CREATE TABLE public.workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT NOT NULL DEFAULT 'workflow', -- workflow, payment, task
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  link_url TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.workflow_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.workflow_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow system (security definer functions) to insert
CREATE POLICY "System can insert notifications"
ON public.workflow_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_notifications;

-- Index for fast lookups
CREATE INDEX idx_workflow_notifications_user_unread 
ON public.workflow_notifications(user_id, is_read) WHERE is_read = false;

-- Phase to module mapping function
CREATE OR REPLACE FUNCTION public.get_phase_module_keys(p_phase TEXT)
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_phase
    WHEN 'finance_verification' THEN ARRAY['financeGates', 'financeOverview']
    WHEN 'operations_verification' THEN ARRAY['technicalAssessment']
    WHEN 'design_costing' THEN ARRAY['designCosting']
    WHEN 'finance_gate_2' THEN ARRAY['financeGates', 'financeOverview']
    WHEN 'procurement' THEN ARRAY['materialRequests']
    WHEN 'production' THEN ARRAY['manufacturing']
    WHEN 'final_payment' THEN ARRAY['financeGates', 'incomingPayments', 'financeOverview']
    WHEN 'logistics' THEN ARRAY['deliveryInstallation']
    WHEN 'completed' THEN ARRAY['projects']
    ELSE ARRAY['projects']
  END;
$$;

-- Phase to friendly label
CREATE OR REPLACE FUNCTION public.get_phase_label(p_phase TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_phase
    WHEN 'sales_initiation' THEN 'Sales Initiation'
    WHEN 'finance_verification' THEN 'Finance Verification (Gate 1)'
    WHEN 'operations_verification' THEN 'Technical Assessment'
    WHEN 'design_costing' THEN 'Design & Costing'
    WHEN 'finance_gate_2' THEN 'Finance Gate 2 (Cost Variance)'
    WHEN 'procurement' THEN 'Procurement'
    WHEN 'production' THEN 'Manufacturing'
    WHEN 'final_payment' THEN 'Final Payment Verification'
    WHEN 'logistics' THEN 'Delivery & Installation'
    WHEN 'completed' THEN 'Project Completion'
    ELSE p_phase
  END;
$$;

-- Main function: create tasks + notifications for phase transitions
CREATE OR REPLACE FUNCTION public.create_workflow_tasks_and_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_keys TEXT[];
  v_phase_label TEXT;
  v_project RECORD;
  v_sales_order RECORD;
  v_target_user RECORD;
  v_task_title TEXT;
  v_task_desc TEXT;
  v_notif_msg TEXT;
  v_link TEXT;
BEGIN
  -- Only fire when phase status changes to 'in_progress'
  IF NEW.status != 'in_progress' OR OLD.status = 'in_progress' THEN
    RETURN NEW;
  END IF;

  v_module_keys := get_phase_module_keys(NEW.phase::TEXT);
  v_phase_label := get_phase_label(NEW.phase::TEXT);

  -- Get project info
  SELECT p.*, so.doc_num as so_doc_num, so.customer_name as so_customer, 
         so.contract_number as so_contract, so.id as so_id
  INTO v_project
  FROM projects p
  LEFT JOIN sales_orders so ON so.project_id = p.id
  WHERE p.id = NEW.project_id
  LIMIT 1;

  v_task_title := v_phase_label || ' - ' || COALESCE(v_project.so_contract, v_project.name, 'Project');
  v_task_desc := v_phase_label || ' is now pending for ' 
    || COALESCE('SO-' || v_project.so_doc_num || ' (' || v_project.so_customer || ')', v_project.name);
  v_notif_msg := v_task_desc || '. Action required.';
  
  -- Determine link based on phase
  v_link := CASE NEW.phase::TEXT
    WHEN 'finance_verification' THEN '/finance-gates'
    WHEN 'operations_verification' THEN '/technical-assessment'
    WHEN 'design_costing' THEN '/design-costing'
    WHEN 'finance_gate_2' THEN '/finance-gates'
    WHEN 'procurement' THEN '/material-requests'
    WHEN 'production' THEN '/manufacturing'
    WHEN 'final_payment' THEN '/finance-gates'
    WHEN 'logistics' THEN '/delivery-installation'
    WHEN 'completed' THEN '/projects/' || NEW.project_id
    ELSE '/projects/' || NEW.project_id
  END;

  -- Find target users: have can_view on any of the module_keys AND match branch
  FOR v_target_user IN
    SELECT DISTINCT p.user_id, p.email, p.full_name
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    JOIN role_permissions rp ON rp.role_key = ur.role::TEXT AND rp.can_view = true
    WHERE rp.module_key = ANY(v_module_keys)
      AND p.user_id IS NOT NULL
      AND (
        -- Admin/manager see everything
        has_any_role(p.user_id, ARRAY['admin'::app_role, 'manager'::app_role])
        OR
        -- Branch-specific users must match
        v_project.id IS NULL
        OR
        can_access_branch(p.user_id, (SELECT branch_id FROM sales_orders WHERE project_id = NEW.project_id LIMIT 1))
      )
  LOOP
    -- Create project task
    INSERT INTO project_tasks (project_id, title, description, status, priority, assignee_id, due_date, created_by)
    VALUES (
      NEW.project_id, v_task_title, v_task_desc, 'todo', 'high',
      v_target_user.user_id, (CURRENT_DATE + INTERVAL '3 days')::DATE, auth.uid()
    );

    -- Create notification
    INSERT INTO workflow_notifications (user_id, project_id, sales_order_id, phase, title, message, notification_type, link_url)
    VALUES (
      v_target_user.user_id, NEW.project_id, v_project.so_id,
      NEW.phase::TEXT, v_task_title, v_notif_msg, 'workflow', v_link
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on project_phases status change
CREATE TRIGGER trg_workflow_phase_notifications
AFTER UPDATE ON project_phases
FOR EACH ROW
EXECUTE FUNCTION create_workflow_tasks_and_notifications();

-- Also create notifications when incoming payment is linked to a contract
CREATE OR REPLACE FUNCTION public.notify_on_incoming_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_so_doc_num INT;
  v_customer TEXT;
  v_target_user RECORD;
  v_title TEXT;
  v_msg TEXT;
BEGIN
  IF NEW.sales_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT so.doc_num, so.customer_name, so.project_id
  INTO v_so_doc_num, v_customer, v_project_id
  FROM sales_orders so WHERE so.id = NEW.sales_order_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := 'Payment Received - SO-' || COALESCE(v_so_doc_num::TEXT, 'N/A');
  v_msg := 'Incoming payment of ' || NEW.total_amount || ' ' || COALESCE(NEW.currency, 'SAR') 
    || ' received for ' || COALESCE(v_customer, 'N/A') || ' (SO-' || COALESCE(v_so_doc_num::TEXT, 'N/A') || ').';

  -- Notify finance users
  FOR v_target_user IN
    SELECT DISTINCT p.user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    JOIN role_permissions rp ON rp.role_key = ur.role::TEXT AND rp.can_view = true
    WHERE rp.module_key IN ('financeGates', 'financeOverview', 'incomingPayments')
      AND p.user_id IS NOT NULL
      AND can_access_branch(p.user_id, NEW.branch_id)
  LOOP
    INSERT INTO workflow_notifications (user_id, project_id, sales_order_id, phase, title, message, notification_type, link_url)
    VALUES (
      v_target_user.user_id, v_project_id, NEW.sales_order_id,
      'incoming_payment', v_title, v_msg, 'payment', '/incoming-payments'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incoming_payment_notifications
AFTER INSERT ON incoming_payments
FOR EACH ROW
EXECUTE FUNCTION notify_on_incoming_payment();
