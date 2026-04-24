
-- Fix profiles: drop the broken ALL policy, create proper per-operation policies
DROP POLICY "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
