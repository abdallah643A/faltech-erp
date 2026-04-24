
-- Document Expiry Tracking
CREATE TABLE IF NOT EXISTS public.document_expiry_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  document_type TEXT NOT NULL DEFAULT 'other',
  document_name TEXT NOT NULL,
  document_number TEXT,
  description TEXT,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  urgency TEXT NOT NULL DEFAULT 'normal',
  owner_user_id UUID,
  owner_name TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  related_entity_name TEXT,
  reminder_days INTEGER[] DEFAULT ARRAY[90, 60, 30, 7, 1],
  last_reminder_sent_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  attachment_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_expiry_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document_expiry_records"
  ON public.document_expiry_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert document_expiry_records"
  ON public.document_expiry_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update document_expiry_records"
  ON public.document_expiry_records FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete document_expiry_records"
  ON public.document_expiry_records FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_der_expiry_date ON public.document_expiry_records(expiry_date);
CREATE INDEX idx_der_status ON public.document_expiry_records(status);
CREATE INDEX idx_der_company ON public.document_expiry_records(company_id);
CREATE INDEX idx_der_type ON public.document_expiry_records(document_type);
CREATE INDEX idx_der_owner ON public.document_expiry_records(owner_user_id);

CREATE TRIGGER update_document_expiry_records_updated_at
  BEFORE UPDATE ON public.document_expiry_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Renewal History
CREATE TABLE IF NOT EXISTS public.document_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.document_expiry_records(id) ON DELETE CASCADE,
  previous_expiry_date DATE,
  new_expiry_date DATE NOT NULL,
  renewal_cost NUMERIC(15,2),
  renewal_notes TEXT,
  attachment_url TEXT,
  renewed_by UUID,
  renewed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_renewal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view renewal history"
  ON public.document_renewal_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert renewal history"
  ON public.document_renewal_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_drh_document ON public.document_renewal_history(document_id);

-- Function to auto-calculate urgency based on expiry_date
CREATE OR REPLACE FUNCTION public.update_document_urgency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  days_remaining INTEGER;
BEGIN
  days_remaining := NEW.expiry_date - CURRENT_DATE;
  
  IF NEW.status = 'renewed' OR NEW.status = 'cancelled' THEN
    NEW.urgency := 'normal';
  ELSIF days_remaining < 0 THEN
    NEW.urgency := 'expired';
    IF NEW.status != 'expired' THEN
      NEW.status := 'expired';
    END IF;
  ELSIF days_remaining <= 7 THEN
    NEW.urgency := 'critical';
    IF NEW.status = 'active' THEN NEW.status := 'expiring_soon'; END IF;
  ELSIF days_remaining <= 30 THEN
    NEW.urgency := 'warning';
    IF NEW.status = 'active' THEN NEW.status := 'expiring_soon'; END IF;
  ELSIF days_remaining <= 90 THEN
    NEW.urgency := 'attention';
  ELSE
    NEW.urgency := 'normal';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_document_urgency
  BEFORE INSERT OR UPDATE ON public.document_expiry_records
  FOR EACH ROW EXECUTE FUNCTION public.update_document_urgency();
