
DROP POLICY IF EXISTS "Auth users manage match exceptions" ON public.match_exceptions;
CREATE POLICY "Roles manage match exceptions" ON public.match_exceptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'finance'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'finance'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role));

DROP POLICY IF EXISTS "Auth users manage match overrides" ON public.match_override_requests;
CREATE POLICY "Buyers create overrides" ON public.match_override_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Managers update overrides" ON public.match_override_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'finance'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role));

DROP POLICY IF EXISTS "Auth users manage onboarding apps" ON public.supplier_onboarding_applications;
CREATE POLICY "Users create onboarding apps" ON public.supplier_onboarding_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or managers update onboarding apps" ON public.supplier_onboarding_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (true);
CREATE POLICY "Managers delete onboarding apps" ON public.supplier_onboarding_applications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role));
