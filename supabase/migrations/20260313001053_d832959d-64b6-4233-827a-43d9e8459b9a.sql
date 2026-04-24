
-- ===== SAP ADDON: ALERTS MANAGEMENT =====
CREATE TABLE public.sap_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'system', -- system, user, threshold, schedule
  category TEXT NOT NULL DEFAULT 'general', -- general, inventory, finance, sales, procurement, hr
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  condition_field TEXT, -- field to check
  condition_operator TEXT, -- gt, lt, eq, ne, contains
  condition_value TEXT, -- threshold value
  target_entity TEXT, -- table to monitor
  message_template TEXT, -- template with {{field}} placeholders
  is_active BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'realtime', -- realtime, daily, weekly
  last_triggered_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sap_alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.sap_alerts(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'new', -- new, read, acknowledged, dismissed
  source_entity TEXT,
  source_record_id TEXT,
  source_link TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== SAP ADDON: DRAG & RELATE RELATIONSHIPS =====
CREATE TABLE public.entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  source_entity TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_label TEXT,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_label TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'related', -- related, parent, child, reference, created_from
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_entity_rel_source ON public.entity_relationships(source_entity, source_id);
CREATE INDEX idx_entity_rel_target ON public.entity_relationships(target_entity, target_id);

-- ===== SAP ADDON: PRINT LAYOUT DESIGNER =====
CREATE TABLE public.print_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.sap_companies(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- sales_order, ar_invoice, quote, delivery_note, purchase_order, etc.
  is_default BOOLEAN DEFAULT false,
  page_size TEXT DEFAULT 'A4', -- A4, Letter, A5
  orientation TEXT DEFAULT 'portrait', -- portrait, landscape
  margins JSONB DEFAULT '{"top": 20, "right": 15, "bottom": 20, "left": 15}',
  header_config JSONB DEFAULT '{}', -- logo, company info, layout
  body_config JSONB DEFAULT '{}', -- columns, fields, styling
  footer_config JSONB DEFAULT '{}', -- totals, signatures, terms
  custom_css TEXT,
  field_mappings JSONB DEFAULT '[]', -- [{field, label, width, visible, order}]
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.sap_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sap_alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage alerts" ON public.sap_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage alert instances" ON public.sap_alert_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage relationships" ON public.entity_relationships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage print layouts" ON public.print_layouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
