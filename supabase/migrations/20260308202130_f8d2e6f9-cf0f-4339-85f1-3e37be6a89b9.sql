
-- ==========================================
-- Phase 4: Approval Workflows & Landed Costs
-- ==========================================

-- 1. Approval Templates (configurable multi-level approval engine)
CREATE TABLE public.approval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL, -- 'purchase_order', 'purchase_request', 'sales_order', 'material_request', etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.approval_templates(id) ON DELETE CASCADE NOT NULL,
  stage_order INT NOT NULL,
  stage_name TEXT NOT NULL,
  approver_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'role', 'department_head'
  approver_user_id UUID,
  approver_role TEXT,
  required_approvals INT DEFAULT 1,
  can_reject BOOLEAN DEFAULT true,
  auto_approve_below NUMERIC, -- auto-approve if amount below this threshold
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.approval_templates(id),
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_number TEXT,
  current_stage INT DEFAULT 1,
  total_stages INT DEFAULT 1,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  amount NUMERIC,
  requester_id UUID,
  requester_name TEXT,
  final_approved_at TIMESTAMPTZ,
  final_approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.approval_requests(id) ON DELETE CASCADE NOT NULL,
  stage_order INT NOT NULL,
  stage_name TEXT,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'delegated'
  acted_by UUID,
  acted_by_name TEXT,
  comments TEXT,
  acted_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Landed Costs (OIBT equivalent)
CREATE TABLE public.landed_cost_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL,
  doc_date DATE DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_name TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'closed', 'cancelled'
  total_landed_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  remarks TEXT,
  branch_id UUID REFERENCES public.branches(id),
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.landed_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landed_cost_id UUID REFERENCES public.landed_cost_documents(id) ON DELETE CASCADE NOT NULL,
  base_document_type TEXT NOT NULL, -- 'goods_receipt', 'ap_invoice'
  base_document_id UUID NOT NULL,
  base_doc_number TEXT,
  item_code TEXT,
  item_description TEXT,
  quantity NUMERIC DEFAULT 0,
  original_cost NUMERIC DEFAULT 0,
  allocated_cost NUMERIC DEFAULT 0,
  final_cost NUMERIC DEFAULT 0,
  line_num INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.landed_cost_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landed_cost_id UUID REFERENCES public.landed_cost_documents(id) ON DELETE CASCADE NOT NULL,
  cost_category TEXT NOT NULL, -- 'freight', 'customs', 'insurance', 'handling', 'other'
  cost_name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  allocation_method TEXT DEFAULT 'by_quantity', -- 'by_quantity', 'by_value', 'by_weight', 'by_volume', 'equal'
  vendor_id UUID REFERENCES public.business_partners(id),
  vendor_name TEXT,
  invoice_number TEXT,
  line_num INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated access)
CREATE POLICY "Auth users can manage approval_templates" ON public.approval_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage approval_stages" ON public.approval_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage approval_requests" ON public.approval_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage approval_actions" ON public.approval_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage landed_cost_documents" ON public.landed_cost_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage landed_cost_items" ON public.landed_cost_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage landed_cost_costs" ON public.landed_cost_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_approval_stages_template ON public.approval_stages(template_id, stage_order);
CREATE INDEX idx_approval_requests_doc ON public.approval_requests(document_type, document_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_actions_request ON public.approval_actions(request_id);
CREATE INDEX idx_landed_cost_items_doc ON public.landed_cost_items(landed_cost_id);
CREATE INDEX idx_landed_cost_costs_doc ON public.landed_cost_costs(landed_cost_id);
