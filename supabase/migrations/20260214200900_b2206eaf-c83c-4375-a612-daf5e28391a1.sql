
-- Trigger function to send email via edge function when notification is created
CREATE OR REPLACE FUNCTION public.trigger_workflow_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the send-workflow-email edge function asynchronously
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-workflow-email',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the notification insert if email sending fails
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_workflow_email
AFTER INSERT ON workflow_notifications
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_workflow_email();
