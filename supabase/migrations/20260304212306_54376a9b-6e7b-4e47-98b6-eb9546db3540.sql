
-- Warehouses table (synced from SAP B1)
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT NOT NULL UNIQUE,
  warehouse_name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  branch_code TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sap_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price Lists table (synced from SAP B1)
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_code INTEGER NOT NULL UNIQUE,
  price_list_name TEXT NOT NULL,
  currency TEXT,
  base_price_list INTEGER,
  factor NUMERIC,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price List Items
CREATE TABLE public.price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, item_code)
);

-- Tax Codes table (synced from SAP B1)
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code TEXT NOT NULL UNIQUE,
  tax_name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  account_code TEXT,
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chart of Accounts (full COA from SAP B1)
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acct_code TEXT NOT NULL UNIQUE,
  acct_name TEXT NOT NULL,
  acct_level INTEGER,
  acct_type TEXT,
  is_active BOOLEAN DEFAULT true,
  father_acct_code TEXT,
  balance NUMERIC DEFAULT 0,
  sap_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AR Credit Memos
CREATE TABLE public.ar_credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  contact_person TEXT,
  reference_invoice TEXT,
  reason_code TEXT,
  remarks TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  series INTEGER,
  branch_id UUID REFERENCES public.branches(id),
  sales_employee_code INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_credit_memo_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_memo_id UUID NOT NULL REFERENCES public.ar_credit_memos(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  tax_percent NUMERIC DEFAULT 0,
  warehouse TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AR Returns
CREATE TABLE public.ar_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES public.business_partners(id),
  return_reason TEXT,
  reference_delivery TEXT,
  remarks TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  series INTEGER,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ar_return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.ar_returns(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  warehouse TEXT,
  serial_batch_no TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AP Credit Memos
CREATE TABLE public.ap_credit_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  vendor_code TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.business_partners(id),
  reference_invoice TEXT,
  reason TEXT,
  remarks TEXT,
  currency TEXT DEFAULT 'SAR',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  series INTEGER,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ap_credit_memo_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_memo_id UUID NOT NULL REFERENCES public.ap_credit_memos(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  tax_code TEXT,
  warehouse TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Goods Receipt (without PO)
CREATE TABLE public.inventory_goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  reference_no TEXT,
  warehouse_code TEXT,
  remarks TEXT,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.inventory_goods_receipts(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  gl_account TEXT,
  tax_code TEXT,
  warehouse TEXT,
  serial_batch_no TEXT,
  bin_location TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Goods Issue
CREATE TABLE public.inventory_goods_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  reference_no TEXT,
  warehouse_code TEXT,
  reason TEXT,
  remarks TEXT,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_goods_issue_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.inventory_goods_issues(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  gl_account TEXT,
  serial_batch_no TEXT,
  bin_location TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Transfers
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE,
  from_warehouse TEXT NOT NULL,
  to_warehouse TEXT NOT NULL,
  remarks TEXT,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  from_bin TEXT,
  to_bin TEXT,
  serial_batch_no TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Transfer Requests
CREATE TABLE public.stock_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num INTEGER NOT NULL,
  from_warehouse TEXT NOT NULL,
  to_warehouse TEXT NOT NULL,
  required_date DATE,
  remarks TEXT,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_transfer_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.stock_transfer_requests(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Counting
CREATE TABLE public.inventory_countings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_num INTEGER NOT NULL,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_code TEXT,
  counter_user TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'open',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  last_synced_at TIMESTAMPTZ,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_counting_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counting_id UUID NOT NULL REFERENCES public.inventory_countings(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  warehouse TEXT,
  bin_location TEXT,
  book_qty NUMERIC DEFAULT 0,
  counted_qty NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  serial_batch_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POS Sessions / Shifts
CREATE TABLE public.pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id TEXT,
  cashier_id UUID,
  cashier_name TEXT,
  open_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  close_time TIMESTAMPTZ,
  open_float NUMERIC DEFAULT 0,
  close_float NUMERIC,
  total_cash_sales NUMERIC DEFAULT 0,
  total_card_sales NUMERIC DEFAULT 0,
  total_transfer_sales NUMERIC DEFAULT 0,
  expected_cash NUMERIC DEFAULT 0,
  actual_cash NUMERIC,
  variance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POS Transactions
CREATE TABLE public.pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no TEXT NOT NULL,
  shift_id UUID REFERENCES public.pos_shifts(id),
  doc_type TEXT DEFAULT 'invoice',
  customer_code TEXT DEFAULT 'WALK-IN',
  customer_name TEXT DEFAULT 'Walk-in Customer',
  cashier_id UUID,
  cashier_name TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  amount_tendered NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  sap_doc_entry TEXT,
  sync_status TEXT DEFAULT 'local',
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pos_transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  line_num INTEGER NOT NULL,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_code TEXT,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  warehouse TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_credit_memo_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_credit_memo_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_goods_issue_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_countings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counting_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage warehouses" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage price_lists" ON public.price_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage price_list_items" ON public.price_list_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage tax_codes" ON public.tax_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage chart_of_accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ar_credit_memos" ON public.ar_credit_memos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ar_credit_memo_lines" ON public.ar_credit_memo_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ar_returns" ON public.ar_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ar_return_lines" ON public.ar_return_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ap_credit_memos" ON public.ap_credit_memos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ap_credit_memo_lines" ON public.ap_credit_memo_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_goods_receipts" ON public.inventory_goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_goods_receipt_lines" ON public.inventory_goods_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_goods_issues" ON public.inventory_goods_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_goods_issue_lines" ON public.inventory_goods_issue_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage stock_transfers" ON public.stock_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage stock_transfer_lines" ON public.stock_transfer_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage stock_transfer_requests" ON public.stock_transfer_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage stock_transfer_request_lines" ON public.stock_transfer_request_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_countings" ON public.inventory_countings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory_counting_lines" ON public.inventory_counting_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage pos_shifts" ON public.pos_shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage pos_transactions" ON public.pos_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage pos_transaction_lines" ON public.pos_transaction_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
