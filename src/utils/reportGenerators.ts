import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/integrations/supabase/new-tables';
import type { InventoryTransaction, InventoryCountingSession } from '@/types/data-contracts';
import { format } from 'date-fns';

function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type ReportGenerator = () => Promise<void>;

export function getReportGenerators(): Record<number, ReportGenerator> {
  return {
    // Sales Reports
    1: async () => {
      const { data } = await supabase.from('sales_orders').select('doc_num, customer_name, total, status, doc_date, currency').order('doc_date', { ascending: false });
      downloadCSV('sales-summary', ['Doc#', 'Customer', 'Total', 'Currency', 'Status', 'Date'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total, r.currency || 'SAR', r.status, r.doc_date]));
    },
    2: async () => {
      const { data } = await supabase.from('ar_invoice_lines').select('item_code, description, quantity, unit_price, line_total').order('item_code');
      downloadCSV('sales-by-item', ['Item Code', 'Description', 'Qty', 'Unit Price', 'Line Total'],
        (data || []).map(r => [r.item_code, r.description, r.quantity, r.unit_price, r.line_total]));
    },
    3: async () => {
      const { data } = await supabase.from('ar_invoices').select('customer_name, customer_code, total, doc_date, status').order('customer_name');
      downloadCSV('sales-by-customer', ['Customer', 'Code', 'Total', 'Date', 'Status'],
        (data || []).map(r => [r.customer_name, r.customer_code, r.total, r.doc_date, r.status]));
    },
    4: async () => {
      const { data } = await supabase.from('ar_invoices').select('sales_employee_code, customer_name, total, doc_date').order('sales_employee_code');
      downloadCSV('sales-by-employee', ['Sales Emp Code', 'Customer', 'Total', 'Date'],
        (data || []).map(r => [r.sales_employee_code, r.customer_name, r.total, r.doc_date]));
    },
    5: async () => {
      const { data } = await supabase.from('sales_orders').select('doc_num, customer_name, total, status, doc_date').eq('status', 'open').order('doc_date');
      downloadCSV('open-sales-orders', ['Doc#', 'Customer', 'Total', 'Status', 'Date'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total, r.status, r.doc_date]));
    },
    6: async () => {
      const { data } = await supabase.from('quotes').select('quote_number, customer_name, total, status, doc_date').order('doc_date', { ascending: false });
      downloadCSV('quotation-conversion', ['Quote#', 'Customer', 'Total', 'Status', 'Date'],
        (data || []).map(r => [r.quote_number, r.customer_name, r.total, r.status, r.doc_date]));
    },
    7: async () => {
      const { data } = await supabase.from('incoming_payments').select('doc_num, customer_name, total_amount, payment_type, doc_date').order('doc_date', { ascending: false });
      downloadCSV('sales-by-payment-method', ['Doc#', 'Customer', 'Amount', 'Payment Type', 'Date'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total_amount, r.payment_type, r.doc_date]));
    },
    8: async () => {
      const { data } = await supabase.from('incoming_payments').select('doc_num, customer_name, total_amount, payment_type, doc_date, status').order('doc_date', { ascending: false });
      downloadCSV('daily-cash-register', ['Doc#', 'Customer', 'Amount', 'Type', 'Date', 'Status'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total_amount, r.payment_type, r.doc_date, r.status]));
    },
    9: async () => {
      const { data } = await (supabase.from('sales_targets' as any).select('*').order('created_at', { ascending: false }) as any);
      downloadCSV('target-achievement', ['ID', 'Target Type', 'Target Value', 'Achieved', 'Period'],
        (data || []).map((r: any) => [r.id, r.target_type, r.target_value, r.achieved_value, r.period]));
    },

    // Procurement Reports
    10: async () => {
      const { data } = await supabase.from('ap_invoices').select('invoice_number, vendor_name, total, doc_date, status').order('doc_date', { ascending: false });
      downloadCSV('purchase-summary', ['Invoice#', 'Vendor', 'Total', 'Date', 'Status'],
        (data || []).map(r => [r.invoice_number, r.vendor_name, r.total, r.doc_date, r.status]));
    },
    11: async () => {
      const { data } = await supabase.from('purchase_orders').select('po_number, vendor_name, total, status, doc_date, delivery_date').eq('status', 'open').order('doc_date');
      downloadCSV('open-purchase-orders', ['PO#', 'Vendor', 'Total', 'Status', 'Date', 'Delivery Date'],
        (data || []).map(r => [r.po_number, r.vendor_name, r.total, r.status, r.doc_date, r.delivery_date]));
    },
    12: async () => {
      const { data } = await supabase.from('goods_receipts').select('grpo_number, vendor_name, total, status, doc_date, purchase_order_id').order('doc_date', { ascending: false });
      downloadCSV('grpo-vs-po', ['GRPO#', 'Vendor', 'Total', 'Status', 'Date', 'PO ID'],
        (data || []).map(r => [r.grpo_number, r.vendor_name, r.total, r.status, r.doc_date, r.purchase_order_id]));
    },
    13: async () => {
      const { data } = await supabase.from('ap_invoices').select('invoice_number, vendor_name, total, doc_due_date, status').order('doc_due_date');
      downloadCSV('ap-aging', ['Invoice#', 'Vendor', 'Total', 'Due Date', 'Status'],
        (data || []).map(r => [r.invoice_number, r.vendor_name, r.total, r.doc_due_date, r.status]));
    },
    14: async () => {
      const { data } = await supabase.from('ap_invoices').select('vendor_name, vendor_code, total, doc_date').order('vendor_name');
      downloadCSV('purchase-by-vendor', ['Vendor', 'Code', 'Total', 'Date'],
        (data || []).map(r => [r.vendor_name, r.vendor_code, r.total, r.doc_date]));
    },

    // Inventory Reports
    15: async () => {
      const { data } = await supabase.from('items').select('item_code, description, in_stock, item_group, uom').order('item_code');
      downloadCSV('stock-status', ['Item Code', 'Description', 'In Stock', 'Group', 'UOM'],
        (data || []).map(r => [r.item_code, r.description, r.in_stock, r.item_group, r.uom]));
    },
    16: async () => {
      const { data } = await supabase.from('items').select('item_code, description, in_stock, unit_price, item_group').order('item_code');
      downloadCSV('inventory-valuation', ['Item Code', 'Description', 'Qty', 'Unit Price', 'Est. Value', 'Group'],
        (data || []).map(r => [r.item_code, r.description, r.in_stock, r.unit_price, (r.in_stock || 0) * (r.unit_price || 0), r.item_group]));
    },
    17: async () => {
      const { data } = await newTables.inventoryTransactions().select('*').order('created_at', { ascending: false }).limit(500);
      const rows = (data ?? []) as InventoryTransaction[];
      downloadCSV('stock-movement', ['ID', 'Item Code', 'Type', 'Qty', 'Warehouse', 'Date'],
        rows.map(r => [r.id, r.item_code, r.transaction_type, r.quantity, r.warehouse, r.created_at]));
    },
    18: async () => {
      const { data } = await (supabase.from('stock_transfers' as any).select('*').order('created_at', { ascending: false }) as any);
      downloadCSV('stock-transfers', ['ID', 'From WH', 'To WH', 'Status', 'Date'],
        (data || []).map((r: any) => [r.id, r.from_warehouse, r.to_warehouse, r.status, r.created_at]));
    },
    19: async () => {
      const { data } = await newTables.inventoryCountingSessions().select('*').order('created_at', { ascending: false });
      const rows = (data ?? []) as InventoryCountingSession[];
      downloadCSV('counting-variance', ['ID', 'Status', 'Warehouse', 'Date'],
        rows.map(r => [r.id, r.status, r.warehouse, r.created_at]));
    },
    20: async () => {
      const { data } = await supabase.from('items').select('item_code, description, in_stock, updated_at').order('updated_at');
      downloadCSV('slow-moving-items', ['Item Code', 'Description', 'In Stock', 'Last Updated'],
        (data || []).map(r => [r.item_code, r.description, r.in_stock, r.updated_at]));
    },

    // CRM Reports
    21: async () => {
      const { data } = await supabase.from('activities').select('subject, type, status, assigned_to, due_date, created_at').order('created_at', { ascending: false });
      downloadCSV('activity-report', ['Subject', 'Type', 'Status', 'Assigned To', 'Due Date', 'Created'],
        (data || []).map(r => [r.subject, r.type, r.status, r.assigned_to, r.due_date, r.created_at]));
    },
    22: async () => {
      const { data } = await supabase.from('opportunities').select('name, stage, value, probability, expected_close, closing_type, created_at').order('value', { ascending: false });
      downloadCSV('opportunity-pipeline', ['Name', 'Stage', 'Value', 'Probability', 'Expected Close', 'Closing Type'],
        (data || []).map(r => [r.name, r.stage, r.value, r.probability, r.expected_close, r.closing_type]));
    },
    23: async () => {
      const { data } = await supabase.from('business_partners').select('card_name, card_code, card_type, status, created_at').eq('card_type', 'lead').order('created_at', { ascending: false });
      downloadCSV('lead-conversion', ['Name', 'Code', 'Type', 'Status', 'Created'],
        (data || []).map(r => [r.card_name, r.card_code, r.card_type, r.status, r.created_at]));
    },
    24: async () => {
      const { data } = await supabase.from('activities').select('subject, type, status, card_code, due_date, created_at').order('card_code');
      downloadCSV('customer-interactions', ['Subject', 'Type', 'Status', 'Customer Code', 'Due Date', 'Created'],
        (data || []).map(r => [r.subject, r.type, r.status, r.card_code, r.due_date, r.created_at]));
    },

    // Finance Reports
    25: async () => {
      const { data } = await supabase.from('ar_invoices').select('doc_num, customer_name, total, balance_due, doc_due_date, status').order('doc_due_date');
      downloadCSV('ar-aging', ['Doc#', 'Customer', 'Total', 'Balance Due', 'Due Date', 'Status'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total, r.balance_due, r.doc_due_date, r.status]));
    },
    26: async () => {
      const { data } = await supabase.from('ap_invoices').select('invoice_number, vendor_name, total, doc_due_date, status').order('doc_due_date');
      downloadCSV('ap-aging', ['Invoice#', 'Vendor', 'Total', 'Due Date', 'Status'],
        (data || []).map(r => [r.invoice_number, r.vendor_name, r.total, r.doc_due_date, r.status]));
    },
    27: async () => {
      const { data: invoices } = await supabase.from('ar_invoices').select('doc_num, customer_name, customer_code, total, paid_amount, balance_due, doc_date, status').order('customer_name');
      const { data: payments } = await supabase.from('incoming_payments').select('doc_num, customer_name, total_amount, doc_date, status').order('customer_name');
      const rows = [
        ...(invoices || []).map(r => ['Invoice', r.doc_num, r.customer_name, r.total, r.paid_amount, r.balance_due, r.doc_date, r.status]),
        ...(payments || []).map(r => ['Payment', r.doc_num, r.customer_name, r.total_amount, '', '', r.doc_date, r.status]),
      ];
      downloadCSV('customer-account-statement', ['Type', 'Doc#', 'Customer', 'Amount', 'Paid', 'Balance', 'Date', 'Status'], rows);
    },
    28: async () => {
      const { data } = await supabase.from('chart_of_accounts').select('acct_code, acct_name, acct_type, balance').order('acct_code');
      downloadCSV('revenue-by-coa', ['Acct Code', 'Acct Name', 'Type', 'Balance'],
        (data || []).map(r => [r.acct_code, r.acct_name, r.acct_type, r.balance]));
    },
    29: async () => {
      const { data } = await supabase.from('sales_orders').select('doc_num, customer_name, total, doc_date, status, branch_id').order('doc_date', { ascending: false });
      downloadCSV('daily-sales-vs-target', ['Doc#', 'Customer', 'Total', 'Date', 'Status', 'Branch'],
        (data || []).map(r => [r.doc_num, r.customer_name, r.total, r.doc_date, r.status, r.branch_id]));
    },
    // 30 = General Ledger → navigates (handled in component)
  };
}
