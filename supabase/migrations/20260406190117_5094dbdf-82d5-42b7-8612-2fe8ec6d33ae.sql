
-- Copilot conversations
CREATE TABLE public.copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  title TEXT NOT NULL DEFAULT 'New Conversation',
  user_role TEXT,
  mode TEXT DEFAULT 'read' CHECK (mode IN ('read', 'action')),
  language TEXT DEFAULT 'en',
  is_pinned BOOLEAN DEFAULT false,
  message_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations" ON public.copilot_conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_copilot_conversations_updated_at
  BEFORE UPDATE ON public.copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copilot messages
CREATE TABLE public.copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  confidence NUMERIC(3,2),
  reasoning_summary TEXT,
  suggested_followups TEXT[],
  action_type TEXT,
  action_payload JSONB,
  action_status TEXT CHECK (action_status IN ('pending', 'confirmed', 'executed', 'cancelled')),
  tokens_used INT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own conversation messages" ON public.copilot_messages
  FOR ALL TO authenticated
  USING (conversation_id IN (SELECT id FROM public.copilot_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM public.copilot_conversations WHERE user_id = auth.uid()));

CREATE INDEX idx_copilot_messages_conv ON public.copilot_messages(conversation_id, created_at);

-- Prompt library
CREATE TABLE public.copilot_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  target_role TEXT,
  module TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  company_id UUID REFERENCES public.sap_companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_prompt_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prompts" ON public.copilot_prompt_library
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage prompts" ON public.copilot_prompt_library
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Follow-ups
CREATE TABLE public.copilot_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  conversation_id UUID REFERENCES public.copilot_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.copilot_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  linked_record_type TEXT,
  linked_record_id TEXT,
  linked_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own followups" ON public.copilot_followups
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Action log (audit)
CREATE TABLE public.copilot_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  conversation_id UUID REFERENCES public.copilot_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.copilot_messages(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  action_payload JSONB,
  target_table TEXT,
  target_record_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'executed', 'failed', 'cancelled')),
  result JSONB,
  error_message TEXT,
  confirmed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read action log" ON public.copilot_action_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own actions" ON public.copilot_action_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions" ON public.copilot_action_log
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Feedback
CREATE TABLE public.copilot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES public.copilot_messages(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback" ON public.copilot_feedback
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed prompt library with role-based prompts
INSERT INTO public.copilot_prompt_library (title, prompt_text, category, target_role, module, tags) VALUES
-- CEO
('Revenue Overview', 'Show me total revenue by company and branch for this quarter compared to last quarter', 'finance', 'CEO', 'finance', ARRAY['revenue', 'comparison']),
('Top Exceptions', 'Summarize the top 10 operational exceptions across all modules right now', 'operations', 'CEO', 'all', ARRAY['exceptions', 'overview']),
('Project Portfolio Health', 'Give me a health summary of all active projects including margin, schedule, and risk status', 'projects', 'CEO', 'projects', ARRAY['projects', 'health']),
-- CFO
('Overdue Receivables', 'Summarize overdue receivables by customer, branch, and aging bucket', 'finance', 'CFO', 'finance', ARRAY['ar', 'aging', 'overdue']),
('Budget Overruns', 'Show me all departments with budget overruns exceeding 10% and their source transactions', 'finance', 'CFO', 'finance', ARRAY['budget', 'variance']),
('Cash Flow Projection', 'Project cash flow for next 30 days based on pending receivables and payables', 'finance', 'CFO', 'finance', ARRAY['cashflow', 'forecast']),
-- COO
('Blocked Purchase Orders', 'List all blocked or delayed purchase orders with reasons and approval status', 'procurement', 'COO', 'procurement', ARRAY['po', 'blocked', 'approval']),
('Stock-out Risk', 'Show stock-out risks for the next 7, 30, and 90 days by warehouse', 'inventory', 'COO', 'inventory', ARRAY['stockout', 'risk']),
('Delivery Performance', 'Show on-time delivery rate by branch and product category for last 3 months', 'operations', 'COO', 'sales', ARRAY['delivery', 'performance']),
-- Finance Manager
('Unreconciled Payments', 'List incoming payments that are not yet reconciled with bank statements', 'finance', 'Finance Manager', 'banking', ARRAY['reconciliation', 'payments']),
('Journal Entry Anomalies', 'Identify unusual journal entries in the last 30 days by amount or pattern', 'finance', 'Finance Manager', 'finance', ARRAY['journal', 'anomaly']),
('Retention Exposure', 'Show projects with retention amounts due and their release schedule', 'finance', 'Finance Manager', 'projects', ARRAY['retention', 'exposure']),
-- Procurement Manager
('Pending Approvals', 'List all purchase requests and orders pending my approval with amounts and aging', 'procurement', 'Procurement Manager', 'procurement', ARRAY['approval', 'pending']),
('Vendor Performance', 'Compare top 10 vendors by delivery time, quality, and pricing over last 6 months', 'procurement', 'Procurement Manager', 'procurement', ARRAY['vendor', 'performance']),
('Contract Expiring', 'Show vendor contracts expiring in the next 90 days', 'procurement', 'Procurement Manager', 'procurement', ARRAY['contracts', 'expiry']),
-- PMO Manager
('Project Margin Erosion', 'Explain project margin erosion for projects below 15% margin with root causes', 'projects', 'PMO Manager', 'projects', ARRAY['margin', 'erosion']),
('Billing Leakage', 'Identify projects with billing leakage or unbilled work exceeding 5% of contract', 'projects', 'PMO Manager', 'projects', ARRAY['billing', 'leakage']),
('Resource Utilization', 'Show resource utilization rates by department and identify over/under-allocated staff', 'projects', 'PMO Manager', 'hr', ARRAY['resource', 'utilization']),
-- HR Manager
('Payroll Anomalies', 'Summarize payroll, attendance, and overtime anomalies for current month', 'hr', 'HR Manager', 'hr', ARRAY['payroll', 'anomaly']),
('Leave Balance Risk', 'Show employees with excessive accumulated leave that poses financial risk', 'hr', 'HR Manager', 'hr', ARRAY['leave', 'risk']),
('Document Expiry', 'List employee documents (iqama, passport, insurance) expiring in next 60 days', 'hr', 'HR Manager', 'hr', ARRAY['documents', 'expiry']),
-- Storekeeper
('Low Stock Alert', 'Show items below minimum stock level by warehouse with reorder suggestions', 'inventory', 'Storekeeper', 'inventory', ARRAY['stock', 'reorder']),
('Pending Receipts', 'List purchase orders with pending goods receipts and expected delivery dates', 'inventory', 'Storekeeper', 'inventory', ARRAY['receipts', 'pending']),
('Stock Movement', 'Show unusual stock movements or discrepancies in the last 7 days', 'inventory', 'Storekeeper', 'inventory', ARRAY['movement', 'discrepancy']),
-- Sales Manager
('Pipeline Summary', 'Show sales pipeline by stage, probability, and expected close date for this quarter', 'sales', 'Sales Manager', 'sales', ARRAY['pipeline', 'forecast']),
('Collection Status', 'List overdue invoices by collector with contact history and follow-up status', 'sales', 'Sales Manager', 'finance', ARRAY['collection', 'overdue']),
('Customer Profitability', 'Rank top 20 customers by profitability and identify declining accounts', 'sales', 'Sales Manager', 'sales', ARRAY['customer', 'profitability']);
