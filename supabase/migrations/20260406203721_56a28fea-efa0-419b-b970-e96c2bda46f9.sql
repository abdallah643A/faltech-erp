
-- Spreadsheet Workbooks
CREATE TABLE public.spreadsheet_workbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  workbook_type TEXT NOT NULL DEFAULT 'budget',
  status TEXT NOT NULL DEFAULT 'draft',
  owner_id UUID,
  owner_name TEXT,
  tags TEXT[],
  template_id UUID,
  is_locked BOOLEAN DEFAULT false,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.spreadsheet_workbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage workbooks" ON public.spreadsheet_workbooks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Templates
CREATE TABLE public.spreadsheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'budget',
  columns_config JSONB DEFAULT '[]',
  rows_config JSONB DEFAULT '[]',
  data_bindings JSONB DEFAULT '[]',
  default_formulas JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.spreadsheet_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage templates" ON public.spreadsheet_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sheets
CREATE TABLE public.spreadsheet_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID REFERENCES public.spreadsheet_workbooks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sheet1',
  sheet_order INT NOT NULL DEFAULT 1,
  columns_config JSONB DEFAULT '[]',
  frozen_rows INT DEFAULT 0,
  frozen_cols INT DEFAULT 0,
  data_source TEXT,
  data_bindings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spreadsheet_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage sheets" ON public.spreadsheet_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cells
CREATE TABLE public.spreadsheet_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES public.spreadsheet_sheets(id) ON DELETE CASCADE NOT NULL,
  row_index INT NOT NULL,
  col_index INT NOT NULL,
  value TEXT,
  formula TEXT,
  display_value TEXT,
  cell_type TEXT DEFAULT 'text',
  format TEXT,
  is_locked BOOLEAN DEFAULT false,
  style JSONB DEFAULT '{}',
  scenario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sheet_id, row_index, col_index, scenario_id)
);

ALTER TABLE public.spreadsheet_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage cells" ON public.spreadsheet_cells FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Scenarios
CREATE TABLE public.spreadsheet_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID REFERENCES public.spreadsheet_workbooks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'base',
  is_base BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.spreadsheet_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage scenarios" ON public.spreadsheet_scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Comments
CREATE TABLE public.spreadsheet_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES public.spreadsheet_sheets(id) ON DELETE CASCADE NOT NULL,
  row_index INT NOT NULL,
  col_index INT NOT NULL,
  comment TEXT NOT NULL,
  author_id UUID,
  author_name TEXT,
  mentions TEXT[],
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  parent_id UUID REFERENCES public.spreadsheet_comments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spreadsheet_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage comments" ON public.spreadsheet_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Versions
CREATE TABLE public.spreadsheet_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID REFERENCES public.spreadsheet_workbooks(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  snapshot_data JSONB,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_by_name TEXT
);

ALTER TABLE public.spreadsheet_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage versions" ON public.spreadsheet_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Writebacks
CREATE TABLE public.spreadsheet_writebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID REFERENCES public.spreadsheet_workbooks(id) ON DELETE CASCADE NOT NULL,
  scenario_id UUID REFERENCES public.spreadsheet_scenarios(id),
  target_module TEXT NOT NULL,
  target_table TEXT,
  changes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spreadsheet_writebacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage writebacks" ON public.spreadsheet_writebacks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ss_cells_sheet ON public.spreadsheet_cells(sheet_id);
CREATE INDEX idx_ss_cells_scenario ON public.spreadsheet_cells(scenario_id);
CREATE INDEX idx_ss_sheets_workbook ON public.spreadsheet_sheets(workbook_id);
CREATE INDEX idx_ss_comments_sheet ON public.spreadsheet_comments(sheet_id);
CREATE INDEX idx_ss_versions_workbook ON public.spreadsheet_versions(workbook_id);
CREATE INDEX idx_ss_writebacks_workbook ON public.spreadsheet_writebacks(workbook_id);
CREATE INDEX idx_ss_workbooks_company ON public.spreadsheet_workbooks(company_id);
