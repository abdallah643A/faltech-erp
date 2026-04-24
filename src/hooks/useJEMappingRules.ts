import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface JEMappingRuleLine {
  id?: string;
  rule_id?: string;
  line_order: number;
  description?: string;
  acct_code: string;
  acct_name?: string;
  entry_type: 'debit' | 'credit';
  amount_source: string;
  amount_field?: string;
  fixed_amount?: number;
  percentage?: number;
  cost_center_source?: string;
  project_source?: string;
  bp_source?: string;
  remarks_template?: string;
  tax_code?: string;
  currency_source?: string;
}

export interface JEMappingRule {
  id: string;
  name: string;
  document_type: string;
  description?: string;
  is_active: boolean;
  trigger_on: string;
  trigger_status?: string;
  company_id?: string;
  priority: number;
  conditions?: Record<string, any>;
  business_vertical?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  lines?: JEMappingRuleLine[];
}

export const DOCUMENT_TYPES = [
  // PRD Section 2 — all 15 document types
  { value: 'ar_invoice', label: 'AR Invoice', sap: 'OINV', vertical: 'Trading / Industrial' },
  { value: 'ar_credit_memo', label: 'AR Credit Memo', sap: 'ORIN', vertical: 'Trading / Industrial' },
  { value: 'incoming_payment', label: 'Customer Payment / Receipt', sap: 'ORCT', vertical: 'All' },
  { value: 'ap_invoice', label: 'AP Invoice (Vendor Bill)', sap: 'OPCH', vertical: 'All' },
  { value: 'ap_credit_memo', label: 'AP Credit Memo', sap: 'ORPC', vertical: 'All' },
  { value: 'outgoing_payment', label: 'Vendor Payment', sap: 'OVPM', vertical: 'All' },
  { value: 'goods_receipt', label: 'Purchase Order Receipt (GRPO)', sap: 'OPDN', vertical: 'Trading / Industrial' },
  { value: 'goods_issue', label: 'Goods Issue / Delivery Note', sap: 'ODLN/OIGE', vertical: 'Trading / Industrial' },
  { value: 'stock_transfer', label: 'Inventory Transfer', sap: 'OWTR', vertical: 'All' },
  { value: 'progress_billing', label: 'Project Progress Billing', sap: 'OINV+Project', vertical: 'Construction' },
  { value: 'project_cost_allocation', label: 'Project Cost Allocation (WIP)', sap: 'JE', vertical: 'Construction' },
  { value: 'revenue_recognition', label: 'Revenue Recognition (% Complete)', sap: 'JE', vertical: 'Construction' },
  { value: 'payroll', label: 'Payroll Journal', sap: 'JE', vertical: 'All' },
  { value: 'depreciation', label: 'Fixed Asset Depreciation', sap: 'FA', vertical: 'Industrial / Construction' },
  { value: 'bank_charges', label: 'Bank Reconciliation / Charges', sap: 'JE/Recon', vertical: 'All' },
  { value: 'delivery_note', label: 'Delivery Note', sap: 'ODLN', vertical: 'Trading' },
  { value: 'cpms_invoice', label: 'CPMS Invoice', sap: 'Custom', vertical: 'Construction' },
];

export const AMOUNT_SOURCES = [
  { value: 'total', label: 'Document Total (incl. VAT)' },
  { value: 'subtotal', label: 'Subtotal / Net Amount (excl. VAT)' },
  { value: 'tax_amount', label: 'Tax / VAT Amount' },
  { value: 'line_total', label: 'Per Line Total' },
  { value: 'discount_amount', label: 'Discount Amount' },
  { value: 'gross_salary', label: 'Gross Salary (Payroll)' },
  { value: 'gosi_employer', label: 'GOSI Employer 11.75% (Payroll)' },
  { value: 'gosi_employee', label: 'GOSI Employee 10% (Payroll)' },
  { value: 'net_salary', label: 'Net Salary (Payroll)' },
  { value: 'depreciation_amount', label: 'Monthly Depreciation' },
  { value: 'wip_amount', label: 'WIP / Project Cost' },
  { value: 'retention_amount', label: 'Retention Amount' },
  { value: 'custom_field', label: 'Custom Field' },
  { value: 'fixed', label: 'Fixed Amount' },
];

export const TRIGGER_TYPES = [
  { value: 'post', label: 'On Post (DRAFT → POSTED)' },
  { value: 'approve', label: 'On Approval' },
  { value: 'status_change', label: 'On Status Change' },
  { value: 'monthly_run', label: 'Monthly Batch Run' },
];

export const BUSINESS_VERTICALS = [
  { value: 'all', label: 'All Verticals' },
  { value: 'trading', label: 'Trading' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'construction', label: 'Construction' },
];

// PRD Appendix A — Required GL accounts
export const REQUIRED_GL_ACCOUNTS = [
  { code: '1000', name: 'Cash on Hand', type: 'Asset' },
  { code: '1010', name: 'Bank Account — SAR', type: 'Asset' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
  { code: '1250', name: 'Retention Receivable', type: 'Asset' },
  { code: '1320', name: 'VAT Input (15%)', type: 'Asset' },
  { code: '1500', name: 'Inventory / Stock', type: 'Asset' },
  { code: '1600', name: 'WIP — Construction Projects', type: 'Asset' },
  { code: '1720', name: 'Accumulated Depreciation', type: 'Contra-Asset' },
  { code: '1800', name: 'Inter-Company Receivable', type: 'Asset' },
  { code: '2100', name: 'Accounts Payable', type: 'Liability' },
  { code: '2150', name: 'GR/IR Clearing', type: 'Liability' },
  { code: '2200', name: 'Accrued Salaries Payable', type: 'Liability' },
  { code: '2210', name: 'GOSI Payable', type: 'Liability' },
  { code: '2300', name: 'VAT Output (15%)', type: 'Liability' },
  { code: '2350', name: 'WHT Payable', type: 'Liability' },
  { code: '2400', name: 'Customer Advance / Prepayment', type: 'Liability' },
  { code: '2500', name: 'Deferred Revenue', type: 'Liability' },
  { code: '4100', name: 'Sales Revenue — Trading', type: 'Revenue' },
  { code: '4110', name: 'Sales Revenue — Services', type: 'Revenue' },
  { code: '4200', name: 'Contract Revenue — Construction', type: 'Revenue' },
  { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'Expense' },
  { code: '5500', name: 'Purchase Price Variance', type: 'Expense' },
  { code: '6100', name: 'Salaries & Wages Expense', type: 'Expense' },
  { code: '6110', name: 'GOSI — Employer Contribution', type: 'Expense' },
  { code: '6500', name: 'Depreciation Expense', type: 'Expense' },
  { code: '6800', name: 'Bank Charges & Fees', type: 'Expense' },
  { code: '6900', name: 'FX Gain / Loss', type: 'Expense/Income' },
  { code: '7100', name: 'Interest Income', type: 'Income' },
];

// PRD Section 4 — Seed JE patterns for each document type
export const SEED_JE_PATTERNS: Record<string, { name: string; description: string; lines: Omit<JEMappingRuleLine, 'line_order'>[] }> = {
  ar_invoice: {
    name: 'AR Invoice → Revenue + VAT',
    description: 'DR A/R, CR Revenue + VAT Output. Per PRD Section 4.1',
    lines: [
      { acct_code: '1200', acct_name: 'Accounts Receivable', entry_type: 'debit', amount_source: 'total', percentage: 100, bp_source: 'customer_code', remarks_template: 'AR Invoice #{doc_num} — {customer_name}' },
      { acct_code: '4100', acct_name: 'Sales Revenue', entry_type: 'credit', amount_source: 'subtotal', percentage: 100, remarks_template: 'Revenue — {customer_name}' },
      { acct_code: '2300', acct_name: 'VAT Output (15%)', entry_type: 'credit', amount_source: 'tax_amount', percentage: 100, tax_code: 'VAT15', remarks_template: 'VAT Output 15%' },
    ],
  },
  ar_credit_memo: {
    name: 'AR Credit Memo → Reverse Revenue',
    description: 'DR Revenue + VAT, CR A/R. Per PRD Section 4.2',
    lines: [
      { acct_code: '4100', acct_name: 'Sales Revenue', entry_type: 'debit', amount_source: 'subtotal', percentage: 100, remarks_template: 'Credit Memo #{doc_num}' },
      { acct_code: '2300', acct_name: 'VAT Output (15%)', entry_type: 'debit', amount_source: 'tax_amount', percentage: 100, tax_code: 'VAT15' },
      { acct_code: '1200', acct_name: 'Accounts Receivable', entry_type: 'credit', amount_source: 'total', percentage: 100, bp_source: 'customer_code' },
    ],
  },
  incoming_payment: {
    name: 'Customer Payment → Bank + A/R',
    description: 'DR Bank/Cash, CR A/R. Per PRD Section 4.3',
    lines: [
      { acct_code: '1010', acct_name: 'Bank Account — SAR', entry_type: 'debit', amount_source: 'total', percentage: 100, remarks_template: 'Payment from {customer_name}' },
      { acct_code: '1200', acct_name: 'Accounts Receivable', entry_type: 'credit', amount_source: 'total', percentage: 100, bp_source: 'customer_code' },
    ],
  },
  ap_invoice: {
    name: 'AP Invoice → Expense + VAT',
    description: 'DR Expense/Inventory + VAT Input, CR A/P. Per PRD Section 4.4',
    lines: [
      { acct_code: '5000', acct_name: 'Expense / Inventory', entry_type: 'debit', amount_source: 'subtotal', percentage: 100, remarks_template: 'AP Invoice {invoice_number} — {vendor_name}' },
      { acct_code: '1320', acct_name: 'VAT Input (15%)', entry_type: 'debit', amount_source: 'tax_amount', percentage: 100, tax_code: 'VAT15' },
      { acct_code: '2100', acct_name: 'Accounts Payable', entry_type: 'credit', amount_source: 'total', percentage: 100, bp_source: 'vendor_code' },
    ],
  },
  ap_credit_memo: {
    name: 'AP Credit Memo → Reverse Expense',
    description: 'DR A/P, CR Expense + VAT Input. Per PRD Section 4.5',
    lines: [
      { acct_code: '2100', acct_name: 'Accounts Payable', entry_type: 'debit', amount_source: 'total', percentage: 100, bp_source: 'vendor_code' },
      { acct_code: '5000', acct_name: 'Expense / Inventory', entry_type: 'credit', amount_source: 'subtotal', percentage: 100 },
      { acct_code: '1320', acct_name: 'VAT Input (15%)', entry_type: 'credit', amount_source: 'tax_amount', percentage: 100, tax_code: 'VAT15' },
    ],
  },
  outgoing_payment: {
    name: 'Vendor Payment → A/P + Bank',
    description: 'DR A/P, CR Bank. Per PRD Section 4.6',
    lines: [
      { acct_code: '2100', acct_name: 'Accounts Payable', entry_type: 'debit', amount_source: 'total', percentage: 100, bp_source: 'vendor_code' },
      { acct_code: '1010', acct_name: 'Bank Account — SAR', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  goods_receipt: {
    name: 'GRPO → Inventory + GR/IR Clearing',
    description: 'DR Inventory, CR GR/IR Clearing. Per PRD Section 4.7',
    lines: [
      { acct_code: '1500', acct_name: 'Inventory / Stock', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '2150', acct_name: 'GR/IR Clearing', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  goods_issue: {
    name: 'Goods Issue → COGS + Inventory',
    description: 'DR COGS, CR Inventory. Per PRD Section 4.8',
    lines: [
      { acct_code: '5000', acct_name: 'Cost of Goods Sold (COGS)', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '1500', acct_name: 'Inventory / Stock', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  stock_transfer: {
    name: 'Inventory Transfer',
    description: 'DR Inventory-Dest, CR Inventory-Source. Per PRD Section 4.9',
    lines: [
      { acct_code: '1500', acct_name: 'Inventory — Destination WH', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '1500', acct_name: 'Inventory — Source WH', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  progress_billing: {
    name: 'Progress Billing → A/R + Contract Revenue',
    description: 'DR A/R, CR Contract Revenue + VAT. Per PRD Section 4.10',
    lines: [
      { acct_code: '1200', acct_name: 'Accounts Receivable', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '4200', acct_name: 'Contract Revenue', entry_type: 'credit', amount_source: 'subtotal', percentage: 100 },
      { acct_code: '2300', acct_name: 'VAT Output (15%)', entry_type: 'credit', amount_source: 'tax_amount', percentage: 100, tax_code: 'VAT15' },
    ],
  },
  project_cost_allocation: {
    name: 'Project Cost Allocation → WIP',
    description: 'DR WIP, CR A/P or Accrued. Per PRD Section 4.11',
    lines: [
      { acct_code: '1600', acct_name: 'WIP — Construction', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '2100', acct_name: 'Accounts Payable', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  revenue_recognition: {
    name: 'Revenue Recognition (% Complete)',
    description: 'DR Deferred Revenue, CR Earned Revenue. Per PRD Section 4.12',
    lines: [
      { acct_code: '2500', acct_name: 'Deferred Revenue', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '4200', acct_name: 'Earned Contract Revenue', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
  payroll: {
    name: 'Payroll Journal → Salaries + GOSI',
    description: 'DR Salaries + GOSI Employer, CR Net Payable + GOSI Payable. Per PRD Section 4.13',
    lines: [
      { acct_code: '6100', acct_name: 'Salaries & Wages', entry_type: 'debit', amount_source: 'gross_salary', percentage: 100 },
      { acct_code: '6110', acct_name: 'GOSI — Employer', entry_type: 'debit', amount_source: 'gosi_employer', percentage: 100 },
      { acct_code: '2200', acct_name: 'Accrued Salaries Payable', entry_type: 'credit', amount_source: 'net_salary', percentage: 100 },
      { acct_code: '2210', acct_name: 'GOSI Payable', entry_type: 'credit', amount_source: 'gosi_employer', percentage: 100 },
    ],
  },
  depreciation: {
    name: 'Fixed Asset Depreciation',
    description: 'DR Depreciation Expense, CR Accumulated Depreciation. Per PRD Section 4.14',
    lines: [
      { acct_code: '6500', acct_name: 'Depreciation Expense', entry_type: 'debit', amount_source: 'depreciation_amount', percentage: 100 },
      { acct_code: '1720', acct_name: 'Accumulated Depreciation', entry_type: 'credit', amount_source: 'depreciation_amount', percentage: 100 },
    ],
  },
  bank_charges: {
    name: 'Bank Charges',
    description: 'DR Bank Charges, CR Bank Account. Per PRD Section 4.15',
    lines: [
      { acct_code: '6800', acct_name: 'Bank Charges & Fees', entry_type: 'debit', amount_source: 'total', percentage: 100 },
      { acct_code: '1010', acct_name: 'Bank Account', entry_type: 'credit', amount_source: 'total', percentage: 100 },
    ],
  },
};

export function useJEMappingRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['je-mapping-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('je_mapping_rules')
        .select('*')
        .order('document_type')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as JEMappingRule[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['je-mapping-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type')
        .eq('is_active', true)
        .order('acct_code');
      if (error) throw error;
      return data;
    },
  });

  // PRD: finance_journal_entries list for JE Ledger view
  const { data: postedJEs = [], isLoading: isLoadingJEs } = useQuery({
    queryKey: ['finance-journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // SAP Sync Queue
  const { data: syncQueue = [], isLoading: isLoadingSync } = useQuery({
    queryKey: ['sap-sync-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sap_sync_queue')
        .select('*, finance_journal_entries(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const getRuleLines = async (ruleId: string): Promise<JEMappingRuleLine[]> => {
    const { data, error } = await supabase
      .from('je_mapping_rule_lines')
      .select('*')
      .eq('rule_id', ruleId)
      .order('line_order');
    if (error) throw error;
    return data as JEMappingRuleLine[];
  };

  const createRule = useMutation({
    mutationFn: async (data: {
      name: string;
      document_type: string;
      description?: string;
      trigger_on: string;
      trigger_status?: string;
      priority?: number;
      conditions?: Record<string, any>;
      business_vertical?: string;
      lines: JEMappingRuleLine[];
    }) => {
      const { data: rule, error } = await supabase
        .from('je_mapping_rules')
        .insert({
          name: data.name,
          document_type: data.document_type,
          description: data.description || null,
          trigger_on: data.trigger_on,
          trigger_status: data.trigger_status || null,
          priority: data.priority || 0,
          conditions: data.conditions || {},
          business_vertical: data.business_vertical || null,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          rule_id: rule.id,
          line_order: i + 1,
          description: l.description || null,
          acct_code: l.acct_code,
          acct_name: l.acct_name || null,
          entry_type: l.entry_type,
          amount_source: l.amount_source,
          amount_field: l.amount_field || null,
          fixed_amount: l.fixed_amount || null,
          percentage: l.percentage ?? 100,
          cost_center_source: l.cost_center_source || null,
          project_source: l.project_source || null,
          bp_source: l.bp_source || null,
          remarks_template: l.remarks_template || null,
          tax_code: l.tax_code || null,
          currency_source: l.currency_source || null,
        }));
        const { error: lErr } = await supabase.from('je_mapping_rule_lines').insert(lines);
        if (lErr) throw lErr;
      }
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['je-mapping-rules'] });
      toast({ title: 'Rule Created', description: 'JE mapping rule saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      document_type: string;
      description?: string;
      trigger_on: string;
      trigger_status?: string;
      priority?: number;
      conditions?: Record<string, any>;
      business_vertical?: string;
      lines: JEMappingRuleLine[];
    }) => {
      const { error } = await supabase
        .from('je_mapping_rules')
        .update({
          name: data.name,
          document_type: data.document_type,
          description: data.description || null,
          trigger_on: data.trigger_on,
          trigger_status: data.trigger_status || null,
          priority: data.priority || 0,
          conditions: data.conditions || {},
          business_vertical: data.business_vertical || null,
        })
        .eq('id', data.id);
      if (error) throw error;

      await supabase.from('je_mapping_rule_lines').delete().eq('rule_id', data.id);
      if (data.lines.length > 0) {
        const lines = data.lines.map((l, i) => ({
          rule_id: data.id,
          line_order: i + 1,
          description: l.description || null,
          acct_code: l.acct_code,
          acct_name: l.acct_name || null,
          entry_type: l.entry_type,
          amount_source: l.amount_source,
          amount_field: l.amount_field || null,
          fixed_amount: l.fixed_amount || null,
          percentage: l.percentage ?? 100,
          cost_center_source: l.cost_center_source || null,
          project_source: l.project_source || null,
          bp_source: l.bp_source || null,
          remarks_template: l.remarks_template || null,
          tax_code: l.tax_code || null,
          currency_source: l.currency_source || null,
        }));
        const { error: lErr } = await supabase.from('je_mapping_rule_lines').insert(lines);
        if (lErr) throw lErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['je-mapping-rules'] });
      toast({ title: 'Rule Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('je_mapping_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['je-mapping-rules'] });
      toast({ title: 'Status Updated' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('je_mapping_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['je-mapping-rules'] });
      toast({ title: 'Rule Deleted' });
    },
  });

  // Clone a rule
  const cloneRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) throw new Error('Rule not found');
      const lines = await getRuleLines(ruleId);

      const { data: newRule, error } = await supabase
        .from('je_mapping_rules')
        .insert({
          name: `${rule.name} (Copy)`,
          document_type: rule.document_type,
          description: rule.description,
          trigger_on: rule.trigger_on,
          trigger_status: rule.trigger_status,
          priority: rule.priority,
          conditions: rule.conditions || {},
          business_vertical: (rule as any).business_vertical || null,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (lines.length > 0) {
        const newLines = lines.map((l, i) => ({
          rule_id: newRule.id,
          line_order: i + 1,
          description: l.description || null,
          acct_code: l.acct_code,
          acct_name: l.acct_name || null,
          entry_type: l.entry_type,
          amount_source: l.amount_source,
          amount_field: l.amount_field || null,
          fixed_amount: l.fixed_amount || null,
          percentage: l.percentage ?? 100,
          cost_center_source: l.cost_center_source || null,
          project_source: l.project_source || null,
          bp_source: l.bp_source || null,
          remarks_template: l.remarks_template || null,
          tax_code: l.tax_code || null,
          currency_source: l.currency_source || null,
        }));
        await supabase.from('je_mapping_rule_lines').insert(newLines);
      }
      return newRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['je-mapping-rules'] });
      toast({ title: 'Rule Cloned' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Seed a rule from PRD template
  const seedFromTemplate = useMutation({
    mutationFn: async (docType: string) => {
      const pattern = SEED_JE_PATTERNS[docType];
      if (!pattern) throw new Error(`No seed template for ${docType}`);

      const lines: JEMappingRuleLine[] = pattern.lines.map((l, i) => ({
        ...l,
        line_order: i + 1,
      }));

      return createRule.mutateAsync({
        name: pattern.name,
        document_type: docType,
        description: pattern.description,
        trigger_on: 'post',
        business_vertical: DOCUMENT_TYPES.find(d => d.value === docType)?.vertical === 'Construction' ? 'construction' : 'all',
        lines,
      });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const testRule = useMutation({
    mutationFn: async ({ ruleId, documentId }: { ruleId: string; documentId?: string }) => {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) throw new Error('Rule not found');
      const lines = await getRuleLines(ruleId);
      if (lines.length === 0) throw new Error('Rule has no lines defined');

      const generatedLines = lines.map(l => ({
        acct_code: l.acct_code,
        acct_name: l.acct_name,
        entry_type: l.entry_type,
        amount_source: l.amount_source,
        percentage: l.percentage ?? 100,
        fixed_amount: l.fixed_amount,
        sample_amount: l.amount_source === 'fixed' ? (l.fixed_amount || 0) : 1000 * ((l.percentage ?? 100) / 100),
        remarks_template: l.remarks_template,
        bp_source: l.bp_source,
        tax_code: l.tax_code,
      }));

      const totalDebit = generatedLines.filter(l => l.entry_type === 'debit').reduce((s, l) => s + l.sample_amount, 0);
      const totalCredit = generatedLines.filter(l => l.entry_type === 'credit').reduce((s, l) => s + l.sample_amount, 0);
      const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

      const result = {
        status: balanced ? 'success' : 'warning',
        lines: generatedLines,
        totalDebit,
        totalCredit,
        message: balanced ? 'JE is balanced ✓' : `Unbalanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`,
      };

      await supabase.from('je_mapping_test_log').insert({
        rule_id: ruleId,
        test_document_id: documentId || null,
        test_document_type: rule.document_type,
        result_status: result.status,
        generated_lines: result as any,
        error_message: !balanced ? result.message : null,
        tested_by: user?.id,
      });

      return result;
    },
    onError: (e: any) => toast({ title: 'Test Failed', description: e.message, variant: 'destructive' }),
  });

  // Retry failed SAP sync
  const retrySyncQueue = useMutation({
    mutationFn: async (queueId: string) => {
      const { error } = await supabase
        .from('sap_sync_queue')
        .update({ status: 'QUEUED', last_error: null })
        .eq('id', queueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-sync-queue'] });
      toast({ title: 'Retry Queued' });
    },
  });

  return {
    rules, accounts, isLoading,
    postedJEs, isLoadingJEs,
    syncQueue, isLoadingSync,
    createRule, updateRule, toggleActive, deleteRule, cloneRule,
    seedFromTemplate, testRule, getRuleLines, retrySyncQueue,
  };
}
