
-- Add payment_slip_url column to sales_orders
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

-- Update the finance alert trigger to include payment slip link
CREATE OR REPLACE FUNCTION public.create_finance_alert_on_submit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.workflow_status = 'pending_finance' AND (OLD.workflow_status IS NULL OR OLD.workflow_status != 'pending_finance') THEN
    INSERT INTO public.finance_alerts (
      sales_order_id, project_id, alert_type, title, description, priority, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 'payment_verification',
      'New Contract Pending Finance Verification',
      'Contract ' || COALESCE(NEW.contract_number, 'SO-' || NEW.doc_num) || ' for ' || NEW.customer_name || ' requires 50% down payment verification. Contract value: ' || COALESCE(NEW.contract_value, NEW.total) ||
      CASE WHEN NEW.payment_slip_url IS NOT NULL THEN '. Payment slip attached: ' || NEW.payment_slip_url ELSE '' END,
      'high', NEW.created_by
    );
    
    -- 50% down payment
    INSERT INTO public.payment_verifications (
      sales_order_id, project_id, payment_term_number, payment_type, expected_amount, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 1, 'down_payment',
      COALESCE(NEW.contract_value, NEW.total) * 0.5,
      NEW.created_by
    );
    
    INSERT INTO public.financial_clearances (
      sales_order_id, project_id, clearance_type, total_contract_value, outstanding_amount, created_by
    ) VALUES (
      NEW.id, NEW.project_id, 'contract_approval',
      COALESCE(NEW.contract_value, NEW.total),
      COALESCE(NEW.contract_value, NEW.total),
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
