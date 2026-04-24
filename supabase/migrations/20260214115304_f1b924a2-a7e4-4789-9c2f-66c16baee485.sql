-- Add user_code column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;

-- Create index for fast lookup by user_code
CREATE INDEX IF NOT EXISTS idx_profiles_user_code ON public.profiles (user_code) WHERE user_code IS NOT NULL;
