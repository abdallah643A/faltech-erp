
-- Update business_partners SELECT policy to include branch_manager and region_manager
DROP POLICY "Users can view assigned or managed business partners" ON public.business_partners;

CREATE POLICY "Users can view assigned or managed business partners"
ON public.business_partners
FOR SELECT
TO public
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'branch_manager'::app_role, 'region_manager'::app_role])
);
