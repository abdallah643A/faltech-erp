
-- Phase 2 ZATCA: Add columns for invoice chaining and cryptographic stamps
ALTER TABLE public.zatca_settings 
  ADD COLUMN IF NOT EXISTS invoice_counter integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_invoice_hash text,
  ADD COLUMN IF NOT EXISTS otp text,
  ADD COLUMN IF NOT EXISTS compliance_secret text,
  ADD COLUMN IF NOT EXISTS production_secret text;

ALTER TABLE public.zatca_submissions
  ADD COLUMN IF NOT EXISTS invoice_counter integer,
  ADD COLUMN IF NOT EXISTS previous_invoice_hash text,
  ADD COLUMN IF NOT EXISTS signed_xml text;

-- Mobile Site Manager: Daily Progress Reports
CREATE TABLE IF NOT EXISTS public.site_daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  project_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  weather text,
  temperature numeric,
  workforce_count integer DEFAULT 0,
  subcontractor_count integer DEFAULT 0,
  work_summary text,
  work_areas text,
  delays text,
  safety_incidents integer DEFAULT 0,
  safety_notes text,
  equipment_used text,
  visitor_log text,
  photos text[] DEFAULT '{}',
  gps_lat numeric,
  gps_lng numeric,
  gps_accuracy numeric,
  status text DEFAULT 'draft',
  submitted_at timestamptz,
  submitted_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage site progress"
  ON public.site_daily_progress FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Mobile Site Manager: Material Arrivals
CREATE TABLE IF NOT EXISTS public.site_material_arrivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sap_companies(id),
  project_id uuid NOT NULL,
  arrival_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text,
  material_name text NOT NULL,
  material_code text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'pcs',
  delivery_note_number text,
  condition text DEFAULT 'good',
  condition_notes text,
  photos text[] DEFAULT '{}',
  gps_lat numeric,
  gps_lng numeric,
  received_by text,
  po_reference text,
  status text DEFAULT 'received',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_material_arrivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage material arrivals"
  ON public.site_material_arrivals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_site_daily_progress_updated_at
  BEFORE UPDATE ON public.site_daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_material_arrivals_updated_at
  BEFORE UPDATE ON public.site_material_arrivals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
