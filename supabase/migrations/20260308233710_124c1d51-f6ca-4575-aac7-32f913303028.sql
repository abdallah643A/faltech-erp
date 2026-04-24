-- Table to store multiple SAP database connections
CREATE TABLE public.sap_database_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  service_layer_url TEXT NOT NULL,
  company_db TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table to cache external items with available quantities
CREATE TABLE public.external_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_connection_id UUID NOT NULL REFERENCES sap_database_connections(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT,
  item_name_ar TEXT,
  warehouse_code TEXT,
  warehouse_name TEXT,
  available_qty NUMERIC DEFAULT 0,
  on_hand_qty NUMERIC DEFAULT 0,
  committed_qty NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  sap_doc_entry TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(database_connection_id, item_code, warehouse_code)
);

-- Table to track external invoice reservations
CREATE TABLE public.external_invoice_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_invoice_id UUID REFERENCES ar_invoices(id) ON DELETE SET NULL,
  database_connection_id UUID NOT NULL REFERENCES sap_database_connections(id),
  sap_draft_doc_entry TEXT,
  sap_draft_doc_num INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reserved', 'confirmed', 'cancelled', 'error')),
  error_message TEXT,
  reserved_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lines for external reservations
CREATE TABLE public.external_reservation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES external_invoice_reservations(id) ON DELETE CASCADE,
  line_num INT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT,
  warehouse_code TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add source database reference to AR invoice lines
ALTER TABLE ar_invoice_lines ADD COLUMN IF NOT EXISTS external_database_id UUID REFERENCES sap_database_connections(id);
ALTER TABLE ar_invoice_lines ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;

-- Add external reservation reference to AR invoices
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS external_reservation_id UUID REFERENCES external_invoice_reservations(id);
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS has_external_items BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE sap_database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_invoice_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reservation_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view SAP connections" ON sap_database_connections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage SAP connections" ON sap_database_connections
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view external items" ON external_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage external items" ON external_items
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their reservations" ON external_invoice_reservations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create reservations" ON external_invoice_reservations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their reservations" ON external_invoice_reservations
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view reservation lines" ON external_reservation_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage reservation lines" ON external_reservation_lines
  FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_external_items_db_item ON external_items(database_connection_id, item_code);
CREATE INDEX idx_external_items_available ON external_items(database_connection_id, available_qty) WHERE available_qty > 0;
CREATE INDEX idx_external_reservations_invoice ON external_invoice_reservations(ar_invoice_id);
CREATE INDEX idx_external_reservations_status ON external_invoice_reservations(status);

-- Trigger for updated_at
CREATE TRIGGER update_sap_database_connections_updated_at BEFORE UPDATE ON sap_database_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_items_updated_at BEFORE UPDATE ON external_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_invoice_reservations_updated_at BEFORE UPDATE ON external_invoice_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();