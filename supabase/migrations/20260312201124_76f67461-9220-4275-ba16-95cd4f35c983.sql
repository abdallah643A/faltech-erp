
-- Create a function that marks sync_status as 'pending' when a record is locally modified
-- (only if the update is NOT coming from a sync operation setting sync_status itself)
CREATE OR REPLACE FUNCTION public.mark_sync_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if this update is already setting sync_status (i.e., from the sync process itself)
  IF NEW.sync_status IS DISTINCT FROM OLD.sync_status THEN
    RETURN NEW;
  END IF;
  -- Skip if last_synced_at just changed (sync operation)
  IF NEW.last_synced_at IS DISTINCT FROM OLD.last_synced_at THEN
    RETURN NEW;
  END IF;
  -- Mark as pending so next push picks it up
  NEW.sync_status := 'pending';
  RETURN NEW;
END;
$$;

-- Apply trigger to all major sync-enabled tables
CREATE TRIGGER trg_mark_sync_pending_business_partners
  BEFORE UPDATE ON public.business_partners
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_sales_orders
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_ar_invoices
  BEFORE UPDATE ON public.ar_invoices
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_opportunities
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_activities
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_quotes
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_incoming_payments
  BEFORE UPDATE ON public.incoming_payments
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_purchase_requests
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_purchase_orders
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_purchase_quotations
  BEFORE UPDATE ON public.purchase_quotations
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_goods_receipts
  BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_ap_invoices
  BEFORE UPDATE ON public.ap_invoices
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER trg_mark_sync_pending_delivery_notes
  BEFORE UPDATE ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();
