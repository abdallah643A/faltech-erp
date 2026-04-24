
-- Add foreign key for user_id to profiles so edge function can join
ALTER TABLE public.workflow_notifications
ADD CONSTRAINT workflow_notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
