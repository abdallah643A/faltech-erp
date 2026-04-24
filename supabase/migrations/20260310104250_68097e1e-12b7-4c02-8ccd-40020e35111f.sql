
-- User Defaults table (SAP-style per-user defaults)
CREATE TABLE public.user_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  default_warehouse VARCHAR(50),
  default_sales_employee_code INT,
  default_price_list INT,
  default_payment_terms VARCHAR(100),
  default_tax_group VARCHAR(50),
  sap_user_code VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Default Series table (per-user per-document-type default series)
CREATE TABLE public.user_default_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  object_code VARCHAR(50) NOT NULL,
  series INT NOT NULL,
  series_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, object_code)
);

-- User Document Authorizations table (per-user per-document CRUD)
CREATE TABLE public.user_document_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_print BOOLEAN NOT NULL DEFAULT true,
  can_close BOOLEAN NOT NULL DEFAULT false,
  can_cancel BOOLEAN NOT NULL DEFAULT false,
  max_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_type)
);

-- Enable RLS
ALTER TABLE public.user_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_default_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_document_authorizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_defaults
CREATE POLICY "Users can view own defaults" ON public.user_defaults
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own defaults" ON public.user_defaults
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own defaults" ON public.user_defaults
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_default_series
CREATE POLICY "Users can view own default series" ON public.user_default_series
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own default series" ON public.user_default_series
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_document_authorizations
CREATE POLICY "Admins can manage all doc auths" ON public.user_document_authorizations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own doc auths" ON public.user_document_authorizations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_user_defaults_updated_at
  BEFORE UPDATE ON public.user_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_doc_auth_updated_at
  BEFORE UPDATE ON public.user_document_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
