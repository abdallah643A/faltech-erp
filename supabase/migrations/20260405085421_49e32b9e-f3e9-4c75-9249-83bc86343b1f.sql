ALTER TABLE public.mail_configuration 
ADD COLUMN IF NOT EXISTS mail_provider text NOT NULL DEFAULT 'smtp',
ADD COLUMN IF NOT EXISTS api_provider text DEFAULT 'resend',
ADD COLUMN IF NOT EXISTS api_key text DEFAULT NULL;