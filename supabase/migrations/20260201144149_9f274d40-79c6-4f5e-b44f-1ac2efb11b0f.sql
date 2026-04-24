-- Create material_requests table
CREATE TABLE public.material_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mr_number text NOT NULL UNIQUE,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  project_name text,
  sector text,
  department text,
  delivery_location text,
  store_availability text,
  spec text,
  due_out_date date,
  attachment_url text,
  sole_source_adjustment text,
  reference text,
  category text,
  status text DEFAULT 'draft',
  
  -- Requested By
  requested_by_id uuid,
  requested_by_name text,
  requested_by_email text,
  requested_by_position text,
  requested_at timestamp with time zone,
  
  -- Reviewed By
  reviewed_by_id uuid,
  reviewed_by_name text,
  reviewed_by_email text,
  reviewed_by_position text,
  reviewed_at timestamp with time zone,
  
  -- Approved By (1st approver)
  approved_by_1_id uuid,
  approved_by_1_name text,
  approved_by_1_email text,
  approved_by_1_position text,
  approved_at_1 timestamp with time zone,
  
  -- Approved By (2nd approver)
  approved_by_2_id uuid,
  approved_by_2_name text,
  approved_by_2_email text,
  approved_by_2_position text,
  approved_at_2 timestamp with time zone,
  
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create material_request_lines table
CREATE TABLE public.material_request_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_request_id uuid NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
  line_num integer NOT NULL,
  part_no text,
  description text,
  unit_of_measurement text,
  quantity numeric DEFAULT 0,
  remark text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sequence for MR numbers
CREATE SEQUENCE IF NOT EXISTS material_request_number_seq START WITH 1;

-- Enable RLS
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_request_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_requests
CREATE POLICY "Authenticated users can view material requests"
ON public.material_requests FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create material requests"
ON public.material_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own requests or managers/admins can update all"
ON public.material_requests FOR UPDATE
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Only admins can delete material requests"
ON public.material_requests FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for material_request_lines
CREATE POLICY "Authenticated users can view request lines"
ON public.material_request_lines FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage request lines"
ON public.material_request_lines FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_material_requests_updated_at
BEFORE UPDATE ON public.material_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();