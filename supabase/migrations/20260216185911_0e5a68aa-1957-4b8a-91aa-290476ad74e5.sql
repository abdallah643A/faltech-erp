
-- Add collected_amount to track partial payments against certificates
ALTER TABLE public.payment_certificates
  ADD COLUMN IF NOT EXISTS collected_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collection_status TEXT NOT NULL DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.payment_certificates.collected_amount IS 'Total amount collected so far against this certificate';
COMMENT ON COLUMN public.payment_certificates.collection_status IS 'pending, partial, collected';
