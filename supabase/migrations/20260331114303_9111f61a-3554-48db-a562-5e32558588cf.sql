
-- Create storage bucket for CPMS document attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('cpms-documents', 'cpms-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload cpms docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cpms-documents');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read cpms docs" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'cpms-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete cpms docs" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'cpms-documents');
