
-- SAP Sync Checkpoints
CREATE TABLE public.sap_sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_name TEXT NOT NULL,
  checkpoint_key TEXT NOT NULL DEFAULT 'update_date',
  checkpoint_value TEXT,
  last_successful_at TIMESTAMPTZ,
  total_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, entity_name, checkpoint_key)
);

CREATE TABLE public.sap_sync_row_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  entity_name TEXT NOT NULL,
  local_record_id TEXT NOT NULL,
  sap_doc_entry TEXT,
  sync_direction TEXT NOT NULL DEFAULT 'pull',
  status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sap_sync_row_state_lookup ON public.sap_sync_row_state(company_id, entity_name, local_record_id);
CREATE INDEX idx_sap_sync_row_state_status ON public.sap_sync_row_state(status) WHERE status != 'synced';

-- Global Search Index
CREATE TABLE public.search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  search_text TEXT NOT NULL,
  path TEXT,
  icon TEXT,
  company_id UUID REFERENCES public.sap_companies(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, record_id)
);

CREATE INDEX idx_search_index_text ON public.search_index USING gin(to_tsvector('english', search_text));
CREATE INDEX idx_search_index_company ON public.search_index(company_id);

-- Role Workspaces
CREATE TABLE public.role_workspace_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  layout TEXT DEFAULT 'dashboard',
  widgets JSONB DEFAULT '[]'::jsonb,
  shortcuts JSONB DEFAULT '[]'::jsonb,
  default_module TEXT,
  kpi_config JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_workspace_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pinned_shortcuts JSONB DEFAULT '[]'::jsonb,
  hidden_widgets TEXT[] DEFAULT '{}',
  custom_widgets JSONB DEFAULT '[]'::jsonb,
  theme_mode TEXT DEFAULT 'system',
  compact_mode BOOLEAN DEFAULT false,
  default_page TEXT,
  recent_items JSONB DEFAULT '[]'::jsonb,
  favorite_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Workflow Condition Rules
CREATE TABLE public.workflow_condition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.approval_templates(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.approval_stages(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'equals',
  compare_value TEXT,
  compare_values TEXT[],
  logic_group TEXT DEFAULT 'AND',
  group_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sap_sync_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_sync_row_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_workspace_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspace_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_condition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage sync checkpoints" ON public.sap_sync_checkpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users manage sync row state" ON public.sap_sync_row_state FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can search" ON public.search_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage search index" ON public.search_index FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users view workspace configs" ON public.role_workspace_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users manage workspace configs" ON public.role_workspace_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own preferences" ON public.user_workspace_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users manage workflow conditions" ON public.workflow_condition_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_sap_sync_checkpoints_ts BEFORE UPDATE ON public.sap_sync_checkpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sap_sync_row_state_ts BEFORE UPDATE ON public.sap_sync_row_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_role_workspace_configs_ts BEFORE UPDATE ON public.role_workspace_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_workspace_prefs_ts BEFORE UPDATE ON public.user_workspace_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
