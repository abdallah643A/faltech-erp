
-- =============================================
-- BID MANAGEMENT MODULE - Database Schema
-- =============================================

-- Bid status enum
CREATE TYPE public.bid_status AS ENUM (
  'draft', 'qualifying', 'in_progress', 'under_review', 
  'approved', 'submitted', 'won', 'lost', 'cancelled', 'no_bid'
);

-- Bid priority enum
CREATE TYPE public.bid_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- =============================================
-- 1. BID TEMPLATES
-- =============================================
CREATE TABLE public.bid_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'general', -- ITB, RFP, RFQ, general
  category TEXT,
  sections JSONB DEFAULT '[]'::jsonb, -- array of section definitions
  default_markup_percent NUMERIC DEFAULT 0,
  default_contingency_percent NUMERIC DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. BIDS (Main bid register)
-- =============================================
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  branch_id UUID REFERENCES public.branches(id),
  bid_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status bid_status DEFAULT 'draft',
  priority bid_priority DEFAULT 'medium',
  
  -- Client/opportunity info
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  business_partner_id UUID REFERENCES public.business_partners(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  
  -- Template
  template_id UUID REFERENCES public.bid_templates(id),
  
  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  submission_date DATE,
  decision_date DATE,
  
  -- Financial
  currency TEXT DEFAULT 'SAR',
  estimated_value NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  contingency_percent NUMERIC DEFAULT 5,
  overhead_percent NUMERIC DEFAULT 0,
  profit_percent NUMERIC DEFAULT 0,
  final_price NUMERIC DEFAULT 0,
  margin_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN final_price > 0 THEN ((final_price - total_cost) / final_price) * 100 ELSE 0 END
  ) STORED,
  
  -- Classification
  project_type TEXT, -- commercial, residential, industrial, infrastructure, government
  bid_type TEXT DEFAULT 'competitive', -- competitive, negotiated, sole_source, design_build
  sector TEXT, -- public, private
  region TEXT,
  
  -- Go/No-Go
  go_no_go_score NUMERIC,
  go_no_go_decision TEXT, -- go, no_go, pending
  go_no_go_criteria JSONB DEFAULT '{}'::jsonb,
  
  -- Win/Loss tracking
  win_loss_reason TEXT,
  win_loss_tags TEXT[], -- price, scope, relationship, timing, unknown
  competitor_bid_amount NUMERIC,
  competitor_name TEXT,
  lessons_learned TEXT,
  
  -- Documents
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Audit
  created_by UUID,
  submitted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. BID ITEMS / COST BREAKDOWN STRUCTURE (CBS)
-- =============================================
CREATE TABLE public.bid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.bid_items(id),
  line_num INT NOT NULL DEFAULT 1,
  item_code TEXT,
  description TEXT NOT NULL,
  category TEXT, -- material, labor, equipment, subcontractor, overhead, other
  
  -- Quantities
  quantity NUMERIC DEFAULT 0,
  unit TEXT, -- ea, sqm, lm, hr, kg, ton, etc.
  
  -- Pricing
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  markup_percent NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Source
  price_source TEXT, -- manual, price_list, supplier_quote, historical
  price_source_ref TEXT,
  price_last_updated TIMESTAMPTZ,
  
  -- Subcontractor
  subcontractor_name TEXT,
  subcontractor_quote_ref TEXT,
  
  -- Notes
  notes TEXT,
  sort_order INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. BID TEAM MEMBERS
-- =============================================
CREATE TABLE public.bid_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL, -- estimator, reviewer, coordinator, approver, subject_expert
  assigned_sections TEXT[],
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. BID REVIEWS / APPROVAL CHAIN
-- =============================================
CREATE TABLE public.bid_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID,
  reviewer_name TEXT NOT NULL,
  review_stage INT DEFAULT 1,
  stage_name TEXT, -- estimator_review, senior_review, pm_review, executive_approval
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, revision_requested
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. MATERIAL PRICE LIST (for cost estimation)
-- =============================================
CREATE TABLE public.bid_material_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  supplier_name TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  price_change_percent NUMERIC, -- vs previous price
  is_active BOOLEAN DEFAULT true,
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 7. LABOR RATE TABLES
-- =============================================
CREATE TABLE public.bid_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  trade TEXT NOT NULL, -- electrician, plumber, carpenter, etc.
  classification TEXT, -- journeyman, apprentice, foreman, superintendent
  region TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  overtime_multiplier NUMERIC DEFAULT 1.5,
  productivity_factor NUMERIC DEFAULT 1.0, -- crew efficiency
  currency TEXT DEFAULT 'SAR',
  effective_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.bid_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_labor_rates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (company-level filtering in app)
CREATE POLICY "auth_all_bid_templates" ON public.bid_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bids" ON public.bids FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bid_items" ON public.bid_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bid_team" ON public.bid_team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bid_reviews" ON public.bid_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bid_material_prices" ON public.bid_material_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bid_labor_rates" ON public.bid_labor_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_bids_company ON public.bids(company_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_bids_due_date ON public.bids(due_date);
CREATE INDEX idx_bid_items_bid ON public.bid_items(bid_id);
CREATE INDEX idx_bid_material_prices_company ON public.bid_material_prices(company_id);
CREATE INDEX idx_bid_labor_rates_company ON public.bid_labor_rates(company_id);
