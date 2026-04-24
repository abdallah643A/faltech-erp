-- Create enum for sync status
CREATE TYPE public.sync_status AS ENUM ('pending', 'synced', 'conflict', 'error');

-- Create enum for sync direction
CREATE TYPE public.sync_direction AS ENUM ('to_sap', 'from_sap', 'bidirectional');

-- Create sync_logs table to track all sync operations
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  sap_doc_entry TEXT,
  direction sync_direction NOT NULL,
  status sync_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_conflicts table for manual review
CREATE TABLE public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  sap_doc_entry TEXT,
  field_name TEXT NOT NULL,
  crm_value TEXT,
  sap_value TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  resolved_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for incoming payments doc_num
CREATE SEQUENCE IF NOT EXISTS incoming_payments_doc_num_seq START WITH 1;

-- Create incoming_payments table
CREATE TABLE public.incoming_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL DEFAULT nextval('incoming_payments_doc_num_seq'),
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  payment_type TEXT DEFAULT 'cash',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  reference TEXT,
  remarks TEXT,
  check_number TEXT,
  check_date DATE,
  bank_code TEXT,
  bank_account TEXT,
  credit_card_type TEXT,
  credit_card_number TEXT,
  voucher_number TEXT,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status sync_status DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add SAP sync columns to existing tables
ALTER TABLE public.business_partners 
ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS sap_doc_entry TEXT,
ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_logs
CREATE POLICY "Managers and admins can view sync logs"
ON public.sync_logs FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can create sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Only admins can delete sync logs"
ON public.sync_logs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for sync_conflicts
CREATE POLICY "Managers and admins can view conflicts"
ON public.sync_conflicts FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Managers and admins can manage conflicts"
ON public.sync_conflicts FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- RLS policies for incoming_payments
CREATE POLICY "Users can view their own payments or all if manager/admin"
ON public.incoming_payments FOR SELECT
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Sales reps and above can create payments"
ON public.incoming_payments FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'sales_rep'::app_role]));

CREATE POLICY "Users can update their own payments or all if manager/admin"
ON public.incoming_payments FOR UPDATE
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Only admins can delete payments"
ON public.incoming_payments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for incoming_payments
CREATE TRIGGER update_incoming_payments_updated_at
BEFORE UPDATE ON public.incoming_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();