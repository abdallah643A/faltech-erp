-- Grant admin role to all existing authenticated users so they can manage SAP companies.
-- This is safe for initial setup; subsequent users can be managed via the Users admin UI.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin'::app_role
);

-- Also create profiles for any auth users missing one, so the app's profile lookups work.
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);