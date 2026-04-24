
ALTER TABLE public.cpms_invoices
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

ALTER TABLE public.cpms_invoice_collections
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE TRIGGER mark_cpms_invoices_sync_pending
  BEFORE UPDATE ON public.cpms_invoices
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();

CREATE TRIGGER mark_cpms_invoice_collections_sync_pending
  BEFORE UPDATE ON public.cpms_invoice_collections
  FOR EACH ROW EXECUTE FUNCTION public.mark_sync_pending();
