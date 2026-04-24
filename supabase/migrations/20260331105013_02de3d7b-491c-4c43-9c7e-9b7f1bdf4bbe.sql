
-- Add missing columns to cpms_projects (enum and columns may already exist from partial run)
DO $$ BEGIN
  ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'fixed_price';
  ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS percent_complete numeric DEFAULT 0;
  ALTER TABLE public.cpms_projects ADD COLUMN IF NOT EXISTS aia_enabled boolean DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS public.cpms_schedule_of_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.sap_companies(id),
  item_number text NOT NULL,
  description text NOT NULL,
  scheduled_value numeric NOT NULL DEFAULT 0,
  previous_billed_amount numeric DEFAULT 0,
  current_billed_amount numeric DEFAULT 0,
  materials_stored numeric DEFAULT 0,
  retainage_amount numeric DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cpms_progress_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.sap_companies(id),
  billing_number int NOT NULL DEFAULT 1,
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  period_from date,
  period_to date,
  total_completed numeric DEFAULT 0,
  total_stored numeric DEFAULT 0,
  gross_amount numeric DEFAULT 0,
  retainage_percent numeric DEFAULT 10,
  retainage_amount numeric DEFAULT 0,
  previous_certificates numeric DEFAULT 0,
  current_payment_due numeric DEFAULT 0,
  status text DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cpms_retention_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.cpms_projects(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.sap_companies(id),
  invoice_id uuid,
  billing_id uuid REFERENCES public.cpms_progress_billings(id),
  retention_amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'held',
  release_date date,
  release_invoice_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Ensure RLS policies exist (idempotent)
ALTER TABLE public.cpms_schedule_of_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_progress_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpms_retention_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_manage_sov" ON public.cpms_schedule_of_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "auth_manage_billings" ON public.cpms_progress_billings FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "auth_manage_retention" ON public.cpms_retention_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
