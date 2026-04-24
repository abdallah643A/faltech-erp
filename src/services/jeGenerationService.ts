import { supabase } from '@/integrations/supabase/client';

/**
 * JE Generation Service — PRD Section 5
 * Loads mapping rules for a document type, builds JE header + lines,
 * validates balance, and returns the JE object (does NOT save to DB).
 */

export interface GeneratedJELine {
  line_number: number;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  cost_center?: string;
  project_code?: string;
  description?: string;
  tax_code?: string;
  currency: string;
  amount_local: number;
  exchange_rate: number;
  partner_id?: string;
}

export interface GeneratedJE {
  je_number?: string;
  source_document_type: string;
  source_document_id: string;
  source_document_ref: string;
  posting_date: string;
  document_date: string;
  period: string;
  fiscal_year: number;
  currency: string;
  total_debit: number;
  total_credit: number;
  description: string;
  business_vertical?: string;
  lines: GeneratedJELine[];
  is_balanced: boolean;
}

// Document field mapping — which fields to read from each source table
const DOC_TABLE_MAP: Record<string, { table: string; refField: string; totalField: string; subtotalField?: string; taxField?: string; customerField?: string; vendorField?: string; currencyField?: string; dateField?: string }> = {
  ar_invoice: { table: 'ar_invoices', refField: 'doc_num', totalField: 'total', subtotalField: 'subtotal', taxField: 'tax_amount', customerField: 'customer_code', currencyField: 'currency', dateField: 'doc_date' },
  ar_credit_memo: { table: 'ar_credit_memos', refField: 'doc_num', totalField: 'total', subtotalField: 'subtotal', taxField: 'tax_amount', customerField: 'customer_code', currencyField: 'currency', dateField: 'doc_date' },
  incoming_payment: { table: 'incoming_payments', refField: 'doc_num', totalField: 'total_amount', customerField: 'customer_code', currencyField: 'currency', dateField: 'doc_date' },
  ap_invoice: { table: 'ap_invoices', refField: 'invoice_number', totalField: 'total', subtotalField: 'subtotal', taxField: 'tax_amount', vendorField: 'vendor_code', currencyField: 'currency', dateField: 'doc_date' },
  ap_credit_memo: { table: 'ap_credit_memos', refField: 'doc_num', totalField: 'total', subtotalField: 'subtotal', taxField: 'tax_amount', vendorField: 'vendor_code', currencyField: 'currency', dateField: 'doc_date' },
  outgoing_payment: { table: 'outgoing_payments', refField: 'doc_num', totalField: 'total_amount', vendorField: 'vendor_code', currencyField: 'currency', dateField: 'doc_date' },
  goods_receipt: { table: 'goods_receipts', refField: 'receipt_number', totalField: 'total', dateField: 'receipt_date' },
  delivery_note: { table: 'delivery_notes', refField: 'doc_num', totalField: 'total', dateField: 'delivery_date' },
  goods_issue: { table: 'delivery_notes', refField: 'doc_num', totalField: 'total', dateField: 'delivery_date' },
  stock_transfer: { table: 'stock_transfers', refField: 'transfer_number', totalField: 'total_value', dateField: 'transfer_date' },
  progress_billing: { table: 'cpms_invoices', refField: 'invoice_number', totalField: 'total_amount', dateField: 'invoice_date' },
  payroll: { table: 'payroll_periods', refField: 'period_name', totalField: 'total_gross', dateField: 'pay_date' },
  cpms_invoice: { table: 'cpms_invoices', refField: 'invoice_number', totalField: 'total_amount', dateField: 'invoice_date' },
};

/**
 * Resolve the amount for a JE line based on the amount_source config
 */
function resolveAmount(
  amountSource: string,
  percentage: number,
  fixedAmount: number | null,
  docData: Record<string, any>,
  amountField?: string | null
): number {
  let baseAmount = 0;

  switch (amountSource) {
    case 'total':
      baseAmount = Number(docData._total) || 0;
      break;
    case 'subtotal':
      baseAmount = Number(docData._subtotal) || Number(docData._total) || 0;
      break;
    case 'tax_amount':
      baseAmount = Number(docData._tax) || 0;
      break;
    case 'discount_amount':
      baseAmount = Number(docData.discount_amount) || 0;
      break;
    case 'custom_field':
      baseAmount = Number(docData[amountField || '']) || 0;
      break;
    case 'fixed':
      return fixedAmount || 0;
    default:
      baseAmount = Number(docData._total) || 0;
  }

  return baseAmount * (percentage / 100);
}

/**
 * Fill remarks template with document data
 */
function fillTemplate(template: string | null, docData: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return String(docData[key] || docData[`_${key}`] || '');
  });
}

/**
 * Resolve mapping rules & lines for a document type.
 */
async function loadMappingRulesAndLines(documentType: string, companyId?: string | null) {
  let query = supabase
    .from('je_mapping_rules')
    .select('*')
    .eq('document_type', documentType)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (companyId) query = query.or(`company_id.eq.${companyId},company_id.is.null`);

  const { data: rules, error: rulesErr } = await query;
  if (rulesErr) throw rulesErr;
  if (!rules || rules.length === 0) throw new Error(`No active mapping rule found for document type: ${documentType}`);

  const rule = rules[0];

  const { data: ruleLines, error: linesErr } = await supabase
    .from('je_mapping_rule_lines')
    .select('*')
    .eq('rule_id', rule.id)
    .order('line_order');
  if (linesErr) throw linesErr;
  if (!ruleLines || ruleLines.length === 0) throw new Error('Mapping rule has no lines defined');

  return { rule, ruleLines };
}

/**
 * Build JE from docData (already resolved), rules, and ruleLines.
 */
function buildJEFromData(
  documentType: string,
  documentId: string,
  docData: Record<string, any>,
  rule: any,
  ruleLines: any[],
  postingDate?: string,
): GeneratedJE {
  const currency = docData._currency || 'SAR';
  const docDate = postingDate || docData._date || new Date().toISOString().split('T')[0];
  const period = docDate.substring(0, 7);
  const fiscalYear = parseInt(docDate.substring(0, 4));

  const jeLines: GeneratedJELine[] = ruleLines.map((rl: any, idx: number) => {
    const amount = resolveAmount(
      rl.amount_source,
      rl.percentage ?? 100,
      rl.fixed_amount,
      docData,
      rl.amount_field
    );

    return {
      line_number: idx + 1,
      account_code: rl.acct_code,
      account_name: rl.acct_name || '',
      debit_amount: rl.entry_type === 'debit' ? Math.round(amount * 10000) / 10000 : 0,
      credit_amount: rl.entry_type === 'credit' ? Math.round(amount * 10000) / 10000 : 0,
      cost_center: rl.cost_center_source ? (docData[rl.cost_center_source] || rl.cost_center_source) : undefined,
      project_code: rl.project_source ? (docData[rl.project_source] || rl.project_source) : undefined,
      description: fillTemplate(rl.remarks_template, docData) || rl.description || '',
      tax_code: rl.tax_code || undefined,
      currency,
      amount_local: rl.entry_type === 'debit' ? Math.round(amount * 10000) / 10000 : Math.round(amount * 10000) / 10000,
      exchange_rate: 1.0,
      partner_id: rl.bp_source ? (docData[rl.bp_source] || undefined) : undefined,
    };
  });

  const totalDebit = jeLines.reduce((s, l) => s + l.debit_amount, 0);
  const totalCredit = jeLines.reduce((s, l) => s + l.credit_amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const refStr = docData._ref || documentId.substring(0, 8);
  const desc = `${documentType.replace(/_/g, ' ').toUpperCase()} ${refStr} — ${docDate}`;

  return {
    source_document_type: documentType,
    source_document_id: documentId,
    source_document_ref: String(refStr),
    posting_date: docDate,
    document_date: docDate,
    period,
    fiscal_year: fiscalYear,
    currency,
    total_debit: Math.round(totalDebit * 10000) / 10000,
    total_credit: Math.round(totalCredit * 10000) / 10000,
    description: desc,
    business_vertical: (rule as any).business_vertical || undefined,
    lines: jeLines,
    is_balanced: isBalanced,
  };
}

/**
 * Generate a JE preview from raw document data — used BEFORE saving.
 * Pass the form data directly so no DB lookup is needed for the document.
 */
export async function generateJEPreviewFromData(
  documentType: string,
  formData: {
    total?: number;
    subtotal?: number;
    tax_amount?: number;
    currency?: string;
    doc_date?: string;
    doc_num?: number | string;
    customer_code?: string;
    customer_name?: string;
    vendor_code?: string;
    vendor_name?: string;
    discount_amount?: number;
    [key: string]: any;
  },
  companyId?: string | null,
): Promise<GeneratedJE> {
  const { rule, ruleLines } = await loadMappingRulesAndLines(documentType, companyId);

  const docData: Record<string, any> = {
    ...formData,
    _total: formData.total || 0,
    _subtotal: formData.subtotal || formData.total || 0,
    _tax: formData.tax_amount || 0,
    _ref: formData.doc_num || 'DRAFT',
    _customer: formData.customer_code || null,
    _vendor: formData.vendor_code || null,
    _currency: formData.currency || 'SAR',
    _date: formData.doc_date || new Date().toISOString().split('T')[0],
    doc_type: documentType,
  };

  return buildJEFromData(documentType, 'unsaved', docData, rule, ruleLines, formData.doc_date);
}

/**
 * Generate a JE preview for a given document — does NOT save to DB.
 * Used for the JE Preview panel on source documents.
 */
export async function generateJEPreview(
  documentType: string,
  documentId: string,
  postingDate?: string,
  companyId?: string | null,
): Promise<GeneratedJE> {
  const { rule, ruleLines } = await loadMappingRulesAndLines(documentType, companyId);

  // Load source document data
  const tableConfig = DOC_TABLE_MAP[documentType];
  if (!tableConfig) throw new Error(`Unknown document type: ${documentType}`);

  const { data: doc, error: docErr } = await supabase
    .from(tableConfig.table as any)
    .select('*')
    .eq('id', documentId)
    .single();
  if (docErr) throw docErr;
  if (!doc) throw new Error('Source document not found');

  const docData: Record<string, any> = {
    ...doc as any,
    _total: (doc as any)[tableConfig.totalField] || 0,
    _subtotal: tableConfig.subtotalField ? (doc as any)[tableConfig.subtotalField] : null,
    _tax: tableConfig.taxField ? (doc as any)[tableConfig.taxField] : null,
    _ref: (doc as any)[tableConfig.refField] || '',
    _customer: tableConfig.customerField ? (doc as any)[tableConfig.customerField] : null,
    _vendor: tableConfig.vendorField ? (doc as any)[tableConfig.vendorField] : null,
    _currency: (tableConfig.currencyField ? (doc as any)[tableConfig.currencyField] : 'SAR') || 'SAR',
    _date: postingDate || (tableConfig.dateField ? (doc as any)[tableConfig.dateField] : null) || new Date().toISOString().split('T')[0],
    doc_type: documentType,
  };

  return buildJEFromData(documentType, documentId, docData, rule, ruleLines, postingDate);

}

/**
 * Post a document and auto-generate its JE atomically.
 * PRD Section 5, Steps 2-8
 */
export async function postDocumentWithJE(
  documentType: string,
  documentId: string,
  postingDate: string,
  userId: string,
  companyId?: string | null,
): Promise<{ je_id: string; je_number: string }> {
  // 1. Generate JE preview
  const je = await generateJEPreview(documentType, documentId, postingDate, companyId);

  // 2. Validate balance
  if (!je.is_balanced) {
    throw new Error(`JE is unbalanced: Debit ${je.total_debit} ≠ Credit ${je.total_credit}`);
  }

  // 3. Generate JE number
  const { data: jeNumData, error: jeNumErr } = await supabase.rpc('generate_je_number');
  if (jeNumErr) throw jeNumErr;
  const jeNumber = jeNumData as string;

  // 4. Insert JE header
  const { data: jeRecord, error: jeErr } = await supabase
    .from('finance_journal_entries')
    .insert({
      je_number: jeNumber,
      source_document_type: je.source_document_type,
      source_document_id: je.source_document_id,
      source_document_ref: je.source_document_ref,
      posting_date: je.posting_date,
      document_date: je.document_date,
      period: je.period,
      fiscal_year: je.fiscal_year,
      currency: je.currency,
      total_debit: je.total_debit,
      total_credit: je.total_credit,
      status: 'POSTED',
      sap_sync_status: 'PENDING',
      description: je.description,
      created_by: userId,
      posted_at: new Date().toISOString(),
      company_id: companyId || null,
      business_vertical: je.business_vertical || null,
    })
    .select()
    .single();
  if (jeErr) throw jeErr;

  // 5. Insert JE lines
  const lineInserts = je.lines.map(l => ({
    je_id: jeRecord.id,
    line_number: l.line_number,
    account_code: l.account_code,
    account_name: l.account_name,
    debit_amount: l.debit_amount,
    credit_amount: l.credit_amount,
    cost_center: l.cost_center || null,
    project_code: l.project_code || null,
    description: l.description || null,
    tax_code: l.tax_code || null,
    currency: l.currency,
    amount_local: l.amount_local,
    exchange_rate: l.exchange_rate,
    partner_id: l.partner_id || null,
  }));

  const { error: linesErr } = await supabase
    .from('finance_journal_entry_lines')
    .insert(lineInserts);
  if (linesErr) throw linesErr;

  // 6. Queue for SAP sync
  const { error: queueErr } = await supabase
    .from('sap_sync_queue')
    .insert({ je_id: jeRecord.id, status: 'QUEUED' });
  if (queueErr) throw queueErr;

  return { je_id: jeRecord.id, je_number: jeNumber };
}
