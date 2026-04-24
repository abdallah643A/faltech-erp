
-- Add enhanced sign-off columns
ALTER TABLE public.project_signoffs
  ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id),
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS sales_rating INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_rating INTEGER,
  ADD COLUMN IF NOT EXISTS installation_rating INTEGER,
  ADD COLUMN IF NOT EXISTS project_time_rating INTEGER,
  ADD COLUMN IF NOT EXISTS customer_feedback TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS questionnaire_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installation_task_id UUID REFERENCES public.installation_tasks(id);

-- Create unique index on questionnaire_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_signoff_questionnaire_token ON public.project_signoffs(questionnaire_token);

-- Create storage bucket for sign-off attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('signoff-attachments', 'signoff-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view signoff attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'signoff-attachments');

CREATE POLICY "Authenticated users can upload signoff attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signoff-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update signoff attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'signoff-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete signoff attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'signoff-attachments' AND auth.role() = 'authenticated');
