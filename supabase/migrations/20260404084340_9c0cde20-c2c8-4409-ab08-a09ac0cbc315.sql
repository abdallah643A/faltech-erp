-- Add audit trail triggers to major ERP tables that don't have them yet

CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_ap_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.ap_invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_opportunities
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_material_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_delivery_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_ar_credit_memos
  AFTER INSERT OR UPDATE OR DELETE ON public.ar_credit_memos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_ap_credit_memos
  AFTER INSERT OR UPDATE OR DELETE ON public.ap_credit_memos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_goods_receipts
  AFTER INSERT OR UPDATE OR DELETE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_financial_clearances
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_clearances
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
