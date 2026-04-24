-- Add UPDATE policy for sync_logs so the sync function can update log status
-- Using service role key bypasses RLS, but we should have proper policies

-- First check if sales_rep role should also be able to use SAP sync
-- Based on existing policies, managers and admins can manage sync logs
-- Adding policy for consistency

CREATE POLICY "Managers and admins can update sync logs"
ON public.sync_logs
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));