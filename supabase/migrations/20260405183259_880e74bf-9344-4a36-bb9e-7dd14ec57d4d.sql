
-- =============================================
-- MASTER DATA: Add erp_synced boolean column
-- =============================================
ALTER TABLE public.business_partners ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.price_lists ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.price_list_items ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.dimensions ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.tax_codes ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.numbering_series ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.asset_categories ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.leave_types ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.payment_means_accounts ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.batch_serial_numbers ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.bin_locations ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.item_warehouse_info ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;
ALTER TABLE public.currency_exchange_rates ADD COLUMN IF NOT EXISTS erp_synced BOOLEAN DEFAULT false;

-- =============================================
-- TRANSACTIONS: Add erp_doc_entry and erp_doc_num
-- =============================================
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.ar_credit_memos ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.ar_credit_memos ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.ar_returns ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.ar_returns ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.delivery_notes ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.delivery_notes ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.purchase_quotations ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.purchase_quotations ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.ap_credit_memos ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.ap_credit_memos ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.inventory_goods_receipts ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.inventory_goods_receipts ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.inventory_goods_issues ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.inventory_goods_issues ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.stock_transfer_requests ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.stock_transfer_requests ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.incoming_payments ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.outgoing_payments ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.outgoing_payments ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.journal_vouchers ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.journal_vouchers ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.landed_cost_documents ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.landed_cost_documents ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.inventory_countings ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.inventory_countings ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;

ALTER TABLE public.finance_journal_entries ADD COLUMN IF NOT EXISTS erp_doc_entry TEXT;
ALTER TABLE public.finance_journal_entries ADD COLUMN IF NOT EXISTS erp_doc_num TEXT;
