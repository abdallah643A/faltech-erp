
-- Make insert policy more restrictive: users can only insert notifications for themselves
DROP POLICY "System can insert notifications" ON public.workflow_notifications;
CREATE POLICY "Users can insert own notifications"
ON public.workflow_notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
