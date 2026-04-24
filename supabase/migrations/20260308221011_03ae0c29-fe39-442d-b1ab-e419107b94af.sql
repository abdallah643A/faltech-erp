
-- Fixed Asset Capitalizations
CREATE TABLE IF NOT EXISTS public.asset_capitalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  capitalization_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_number TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_capitalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_capitalizations" ON public.asset_capitalizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fixed Asset Capitalization Credit Memos
CREATE TABLE IF NOT EXISTS public.asset_capitalization_credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  capitalization_id UUID REFERENCES public.asset_capitalizations(id),
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_capitalization_credit_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_cap_credit_memos" ON public.asset_capitalization_credit_memos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fixed Asset Retirements
CREATE TABLE IF NOT EXISTS public.asset_retirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  retirement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retirement_type TEXT NOT NULL DEFAULT 'sale',
  proceeds NUMERIC DEFAULT 0,
  net_book_value NUMERIC DEFAULT 0,
  gain_loss NUMERIC DEFAULT 0,
  reason TEXT,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_retirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_retirements" ON public.asset_retirements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Depreciation Runs
CREATE TABLE IF NOT EXISTS public.depreciation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL,
  total_assets INT DEFAULT 0,
  total_depreciation NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.depreciation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_dep_runs" ON public.depreciation_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Depreciation Run Lines
CREATE TABLE IF NOT EXISTS public.depreciation_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.depreciation_runs(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  depreciation_amount NUMERIC NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  net_book_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.depreciation_run_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_dep_run_lines" ON public.depreciation_run_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Manual Depreciation entries
CREATE TABLE IF NOT EXISTS public.manual_depreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  depreciation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_depreciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_manual_dep" ON public.manual_depreciations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Asset Revaluations
CREATE TABLE IF NOT EXISTS public.asset_revaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  revaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  old_value NUMERIC NOT NULL DEFAULT 0,
  new_value NUMERIC NOT NULL DEFAULT 0,
  revaluation_difference NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_revaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_manage_revaluations" ON public.asset_revaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
