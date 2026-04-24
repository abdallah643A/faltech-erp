
-- Payment Certificate Types configuration table
CREATE TABLE public.payment_certificate_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_certificate_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view certificate types"
ON public.payment_certificate_types FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage certificate types"
ON public.payment_certificate_types FOR ALL
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE TRIGGER update_payment_certificate_types_updated_at
BEFORE UPDATE ON public.payment_certificate_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment Certificates table
CREATE TABLE public.payment_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number TEXT NOT NULL,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  certificate_type_id UUID NOT NULL REFERENCES public.payment_certificate_types(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  notified_user_id UUID REFERENCES auth.users(id),
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment certificates"
ON public.payment_certificates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create payment certificates"
ON public.payment_certificates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins managers and creators can update certificates"
ON public.payment_certificates FOR UPDATE
USING (auth.uid() = created_by OR public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Admins can delete certificates"
ON public.payment_certificates FOR DELETE
USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

CREATE TRIGGER update_payment_certificates_updated_at
BEFORE UPDATE ON public.payment_certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence for certificate numbers
CREATE SEQUENCE IF NOT EXISTS payment_certificate_seq START WITH 1;
