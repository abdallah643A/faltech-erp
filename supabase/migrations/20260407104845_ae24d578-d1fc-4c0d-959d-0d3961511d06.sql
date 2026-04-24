
-- Sync entity configuration
CREATE TABLE public.sync_entity_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_endpoint TEXT,
  primary_key_field TEXT DEFAULT 'DocEntry',
  incremental_field TEXT DEFAULT 'UpdateDate',
  batch_size INTEGER DEFAULT 100,
  sync_priority INTEGER DEFAULT 5,
  dependency_order INTEGER DEFAULT 0,
  depends_on TEXT[] DEFAULT '{}',
  retry_max_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  conflict_resolution TEXT DEFAULT 'source_wins',
  is_enabled BOOLEAN DEFAULT true,
  is_master_data BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.sap_companies(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_name, company_id)
);

-- Sync jobs
CREATE TABLE public.sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  direction TEXT DEFAULT 'from_sap',
  job_type TEXT DEFAULT 'incremental',
  status TEXT DEFAULT 'queued',
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  watermark_before TEXT,
  watermark_after TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  triggered_by UUID,
  triggered_by_name TEXT,
  trigger_type TEXT DEFAULT 'manual',
  filters JSONB,
  error_summary TEXT,
  checkpoint JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync job stages
CREATE TABLE public.sync_job_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  records_in INTEGER DEFAULT 0,
  records_out INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync record tracker
CREATE TABLE public.sync_record_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  sync_status TEXT DEFAULT 'pending',
  source_update_marker TEXT,
  checksum TEXT,
  last_sync_attempt TIMESTAMPTZ,
  last_sync_success TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  error_category TEXT,
  job_id UUID REFERENCES public.sync_jobs(id),
  source_payload_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, source_key, company_id)
);

-- Sync watermarks
CREATE TABLE public.sync_watermarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  watermark_value TEXT NOT NULL,
  watermark_type TEXT DEFAULT 'update_date',
  set_by TEXT DEFAULT 'auto',
  set_by_user_id UUID,
  job_id UUID REFERENCES public.sync_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync performance log
CREATE TABLE public.sync_performance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  company_id UUID REFERENCES public.sap_companies(id),
  job_id UUID REFERENCES public.sync_jobs(id),
  records_processed INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  api_response_time_ms INTEGER,
  throughput_per_minute NUMERIC,
  batch_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sync_jobs_status ON public.sync_jobs(status);
CREATE INDEX idx_sync_jobs_entity ON public.sync_jobs(entity_name);
CREATE INDEX idx_sync_jobs_company ON public.sync_jobs(company_id);
CREATE INDEX idx_sync_jobs_created ON public.sync_jobs(created_at DESC);

CREATE INDEX idx_sync_record_tracker_status ON public.sync_record_tracker(sync_status);
CREATE INDEX idx_sync_record_tracker_entity ON public.sync_record_tracker(entity_type);
CREATE INDEX idx_sync_record_tracker_source ON public.sync_record_tracker(source_key);
CREATE INDEX idx_sync_record_tracker_retry ON public.sync_record_tracker(next_retry_at) WHERE sync_status = 'failed';
CREATE INDEX idx_sync_record_tracker_company ON public.sync_record_tracker(company_id);

CREATE INDEX idx_sync_watermarks_entity ON public.sync_watermarks(entity_name, company_id);
CREATE INDEX idx_sync_performance_entity ON public.sync_performance_log(entity_name, created_at DESC);

-- RLS
ALTER TABLE public.sync_entity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_record_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_performance_log ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can access all sync data
CREATE POLICY "Authenticated users can manage sync_entity_config" ON public.sync_entity_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage sync_jobs" ON public.sync_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage sync_job_stages" ON public.sync_job_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage sync_record_tracker" ON public.sync_record_tracker FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage sync_watermarks" ON public.sync_watermarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage sync_performance_log" ON public.sync_performance_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sequence for job numbers
CREATE SEQUENCE IF NOT EXISTS sync_job_number_seq START 1;

-- Trigger for updated_at
CREATE TRIGGER update_sync_entity_config_updated_at BEFORE UPDATE ON public.sync_entity_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sync_record_tracker_updated_at BEFORE UPDATE ON public.sync_record_tracker FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default entity configurations
INSERT INTO public.sync_entity_config (entity_name, display_name, source_endpoint, primary_key_field, incremental_field, batch_size, sync_priority, dependency_order, is_master_data) VALUES
('business_partner', 'Business Partners', 'BusinessPartners', 'CardCode', 'UpdateDate', 200, 1, 1, true),
('item', 'Items', 'Items', 'ItemCode', 'UpdateDate', 200, 1, 2, true),
('sales_employee', 'Sales Employees', 'SalesPersons', 'SalesEmployeeCode', 'UpdateDate', 100, 2, 3, true),
('numbering_series', 'Numbering Series', 'SeriesService_GetDocumentSeries', 'Series', 'UpdateDate', 50, 3, 4, true),
('dimension', 'Dimensions', 'Dimensions', 'DimensionCode', 'UpdateDate', 50, 3, 5, true),
('branch', 'Branches (Warehouses)', 'Warehouses', 'WarehouseCode', 'UpdateDate', 50, 3, 6, true),
('chart_of_accounts', 'Chart of Accounts', 'ChartOfAccounts', 'Code', 'UpdateDate', 200, 2, 7, true),
('sales_order', 'Sales Orders', 'Orders', 'DocEntry', 'UpdateDate', 100, 4, 10, false),
('delivery_note', 'Delivery Notes', 'DeliveryNotes', 'DocEntry', 'UpdateDate', 100, 5, 11, false),
('ar_invoice', 'AR Invoices', 'Invoices', 'DocEntry', 'UpdateDate', 100, 4, 12, false),
('incoming_payment', 'Incoming Payments', 'IncomingPayments', 'DocEntry', 'UpdateDate', 100, 5, 13, false),
('purchase_order', 'Purchase Orders', 'PurchaseOrders', 'DocEntry', 'UpdateDate', 100, 4, 14, false),
('goods_receipt', 'Goods Receipts', 'PurchaseDeliveryNotes', 'DocEntry', 'UpdateDate', 100, 5, 15, false),
('ap_invoice_payable', 'AP Invoices', 'PurchaseInvoices', 'DocEntry', 'UpdateDate', 100, 4, 16, false),
('journal_entry', 'Journal Entries', 'JournalEntries', 'JdtNum', 'UpdateDate', 50, 5, 17, false),
('activity', 'Activities', 'Activities', 'ActivityCode', 'UpdateDate', 100, 6, 18, false),
('opportunity', 'Opportunities', 'Opportunities', 'SequentialNumber', 'UpdateDate', 100, 6, 19, false),
('quote', 'Quotations', 'Quotations', 'DocEntry', 'UpdateDate', 100, 4, 20, false);
