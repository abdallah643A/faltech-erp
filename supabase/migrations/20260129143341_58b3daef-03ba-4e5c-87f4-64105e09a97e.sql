-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Update existing profiles to be active
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;