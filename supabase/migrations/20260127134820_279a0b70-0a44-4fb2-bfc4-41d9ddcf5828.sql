-- Fix business_partners SELECT policy to restrict access to sensitive contact information
-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view business partners " ON public.business_partners;

-- Create a more restrictive policy: only assigned users, managers, and admins can view
CREATE POLICY "Users can view assigned or managed business partners"
ON public.business_partners
FOR SELECT
USING (
  assigned_to = auth.uid() 
  OR created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);