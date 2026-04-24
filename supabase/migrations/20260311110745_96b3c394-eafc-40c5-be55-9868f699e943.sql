
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sap_user_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sap_internal_key INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sap_user BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_sap_user_code ON public.profiles(sap_user_code) WHERE sap_user_code IS NOT NULL;
