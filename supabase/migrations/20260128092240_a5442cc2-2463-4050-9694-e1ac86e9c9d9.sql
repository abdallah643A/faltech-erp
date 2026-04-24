-- Fix business_partners policy conflict (duplicate policies issue)
-- The migration 20260127134820 tried to drop policy with trailing space, but actual policy has no trailing space

-- Drop the overly permissive policy (without trailing space - the actual policy name)
DROP POLICY IF EXISTS "Authenticated users can view business partners" ON public.business_partners;

-- Also drop the version with trailing space (in case it exists)
DROP POLICY IF EXISTS "Authenticated users can view business partners " ON public.business_partners;

-- Ensure the restrictive policy exists (it should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'business_partners'
      AND policyname = 'Users can view assigned or managed business partners'
  ) THEN
    -- Create the restrictive policy if it doesn't exist
    EXECUTE 'CREATE POLICY "Users can view assigned or managed business partners" ON public.business_partners FOR SELECT USING ((assigned_to = auth.uid()) OR (created_by = auth.uid()) OR has_any_role(auth.uid(), ARRAY[''admin''::app_role, ''manager''::app_role]))';
  END IF;
END $$;

-- Fix profiles table policy conflict
-- Remove the conflicting "Block anonymous profile access" policy that returns false
-- This can cause confusion with other SELECT policies
DROP POLICY IF EXISTS "Block anonymous profile access" ON public.profiles;

-- The remaining SELECT policies properly validate authentication:
-- - "Admins can view all profiles" checks for admin role
-- - "Users can view their own profile" checks auth.uid() = user_id