
-- Sync error logs table
CREATE TABLE public.sync_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  entity_code text,
  direction text DEFAULT 'from_sap',
  error_message text NOT NULL,
  error_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.sync_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync error logs"
ON public.sync_error_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sync error logs"
ON public.sync_error_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync error logs"
ON public.sync_error_logs FOR UPDATE TO authenticated USING (true);

-- Add last_sync_error to payment_means_accounts
ALTER TABLE public.payment_means_accounts ADD COLUMN IF NOT EXISTS last_sync_error text;

-- Index for quick lookups
CREATE INDEX idx_sync_error_logs_entity_type ON public.sync_error_logs(entity_type);
CREATE INDEX idx_sync_error_logs_created_at ON public.sync_error_logs(created_at DESC);
