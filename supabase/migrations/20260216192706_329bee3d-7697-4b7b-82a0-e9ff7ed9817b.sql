
-- SLA configuration per phase
CREATE TABLE public.phase_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL UNIQUE,
  phase_label TEXT NOT NULL,
  max_days INT NOT NULL DEFAULT 7,
  escalation_1_days INT NOT NULL DEFAULT 0,  -- after max_days, notify region_manager
  escalation_2_days INT NOT NULL DEFAULT 2,  -- after max_days + 2, notify general_manager
  escalation_3_days INT NOT NULL DEFAULT 6,  -- after max_days + 6, notify CEO
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.phase_sla_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA config"
ON public.phase_sla_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage SLA config"
ON public.phase_sla_config FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Insert default SLA days per phase
INSERT INTO public.phase_sla_config (phase, phase_label, max_days) VALUES
  ('sales_initiation', 'Sales Initiation', 3),
  ('finance_verification', 'Finance Verification (Gate 1)', 5),
  ('operations_verification', 'Technical Assessment', 7),
  ('design_costing', 'Design & Costing', 10),
  ('finance_gate_2', 'Finance Gate 2', 5),
  ('procurement', 'Procurement', 14),
  ('production', 'Manufacturing', 21),
  ('final_payment', 'Final Payment', 7),
  ('logistics', 'Delivery & Installation', 10),
  ('completed', 'Completed', 1);

-- Add escalation tracking to project_phases
ALTER TABLE public.project_phases 
  ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalation_at TIMESTAMPTZ;

-- SLA escalation log
CREATE TABLE public.sla_escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  escalation_level INT NOT NULL,
  target_role TEXT NOT NULL,
  notified_user_id UUID,
  days_overdue INT NOT NULL,
  max_days INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sla_escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view escalation log"
ON public.sla_escalation_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert escalation log"
ON public.sla_escalation_log FOR INSERT TO authenticated WITH CHECK (true);
