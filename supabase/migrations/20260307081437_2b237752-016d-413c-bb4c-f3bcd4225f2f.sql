
-- Follow-up rules table for automated task creation
CREATE TABLE IF NOT EXISTS public.follow_up_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'no_activity',
  trigger_days integer NOT NULL DEFAULT 7,
  action_type text NOT NULL DEFAULT 'create_task',
  action_config jsonb DEFAULT '{}',
  entity_type text NOT NULL DEFAULT 'lead',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.follow_up_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read follow_up_rules" ON public.follow_up_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage follow_up_rules" ON public.follow_up_rules
  FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Follow-up log table to track what was generated
CREATE TABLE IF NOT EXISTS public.follow_up_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.follow_up_rules(id) ON DELETE SET NULL,
  business_partner_id uuid REFERENCES public.business_partners(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  action_taken text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.follow_up_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read follow_up_logs" ON public.follow_up_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert follow_up_logs" ON public.follow_up_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default follow-up rules
INSERT INTO public.follow_up_rules (name, description, trigger_type, trigger_days, action_type, action_config, entity_type) VALUES
  ('Inactive Lead Follow-up', 'Create a follow-up task when a lead has no activity for 7 days', 'no_activity', 7, 'create_task', '{"priority": "high", "type": "call", "subject_template": "Follow up with {name} - No activity for {days} days"}', 'lead'),
  ('Stale Opportunity Alert', 'Alert when an opportunity has no updates for 14 days', 'no_activity', 14, 'create_task', '{"priority": "high", "type": "task", "subject_template": "Review stale opportunity: {name}"}', 'opportunity'),
  ('New Lead Welcome', 'Create a welcome call task 1 day after lead creation', 'after_creation', 1, 'create_task', '{"priority": "medium", "type": "call", "subject_template": "Welcome call to {name}"}', 'lead'),
  ('Overdue Activity Escalation', 'Escalate activities overdue by more than 3 days', 'overdue_activity', 3, 'create_notification', '{"priority": "high", "subject_template": "ESCALATION: {name} has overdue activities"}', 'lead')
ON CONFLICT DO NOTHING;
