
-- Add push/bidirectional columns to sync_entity_config
ALTER TABLE public.sync_entity_config
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS push_batch_size INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS bidirectional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_of_truth TEXT DEFAULT 'sap',
  ADD COLUMN IF NOT EXISTS schedule_frequency TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS schedule_cron TEXT,
  ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_pull_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_scheduled_run TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Add local_record_id to sync_record_tracker
ALTER TABLE public.sync_record_tracker
  ADD COLUMN IF NOT EXISTS local_record_id UUID,
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'pull',
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_modified_at TIMESTAMPTZ;

-- Push queue table
CREATE TABLE IF NOT EXISTS public.sap_push_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  local_record_id UUID NOT NULL,
  company_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  payload JSONB,
  sap_doc_entry TEXT,
  sap_response JSONB,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  error_message TEXT,
  error_category TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_status ON public.sap_push_queue(status);
CREATE INDEX IF NOT EXISTS idx_push_queue_entity ON public.sap_push_queue(entity_type, status);
CREATE INDEX IF NOT EXISTS idx_push_queue_company ON public.sap_push_queue(company_id);

ALTER TABLE public.sap_push_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage push queue" ON public.sap_push_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SAP Metadata Cache (discovered UDFs/UDTs)
CREATE TABLE IF NOT EXISTS public.sap_metadata_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  metadata_type TEXT NOT NULL, -- 'udf', 'udt', 'udo'
  object_name TEXT NOT NULL,
  table_name TEXT,
  field_name TEXT,
  field_type TEXT,
  field_length INTEGER,
  field_description TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  valid_values JSONB,
  linked_table TEXT,
  sub_type TEXT,
  raw_definition JSONB,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  last_scanned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metadata_cache_type ON public.sap_metadata_cache(metadata_type);
CREATE INDEX IF NOT EXISTS idx_metadata_cache_object ON public.sap_metadata_cache(object_name, table_name);

ALTER TABLE public.sap_metadata_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage metadata cache" ON public.sap_metadata_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SAP Metadata Comparisons
CREATE TABLE IF NOT EXISTS public.sap_metadata_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  comparison_type TEXT NOT NULL, -- 'sap_to_erp', 'erp_to_sap'
  sap_object_name TEXT,
  sap_table_name TEXT,
  sap_field_name TEXT,
  sap_field_type TEXT,
  erp_entity_name TEXT,
  erp_field_name TEXT,
  erp_field_type TEXT,
  match_status TEXT NOT NULL DEFAULT 'unmatched', -- 'matched', 'unmatched', 'type_mismatch', 'new_in_sap', 'new_in_erp', 'changed'
  auto_mappable BOOLEAN DEFAULT false,
  provisioning_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'provisioned', 'failed', 'skipped'
  provisioned_at TIMESTAMPTZ,
  provisioned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sap_metadata_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage metadata comparisons" ON public.sap_metadata_comparisons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SAP Sync Field Mappings
CREATE TABLE IF NOT EXISTS public.sap_sync_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'pull', -- 'pull', 'push', 'both'
  sap_field_name TEXT NOT NULL,
  erp_field_name TEXT NOT NULL,
  sap_table TEXT,
  transformation_rule TEXT, -- 'direct', 'lookup', 'format_date', 'enum_map', 'default', 'formula'
  transformation_config JSONB,
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  is_key_field BOOLEAN DEFAULT false,
  is_udf BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_entity ON public.sap_sync_field_mappings(entity_name, direction);

ALTER TABLE public.sap_sync_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage field mappings" ON public.sap_sync_field_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SAP Sync Audit Log
CREATE TABLE IF NOT EXISTS public.sap_sync_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  action_category TEXT NOT NULL, -- 'config', 'sync_run', 'metadata', 'mapping', 'provisioning', 'schedule'
  entity_name TEXT,
  details JSONB,
  performed_by UUID,
  performed_by_name TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_audit_category ON public.sap_sync_audit_log(action_category);
CREATE INDEX IF NOT EXISTS idx_sync_audit_entity ON public.sap_sync_audit_log(entity_name);
CREATE INDEX IF NOT EXISTS idx_sync_audit_time ON public.sap_sync_audit_log(created_at DESC);

ALTER TABLE public.sap_sync_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read sync audit" ON public.sap_sync_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sync audit" ON public.sap_sync_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger for push queue updated_at
CREATE TRIGGER update_push_queue_updated_at BEFORE UPDATE ON public.sap_push_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON public.sap_sync_field_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metadata_comparisons_updated_at BEFORE UPDATE ON public.sap_metadata_comparisons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
