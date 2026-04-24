
-- Add SAP sync fields to opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS interest_field TEXT,
  ADD COLUMN IF NOT EXISTS territory INTEGER,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS closing_type TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS max_local_total NUMERIC,
  ADD COLUMN IF NOT EXISTS weighted_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS current_stage_no INTEGER,
  ADD COLUMN IF NOT EXISTS project_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_code TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add SAP sync fields to activities table
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_time TEXT,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS duration NUMERIC,
  ADD COLUMN IF NOT EXISTS duration_type TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS sales_employee_code INTEGER,
  ADD COLUMN IF NOT EXISTS contact_person_code INTEGER,
  ADD COLUMN IF NOT EXISTS card_code TEXT,
  ADD COLUMN IF NOT EXISTS doc_entry TEXT,
  ADD COLUMN IF NOT EXISTS doc_type TEXT,
  ADD COLUMN IF NOT EXISTS handled TEXT DEFAULT 'tNO';

-- Create indexes for SAP sync lookups
CREATE INDEX IF NOT EXISTS idx_opportunities_sap_doc_entry ON public.opportunities(sap_doc_entry);
CREATE INDEX IF NOT EXISTS idx_activities_sap_doc_entry ON public.activities(sap_doc_entry);
