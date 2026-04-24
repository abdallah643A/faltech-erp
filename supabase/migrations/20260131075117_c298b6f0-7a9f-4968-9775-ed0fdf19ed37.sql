-- Add api_provider column to whatsapp_config table
ALTER TABLE public.whatsapp_config
ADD COLUMN api_provider text NOT NULL DEFAULT '360dialog';

-- Add instance_id column for Green API (similar to phone_number_id for 360dialog)
ALTER TABLE public.whatsapp_config
ADD COLUMN instance_id text NULL;

-- Update whatsapp_logs to track delivery status updates
ALTER TABLE public.whatsapp_logs
ADD COLUMN delivered_at timestamp with time zone NULL,
ADD COLUMN read_at timestamp with time zone NULL,
ADD COLUMN failed_at timestamp with time zone NULL;

-- Allow UPDATE on whatsapp_logs for webhook status updates (using service role only)
CREATE POLICY "Service role can update logs"
ON public.whatsapp_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add comment for clarity
COMMENT ON COLUMN public.whatsapp_config.api_provider IS 'WhatsApp API provider: 360dialog or greenapi';
COMMENT ON COLUMN public.whatsapp_config.instance_id IS 'Green API instance ID (only used with greenapi provider)';