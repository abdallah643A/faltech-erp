-- Add onboarding flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Create storage bucket for print assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-assets', 'print-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for print-assets
CREATE POLICY "Public read on print-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'print-assets');

CREATE POLICY "Authenticated users can upload print-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'print-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update print-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'print-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete print-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'print-assets' AND auth.role() = 'authenticated');