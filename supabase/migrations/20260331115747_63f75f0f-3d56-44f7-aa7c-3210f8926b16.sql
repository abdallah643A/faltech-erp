
-- Portal client accounts (email+password auth via separate table)
CREATE TABLE public.portal_client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  phone text,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(portal_id, email)
);

-- Portal messages
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE NOT NULL,
  project_id uuid,
  sender_type text NOT NULL DEFAULT 'client', -- 'client' or 'admin'
  sender_name text,
  sender_email text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Portal analytics / activity log
CREATE TABLE public.portal_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE NOT NULL,
  client_account_id uuid REFERENCES public.portal_client_accounts(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'login', 'page_view', 'document_download', 'invoice_view', 'co_approval'
  page_path text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Portal shared documents (admin controls what docs are visible)
CREATE TABLE public.portal_shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES public.client_portals(id) ON DELETE CASCADE NOT NULL,
  project_id uuid,
  document_name text NOT NULL,
  document_url text,
  file_size bigint,
  file_type text,
  category text DEFAULT 'general', -- 'contract', 'drawing', 'permit', 'report', 'general'
  uploaded_by text,
  is_client_upload boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to client_portals for enhanced features
ALTER TABLE public.client_portals 
  ADD COLUMN IF NOT EXISTS show_projects boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_change_orders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_documents boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_messages boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_client_uploads boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_co_approval boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS white_label boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_name_override text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS footer_text text,
  ADD COLUMN IF NOT EXISTS portal_password text;

-- Enable RLS
ALTER TABLE public.portal_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_shared_documents ENABLE ROW LEVEL SECURITY;

-- Policies for portal tables (authenticated admin users can manage)
CREATE POLICY "Authenticated users can manage portal accounts" ON public.portal_client_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage portal messages" ON public.portal_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage portal analytics" ON public.portal_analytics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage portal shared docs" ON public.portal_shared_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon access for portal login/view (portal clients aren't auth.users)
CREATE POLICY "Anon can read active portals" ON public.client_portals
  FOR SELECT TO anon USING (is_enabled = true);

CREATE POLICY "Anon can read portal messages" ON public.portal_messages
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert portal messages" ON public.portal_messages
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can read shared documents" ON public.portal_shared_documents
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert portal analytics" ON public.portal_analytics
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can read portal accounts for login" ON public.portal_client_accounts
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update portal accounts login" ON public.portal_client_accounts
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
