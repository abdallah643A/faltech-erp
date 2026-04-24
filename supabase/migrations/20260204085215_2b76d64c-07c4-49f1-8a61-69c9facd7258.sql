-- Create enum for project phases
CREATE TYPE public.project_phase AS ENUM (
  'sales_initiation',
  'finance_verification', 
  'operations_verification',
  'procurement',
  'production',
  'logistics',
  'final_payment',
  'completed'
);

-- Create enum for phase status
CREATE TYPE public.phase_status AS ENUM (
  'pending',
  'in_progress',
  'awaiting_approval',
  'approved',
  'rejected',
  'completed',
  'skipped'
);

-- Create enum for project type
CREATE TYPE public.project_type AS ENUM (
  'standard',
  'industrial'
);

-- Add new columns to projects table for industrial project tracking
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_type public.project_type DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS current_phase public.project_phase DEFAULT 'sales_initiation',
ADD COLUMN IF NOT EXISTS contract_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms text,
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.business_partners(id),
ADD COLUMN IF NOT EXISTS sap_sales_order_id text,
ADD COLUMN IF NOT EXISTS sap_doc_entry text,
ADD COLUMN IF NOT EXISTS sync_status public.sync_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Create project_contracts table for storing signed contracts
CREATE TABLE public.project_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  contract_number text,
  contract_date date DEFAULT CURRENT_DATE,
  signed_date date,
  contract_value numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  contract_file_url text,
  contract_type text,
  scope_of_work text,
  terms_and_conditions text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_payment_terms table for milestone-based payments
CREATE TABLE public.project_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  payment_number integer NOT NULL,
  description text NOT NULL,
  percentage numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  due_date date,
  milestone_id uuid REFERENCES public.project_milestones(id),
  status text DEFAULT 'pending',
  invoice_id uuid,
  payment_id uuid,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_phases table to track phase progress
CREATE TABLE public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase public.project_phase NOT NULL,
  status public.phase_status DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  auto_progress boolean DEFAULT false,
  requires_approval boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, phase)
);

-- Create project_phase_approvals for multi-level approvals
CREATE TABLE public.project_phase_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE NOT NULL,
  approval_level integer NOT NULL DEFAULT 1,
  approver_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create project_documents for all project-related files
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase public.project_phase,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create project_activity_log for audit trail
CREATE TABLE public.project_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  phase public.project_phase,
  action text NOT NULL,
  description text,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phase_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_contracts
CREATE POLICY "Users can view contracts for accessible projects"
ON public.project_contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_contracts.project_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can create contracts"
ON public.project_contracts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can update contracts"
ON public.project_contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_contracts.project_id
    AND (p.manager_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

-- RLS policies for project_payment_terms
CREATE POLICY "Users can view payment terms for accessible projects"
ON public.project_payment_terms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_payment_terms.project_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can create payment terms"
ON public.project_payment_terms FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can update payment terms"
ON public.project_payment_terms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_payment_terms.project_id
    AND (p.manager_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

-- RLS policies for project_phases
CREATE POLICY "Users can view phases for accessible projects"
ON public.project_phases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_phases.project_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can manage phases"
ON public.project_phases FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for project_phase_approvals
CREATE POLICY "Users can view approvals for accessible phases"
ON public.project_phase_approvals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases ph
    JOIN public.projects p ON p.id = ph.project_id
    WHERE ph.id = project_phase_approvals.phase_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can manage approvals"
ON public.project_phase_approvals FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for project_documents
CREATE POLICY "Users can view documents for accessible projects"
ON public.project_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_documents.project_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can upload documents"
ON public.project_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders can delete their documents"
ON public.project_documents FOR DELETE
USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for project_activity_log
CREATE POLICY "Users can view activity log for accessible projects"
ON public.project_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_activity_log.project_id
    AND (p.created_by = auth.uid() OR p.manager_id = auth.uid() 
         OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  )
);

CREATE POLICY "Authenticated users can create activity logs"
ON public.project_activity_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project documents
CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Create function to initialize project phases
CREATE OR REPLACE FUNCTION public.initialize_project_phases()
RETURNS TRIGGER AS $$
BEGIN
  -- Only initialize phases for industrial projects
  IF NEW.project_type = 'industrial' THEN
    INSERT INTO public.project_phases (project_id, phase, status, requires_approval, auto_progress)
    VALUES 
      (NEW.id, 'sales_initiation', 'in_progress', false, false),
      (NEW.id, 'finance_verification', 'pending', true, false),
      (NEW.id, 'operations_verification', 'pending', true, false),
      (NEW.id, 'procurement', 'pending', true, false),
      (NEW.id, 'production', 'pending', false, true),
      (NEW.id, 'logistics', 'pending', false, true),
      (NEW.id, 'final_payment', 'pending', true, false),
      (NEW.id, 'completed', 'pending', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to initialize phases on industrial project creation
CREATE TRIGGER initialize_industrial_project_phases
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.initialize_project_phases();

-- Create function to log project activity
CREATE OR REPLACE FUNCTION public.log_project_activity(
  p_project_id uuid,
  p_phase project_phase,
  p_action text,
  p_description text DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.project_activity_log (
    project_id, phase, action, description, old_value, new_value, performed_by
  ) VALUES (
    p_project_id, p_phase, p_action, p_description, p_old_value, p_new_value, auth.uid()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_project_contracts_updated_at
BEFORE UPDATE ON public.project_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_payment_terms_updated_at
BEFORE UPDATE ON public.project_payment_terms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at
BEFORE UPDATE ON public.project_phases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();