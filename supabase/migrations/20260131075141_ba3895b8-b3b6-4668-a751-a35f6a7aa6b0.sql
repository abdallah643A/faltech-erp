-- Drop the overly permissive policy and create a more secure one
DROP POLICY IF EXISTS "Service role can update logs" ON public.whatsapp_logs;

-- Create a policy that only allows admins/managers to update logs (webhooks will use service role key)
CREATE POLICY "Admins and managers can update logs"
ON public.whatsapp_logs
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));