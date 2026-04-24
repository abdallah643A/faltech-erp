
-- Create CSI MasterFormat cost codes table
CREATE TABLE IF NOT EXISTS public.cpms_cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  division_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  parent_code TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(code, company_id)
);

ALTER TABLE public.cpms_cost_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cost codes"
  ON public.cpms_cost_codes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create cost code budgets per project
CREATE TABLE IF NOT EXISTS public.cpms_cost_code_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cpms_cost_codes(id) ON DELETE CASCADE,
  budgeted_amount NUMERIC DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, cost_code_id)
);

ALTER TABLE public.cpms_cost_code_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cost code budgets"
  ON public.cpms_cost_code_budgets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed CSI MasterFormat divisions
INSERT INTO public.cpms_cost_codes (code, division_number, title, description) VALUES
  ('01', 1, 'General Requirements', 'Administrative and procedural requirements'),
  ('02', 2, 'Existing Conditions', 'Assessment, demolition, and remediation'),
  ('03', 3, 'Concrete', 'Concrete forming, reinforcing, and casting'),
  ('03.10', 3, 'Concrete Forming and Accessories', 'Forms and form accessories'),
  ('03.20', 3, 'Concrete Reinforcing', 'Reinforcing steel and accessories'),
  ('03.30', 3, 'Cast-in-Place Concrete', 'Structural and architectural concrete'),
  ('04', 4, 'Masonry', 'Unit masonry and stone assemblies'),
  ('05', 5, 'Metals', 'Structural and miscellaneous metals'),
  ('05.10', 5, 'Structural Metal Framing', 'Steel and aluminum framing'),
  ('05.50', 5, 'Metal Fabrications', 'Miscellaneous metal fabrications'),
  ('06', 6, 'Wood, Plastics, Composites', 'Rough and finish carpentry'),
  ('07', 7, 'Thermal & Moisture Protection', 'Waterproofing, insulation, roofing'),
  ('07.10', 7, 'Dampproofing and Waterproofing', 'Below-grade waterproofing'),
  ('07.20', 7, 'Thermal Insulation', 'Building insulation'),
  ('07.50', 7, 'Membrane Roofing', 'Built-up and single-ply roofing'),
  ('08', 8, 'Openings', 'Doors, windows, and glazing'),
  ('09', 9, 'Finishes', 'Plaster, gypsum, tile, flooring, painting'),
  ('09.20', 9, 'Plaster and Gypsum Board', 'Plaster and drywall systems'),
  ('09.30', 9, 'Tiling', 'Ceramic and stone tiling'),
  ('09.60', 9, 'Flooring', 'Resilient, carpet, and wood flooring'),
  ('09.90', 9, 'Painting and Coating', 'Interior and exterior painting'),
  ('10', 10, 'Specialties', 'Visual display, compartments, lockers'),
  ('11', 11, 'Equipment', 'Vehicle, commercial, and industrial equipment'),
  ('12', 12, 'Furnishings', 'Art, window treatments, furniture'),
  ('13', 13, 'Special Construction', 'Special structures and facilities'),
  ('14', 14, 'Conveying Equipment', 'Elevators, escalators, lifts'),
  ('21', 21, 'Fire Suppression', 'Fire suppression sprinkler systems'),
  ('22', 22, 'Plumbing', 'Plumbing fixtures and piping'),
  ('23', 23, 'HVAC', 'Heating, ventilation, and air conditioning'),
  ('26', 26, 'Electrical', 'Electrical distribution and lighting'),
  ('26.10', 26, 'Medium-Voltage Electrical', 'Medium-voltage distribution'),
  ('26.20', 26, 'Low-Voltage Electrical', 'Low-voltage power distribution'),
  ('26.50', 26, 'Lighting', 'Interior and exterior lighting'),
  ('27', 27, 'Communications', 'Structured cabling and AV systems'),
  ('28', 28, 'Electronic Safety & Security', 'Access control, surveillance, detection'),
  ('31', 31, 'Earthwork', 'Site clearing, excavation, fill'),
  ('31.10', 31, 'Site Clearing', 'Clearing and grubbing'),
  ('31.20', 31, 'Earth Moving', 'Excavation and fill'),
  ('32', 32, 'Exterior Improvements', 'Paving, fencing, landscaping'),
  ('33', 33, 'Utilities', 'Water, sewer, gas, power utilities')
ON CONFLICT DO NOTHING;
