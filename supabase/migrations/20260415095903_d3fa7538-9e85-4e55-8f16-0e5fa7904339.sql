
-- Metadata Entities (User Defined Tables registry)
CREATE TABLE public.metadata_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technical_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  plural_name TEXT,
  description TEXT,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'table',
  code_prefix TEXT,
  numbering_strategy TEXT DEFAULT 'auto',
  audit_enabled BOOLEAN NOT NULL DEFAULT true,
  soft_delete_enabled BOOLEAN NOT NULL DEFAULT false,
  attachments_enabled BOOLEAN NOT NULL DEFAULT false,
  workflow_ready BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID,
  version INTEGER NOT NULL DEFAULT 1,
  company_id TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metadata_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_entities" ON public.metadata_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_entities" ON public.metadata_entities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_entities" ON public.metadata_entities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_entities" ON public.metadata_entities FOR DELETE TO authenticated USING (true);

-- Metadata Fields (UDF definitions)
CREATE TABLE public.metadata_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES public.metadata_entities(id) ON DELETE CASCADE,
  base_table TEXT,
  technical_name TEXT NOT NULL,
  display_label TEXT NOT NULL,
  description TEXT,
  help_text TEXT,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_length INTEGER,
  field_precision INTEGER,
  field_scale INTEGER,
  default_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_unique BOOLEAN NOT NULL DEFAULT false,
  is_indexed BOOLEAN NOT NULL DEFAULT false,
  is_searchable BOOLEAN NOT NULL DEFAULT false,
  is_filterable BOOLEAN NOT NULL DEFAULT false,
  visible_in_form BOOLEAN NOT NULL DEFAULT true,
  visible_in_grid BOOLEAN NOT NULL DEFAULT true,
  is_read_only BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  section_name TEXT,
  tab_name TEXT,
  validation_rules JSONB,
  dropdown_options JSONB,
  lookup_config JSONB,
  is_primary_identifier BOOLEAN NOT NULL DEFAULT false,
  is_list_default BOOLEAN NOT NULL DEFAULT false,
  column_width INTEGER,
  format_pattern TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, technical_name),
  CONSTRAINT metadata_fields_base_or_entity CHECK (entity_id IS NOT NULL OR base_table IS NOT NULL)
);

ALTER TABLE public.metadata_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_fields" ON public.metadata_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_fields" ON public.metadata_fields FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_fields" ON public.metadata_fields FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_fields" ON public.metadata_fields FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_metadata_fields_entity ON public.metadata_fields(entity_id);
CREATE INDEX idx_metadata_fields_base_table ON public.metadata_fields(base_table) WHERE base_table IS NOT NULL;

-- Metadata Relationships
CREATE TABLE public.metadata_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  source_entity_id UUID REFERENCES public.metadata_entities(id) ON DELETE CASCADE,
  source_table TEXT,
  source_field TEXT NOT NULL,
  target_entity_id UUID REFERENCES public.metadata_entities(id) ON DELETE SET NULL,
  target_table TEXT,
  target_field TEXT NOT NULL DEFAULT 'id',
  relationship_type TEXT NOT NULL DEFAULT 'many_to_one',
  display_field TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metadata_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_relationships" ON public.metadata_relationships FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_relationships" ON public.metadata_relationships FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_relationships" ON public.metadata_relationships FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_relationships" ON public.metadata_relationships FOR DELETE TO authenticated USING (true);

-- Metadata Screens
CREATE TABLE public.metadata_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.metadata_entities(id) ON DELETE CASCADE,
  screen_type TEXT NOT NULL DEFAULT 'form',
  name TEXT NOT NULL,
  description TEXT,
  layout_config JSONB DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metadata_screens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_screens" ON public.metadata_screens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_screens" ON public.metadata_screens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_screens" ON public.metadata_screens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_screens" ON public.metadata_screens FOR DELETE TO authenticated USING (true);

-- Metadata Screen Sections
CREATE TABLE public.metadata_screen_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screen_id UUID NOT NULL REFERENCES public.metadata_screens(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  section_type TEXT NOT NULL DEFAULT 'group',
  columns INTEGER NOT NULL DEFAULT 2,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsible BOOLEAN NOT NULL DEFAULT false,
  is_collapsed_default BOOLEAN NOT NULL DEFAULT false,
  visibility_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metadata_screen_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_screen_sections" ON public.metadata_screen_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_screen_sections" ON public.metadata_screen_sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_screen_sections" ON public.metadata_screen_sections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_screen_sections" ON public.metadata_screen_sections FOR DELETE TO authenticated USING (true);

-- Metadata Screen Fields
CREATE TABLE public.metadata_screen_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.metadata_screen_sections(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.metadata_fields(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  col_span INTEGER NOT NULL DEFAULT 1,
  override_label TEXT,
  override_read_only BOOLEAN,
  override_required BOOLEAN,
  visibility_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.metadata_screen_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_metadata_screen_fields" ON public.metadata_screen_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_metadata_screen_fields" ON public.metadata_screen_fields FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_metadata_screen_fields" ON public.metadata_screen_fields FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_metadata_screen_fields" ON public.metadata_screen_fields FOR DELETE TO authenticated USING (true);

-- Query Folders
CREATE TABLE public.query_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.query_folders(id),
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.query_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_query_folders" ON public.query_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_query_folders" ON public.query_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_query_folders" ON public.query_folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_query_folders" ON public.query_folders FOR DELETE TO authenticated USING (true);

-- Saved Queries
CREATE TABLE public.saved_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  folder_id UUID REFERENCES public.query_folders(id) ON DELETE SET NULL,
  query_type TEXT NOT NULL DEFAULT 'visual',
  sql_text TEXT,
  visual_config JSONB,
  base_table TEXT,
  joins JSONB,
  selected_fields JSONB,
  filters JSONB,
  sort_config JSONB,
  group_by JSONB,
  aggregations JSONB,
  sharing TEXT NOT NULL DEFAULT 'private',
  shared_roles TEXT[],
  tags TEXT[],
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  row_limit INTEGER DEFAULT 1000,
  last_run_at TIMESTAMPTZ,
  last_run_by UUID,
  last_run_rows INTEGER,
  last_run_ms INTEGER,
  run_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_saved_queries" ON public.saved_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_saved_queries" ON public.saved_queries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_saved_queries" ON public.saved_queries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_saved_queries" ON public.saved_queries FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_saved_queries_folder ON public.saved_queries(folder_id);
CREATE INDEX idx_saved_queries_status ON public.saved_queries(status);

-- Saved Query Parameters
CREATE TABLE public.saved_query_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.saved_queries(id) ON DELETE CASCADE,
  param_name TEXT NOT NULL,
  display_label TEXT NOT NULL,
  param_type TEXT NOT NULL DEFAULT 'text',
  default_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  dropdown_options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_query_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_saved_query_parameters" ON public.saved_query_parameters FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_saved_query_parameters" ON public.saved_query_parameters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_saved_query_parameters" ON public.saved_query_parameters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_saved_query_parameters" ON public.saved_query_parameters FOR DELETE TO authenticated USING (true);

-- Report Definitions
CREATE TABLE public.report_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  data_source_type TEXT NOT NULL DEFAULT 'query',
  data_source_query_id UUID REFERENCES public.saved_queries(id) ON DELETE SET NULL,
  data_source_table TEXT,
  data_source_sql TEXT,
  page_size TEXT NOT NULL DEFAULT 'A4',
  page_orientation TEXT NOT NULL DEFAULT 'portrait',
  margin_top INTEGER DEFAULT 20,
  margin_bottom INTEGER DEFAULT 20,
  margin_left INTEGER DEFAULT 15,
  margin_right INTEGER DEFAULT 15,
  header_config JSONB DEFAULT '{}',
  footer_config JSONB DEFAULT '{}',
  columns_config JSONB DEFAULT '[]',
  grouping_config JSONB DEFAULT '[]',
  totals_config JSONB DEFAULT '[]',
  filters_config JSONB DEFAULT '[]',
  conditional_formatting JSONB DEFAULT '[]',
  sharing TEXT NOT NULL DEFAULT 'private',
  shared_roles TEXT[],
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_report_definitions" ON public.report_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_report_definitions" ON public.report_definitions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_report_definitions" ON public.report_definitions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_report_definitions" ON public.report_definitions FOR DELETE TO authenticated USING (true);

-- Report Elements
CREATE TABLE public.report_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'detail',
  content JSONB DEFAULT '{}',
  style JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visibility_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_report_elements" ON public.report_elements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_report_elements" ON public.report_elements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_report_elements" ON public.report_elements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_report_elements" ON public.report_elements FOR DELETE TO authenticated USING (true);

-- Report Parameters
CREATE TABLE public.report_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  param_name TEXT NOT NULL,
  display_label TEXT NOT NULL,
  param_type TEXT NOT NULL DEFAULT 'text',
  default_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  dropdown_options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_report_parameters" ON public.report_parameters FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_report_parameters" ON public.report_parameters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_report_parameters" ON public.report_parameters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_report_parameters" ON public.report_parameters FOR DELETE TO authenticated USING (true);

-- Schema Publish History
CREATE TABLE public.schema_publish_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES public.metadata_entities(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  changes_summary TEXT,
  snapshot JSONB,
  published_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schema_publish_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_schema_publish_history" ON public.schema_publish_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_schema_publish_history" ON public.schema_publish_history FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_metadata_entities_ts BEFORE UPDATE ON public.metadata_entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metadata_fields_ts BEFORE UPDATE ON public.metadata_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metadata_screens_ts BEFORE UPDATE ON public.metadata_screens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saved_queries_ts BEFORE UPDATE ON public.saved_queries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_report_definitions_ts BEFORE UPDATE ON public.report_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
