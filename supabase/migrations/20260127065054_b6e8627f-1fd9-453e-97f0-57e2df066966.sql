-- Fix 1: Block anonymous access to profiles table
CREATE POLICY "Block anonymous profile access"
  ON public.profiles FOR SELECT
  TO anon
  USING (false);

-- Fix 2: Make visit-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'visit-images';

-- Fix 3: Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view visit images" ON storage.objects;

-- Fix 4: Create authenticated-only view policy for visit images
CREATE POLICY "Authenticated users can view visit images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'visit-images');