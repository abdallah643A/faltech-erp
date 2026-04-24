-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'Direct',
  score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'New',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  last_contact DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own leads or all if manager/admin"
ON public.leads FOR SELECT
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Sales reps and above can create leads"
ON public.leads FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales_rep'::app_role])
);

CREATE POLICY "Users can update their own leads or all if manager/admin"
ON public.leads FOR UPDATE
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Only admins can delete leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activities table for CRM activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'note')),
  subject TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Activities RLS policies
CREATE POLICY "Users can view their own activities or all if manager/admin"
ON public.activities FOR SELECT
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Authenticated users can create activities"
ON public.activities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own activities or all if manager/admin"
ON public.activities FOR UPDATE
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Only admins can delete activities"
ON public.activities FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for activities updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();