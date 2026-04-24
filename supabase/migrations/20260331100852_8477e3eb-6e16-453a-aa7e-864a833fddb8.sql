
-- Add CPMS project linking and retention fields to ar_invoices
ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS cpms_project_id uuid REFERENCES public.cpms_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS retention_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_after_retention numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_cpms_project ON public.ar_invoices(cpms_project_id);
