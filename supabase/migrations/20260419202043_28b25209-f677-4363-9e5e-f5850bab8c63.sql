
-- Runs: each invocation of the copilot edge function
CREATE TABLE public.ai_copilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  module text NOT NULL CHECK (module IN ('crm','finance','procurement','cpms','executive')),
  capability text NOT NULL CHECK (capability IN ('next_best_action','anomaly','forecast','narrative')),
  prompt text,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  latency_ms integer,
  token_usage jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
  error_message text,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Suggestions: discrete actions/insights produced by a run
CREATE TABLE public.ai_copilot_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.ai_copilot_runs(id) ON DELETE CASCADE,
  company_id uuid,
  module text NOT NULL,
  capability text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  explanation text NOT NULL,            -- "why" — explainability
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,  -- record refs the AI used
  recommended_action jsonb,              -- structured action payload (optional)
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  confidence numeric(4,3),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','executed','expired')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  executed_at timestamptz,
  execution_result jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.ai_copilot_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES public.ai_copilot_suggestions(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ai_copilot_runs(id) ON DELETE SET NULL,
  company_id uuid,
  module text,
  event text NOT NULL CHECK (event IN ('generated','viewed','approved','rejected','executed','expired','failed')),
  actor_id uuid,
  actor_role text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permissions matrix
CREATE TABLE public.ai_copilot_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  capability text NOT NULL,
  can_request boolean NOT NULL DEFAULT true,
  can_approve boolean NOT NULL DEFAULT false,
  can_execute boolean NOT NULL DEFAULT false,
  max_risk_level text NOT NULL DEFAULT 'low' CHECK (max_risk_level IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module, capability)
);

-- Indexes
CREATE INDEX idx_ai_suggestions_company_status ON public.ai_copilot_suggestions(company_id, status);
CREATE INDEX idx_ai_suggestions_module ON public.ai_copilot_suggestions(module, capability);
CREATE INDEX idx_ai_audit_suggestion ON public.ai_copilot_audit_log(suggestion_id);
CREATE INDEX idx_ai_runs_company ON public.ai_copilot_runs(company_id, created_at DESC);

-- RLS
ALTER TABLE public.ai_copilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read runs" ON public.ai_copilot_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write runs" ON public.ai_copilot_runs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read suggestions" ON public.ai_copilot_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert suggestions" ON public.ai_copilot_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update suggestions" ON public.ai_copilot_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read audit" ON public.ai_copilot_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert audit" ON public.ai_copilot_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read perms" ON public.ai_copilot_permissions FOR SELECT TO authenticated USING (true);

-- updated_at trigger
CREATE TRIGGER trg_ai_copilot_suggestions_updated
  BEFORE UPDATE ON public.ai_copilot_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions matrix (low-risk advisory for Manager, full for Executive/Admin)
INSERT INTO public.ai_copilot_permissions (role, module, capability, can_request, can_approve, can_execute, max_risk_level) VALUES
  ('admin','crm','next_best_action',true,true,true,'high'),
  ('admin','crm','anomaly',true,true,true,'high'),
  ('admin','crm','forecast',true,true,true,'high'),
  ('admin','crm','narrative',true,true,true,'high'),
  ('admin','finance','next_best_action',true,true,true,'high'),
  ('admin','finance','anomaly',true,true,true,'high'),
  ('admin','finance','forecast',true,true,true,'high'),
  ('admin','finance','narrative',true,true,true,'high'),
  ('admin','procurement','next_best_action',true,true,true,'high'),
  ('admin','procurement','anomaly',true,true,true,'high'),
  ('admin','procurement','forecast',true,true,true,'high'),
  ('admin','procurement','narrative',true,true,true,'high'),
  ('admin','cpms','next_best_action',true,true,true,'high'),
  ('admin','cpms','anomaly',true,true,true,'high'),
  ('admin','cpms','forecast',true,true,true,'high'),
  ('admin','cpms','narrative',true,true,true,'high'),
  ('admin','executive','next_best_action',true,true,true,'high'),
  ('admin','executive','anomaly',true,true,true,'high'),
  ('admin','executive','forecast',true,true,true,'high'),
  ('admin','executive','narrative',true,true,true,'high'),
  ('manager','executive','narrative',true,false,false,'low'),
  ('manager','executive','anomaly',true,false,false,'medium'),
  ('manager','finance','anomaly',true,false,false,'medium'),
  ('manager','finance','narrative',true,false,false,'low'),
  ('manager','crm','next_best_action',true,false,false,'low'),
  ('manager','crm','narrative',true,false,false,'low'),
  ('manager','procurement','anomaly',true,false,false,'medium'),
  ('manager','cpms','narrative',true,false,false,'low')
ON CONFLICT DO NOTHING;
