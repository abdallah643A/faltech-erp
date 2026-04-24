-- =========================================
-- Service & ITSM Suite
-- =========================================

-- 1. SLA Policies
CREATE TABLE public.svc_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  policy_name TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','critical')),
  first_response_minutes INTEGER NOT NULL DEFAULT 60,
  resolution_minutes INTEGER NOT NULL DEFAULT 480,
  business_hours_only BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Service Contracts
CREATE TABLE public.svc_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  contract_number TEXT NOT NULL UNIQUE,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  sla_policy_id UUID REFERENCES public.svc_sla_policies(id),
  coverage_type TEXT NOT NULL DEFAULT 'standard',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','suspended')),
  monthly_value NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.svc_contract_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.svc_contracts(id) ON DELETE CASCADE,
  asset_id UUID,
  asset_code TEXT,
  asset_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Technicians
CREATE TABLE public.svc_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  employee_id UUID,
  technician_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  zones TEXT[] DEFAULT ARRAY[]::TEXT[],
  working_hours JSONB DEFAULT '{"start":"08:00","end":"17:00","days":[1,2,3,4,5]}'::jsonb,
  daily_capacity_hours NUMERIC(4,2) DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tickets
CREATE TABLE public.svc_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  ticket_type TEXT NOT NULL DEFAULT 'incident' CHECK (ticket_type IN ('incident','request','problem','change','field_service')),
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','in_progress','pending_customer','resolved','closed','cancelled')),
  source TEXT DEFAULT 'portal',
  requester_id UUID,
  requester_name TEXT,
  requester_email TEXT,
  customer_id UUID,
  customer_name TEXT,
  asset_id UUID,
  asset_code TEXT,
  contract_id UUID REFERENCES public.svc_contracts(id),
  sla_policy_id UUID REFERENCES public.svc_sla_policies(id),
  assigned_technician_id UUID REFERENCES public.svc_technicians(id),
  assigned_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  due_first_response_at TIMESTAMPTZ,
  due_resolution_at TIMESTAMPTZ,
  is_breached BOOLEAN NOT NULL DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_svc_tickets_status ON public.svc_tickets(status);
CREATE INDEX idx_svc_tickets_assigned ON public.svc_tickets(assigned_technician_id);
CREATE INDEX idx_svc_tickets_asset ON public.svc_tickets(asset_id);
CREATE INDEX idx_svc_tickets_due ON public.svc_tickets(due_resolution_at) WHERE status NOT IN ('resolved','closed','cancelled');

-- 5. Comments / communication log
CREATE TABLE public.svc_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  channel TEXT NOT NULL DEFAULT 'internal' CHECK (channel IN ('internal','customer','email','phone','chat','whatsapp')),
  message TEXT NOT NULL,
  is_first_response BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svc_comments_ticket ON public.svc_ticket_comments(ticket_id);

-- 6. SLA Timers
CREATE TABLE public.svc_sla_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  timer_type TEXT NOT NULL CHECK (timer_type IN ('first_response','resolution')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  total_paused_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  is_breached BOOLEAN NOT NULL DEFAULT false,
  breach_detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svc_timers_ticket ON public.svc_sla_timers(ticket_id);
CREATE INDEX idx_svc_timers_due ON public.svc_sla_timers(due_at) WHERE completed_at IS NULL;

-- 7. Escalations
CREATE TABLE public.svc_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('sla_breach','manual','rule')),
  escalated_to UUID,
  escalated_to_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 8. Knowledge Base
CREATE TABLE public.svc_kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  article_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT NOT NULL,
  body_ar TEXT,
  category TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.svc_kb_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.svc_kb_articles(id) ON DELETE CASCADE,
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, article_id)
);

-- 9. Field Visits
CREATE TABLE public.svc_field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.svc_technicians(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','en_route','on_site','completed','cancelled','no_show')),
  visit_notes TEXT,
  signature_url TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  travel_distance_km NUMERIC(8,2),
  zone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svc_visits_tech_time ON public.svc_field_visits(technician_id, scheduled_start);

-- 10. CSAT Responses
CREATE TABLE public.svc_csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  responder_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Maintenance Links (bi-directional)
CREATE TABLE public.svc_maintenance_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.svc_tickets(id) ON DELETE CASCADE,
  work_order_id UUID,
  maintenance_plan_id UUID,
  link_direction TEXT NOT NULL CHECK (link_direction IN ('ticket_to_wo','wo_to_ticket','plan_scheduled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- 12. First-Response & KPI snapshots
CREATE TABLE public.svc_first_response_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  metric_date DATE NOT NULL,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  avg_first_response_minutes NUMERIC(10,2),
  avg_resolution_minutes NUMERIC(10,2),
  sla_breach_count INTEGER NOT NULL DEFAULT 0,
  sla_breach_rate NUMERIC(5,2),
  csat_average NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, metric_date)
);

-- =========================================
-- Triggers
-- =========================================

-- Auto-stamp SLA due dates when ticket created/policy assigned
CREATE OR REPLACE FUNCTION public.svc_stamp_sla_due_dates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_policy svc_sla_policies%ROWTYPE;
BEGIN
  IF NEW.sla_policy_id IS NOT NULL THEN
    SELECT * INTO v_policy FROM svc_sla_policies WHERE id = NEW.sla_policy_id;
    IF FOUND THEN
      NEW.due_first_response_at := COALESCE(NEW.due_first_response_at, NEW.created_at + (v_policy.first_response_minutes || ' minutes')::interval);
      NEW.due_resolution_at := COALESCE(NEW.due_resolution_at, NEW.created_at + (v_policy.resolution_minutes || ' minutes')::interval);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_svc_tickets_sla
BEFORE INSERT OR UPDATE OF sla_policy_id ON public.svc_tickets
FOR EACH ROW EXECUTE FUNCTION public.svc_stamp_sla_due_dates();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.svc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER trg_svc_contracts_upd BEFORE UPDATE ON public.svc_contracts FOR EACH ROW EXECUTE FUNCTION public.svc_set_updated_at();
CREATE TRIGGER trg_svc_techs_upd BEFORE UPDATE ON public.svc_technicians FOR EACH ROW EXECUTE FUNCTION public.svc_set_updated_at();
CREATE TRIGGER trg_svc_kb_upd BEFORE UPDATE ON public.svc_kb_articles FOR EACH ROW EXECUTE FUNCTION public.svc_set_updated_at();
CREATE TRIGGER trg_svc_visits_upd BEFORE UPDATE ON public.svc_field_visits FOR EACH ROW EXECUTE FUNCTION public.svc_set_updated_at();
CREATE TRIGGER trg_svc_sla_upd BEFORE UPDATE ON public.svc_sla_policies FOR EACH ROW EXECUTE FUNCTION public.svc_set_updated_at();

-- Mark first response on first customer-channel comment
CREATE OR REPLACE FUNCTION public.svc_mark_first_response()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.channel IN ('customer','email','phone','chat','whatsapp') THEN
    UPDATE svc_tickets
       SET first_response_at = COALESCE(first_response_at, NEW.created_at)
     WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    NEW.is_first_response := true;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_svc_comments_fr
BEFORE INSERT ON public.svc_ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.svc_mark_first_response();

-- =========================================
-- RLS
-- =========================================
ALTER TABLE public.svc_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_contract_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_sla_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_kb_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_csat_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_maintenance_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.svc_first_response_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'svc_sla_policies','svc_contracts','svc_contract_assets','svc_technicians',
    'svc_tickets','svc_ticket_comments','svc_sla_timers','svc_escalations',
    'svc_kb_articles','svc_kb_links','svc_field_visits','svc_csat_responses',
    'svc_maintenance_links','svc_first_response_metrics'
  ]) LOOP
    EXECUTE format('CREATE POLICY "svc_auth_read_%I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "svc_auth_write_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "svc_auth_update_%I" ON public.%I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "svc_auth_delete_%I" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Published KB articles readable by anon (for portal)
CREATE POLICY "svc_kb_public_read" ON public.svc_kb_articles
  FOR SELECT TO anon USING (status = 'published');
