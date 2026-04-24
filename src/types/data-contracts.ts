/**
 * Typed data contracts for the operational tables added in the
 * 2026-04-19 schema-mismatch cleanup migration.
 *
 * These mirror the columns created in the database for:
 *   - document_numbering
 *   - posting_periods
 *   - workflow_tasks
 *   - inventory_transactions
 *   - contacts
 *
 * And the compatibility views:
 *   - inventory_counting_sessions  → inventory_countings
 *   - employee_trainings           → training_enrollments
 *   - sales_quotations             → quotes (+ doc_num alias)
 *   - cpms_subcontractor_orders    → cpms_subcontract_orders
 *
 * Use these instead of `as any` casts when interacting with the new
 * tables so the rest of the codebase gets compile-time guarantees.
 */

// -------- Document Numbering --------
export interface DocumentNumbering {
  id: string;
  company_id: string | null;
  doc_type: string;
  series_name: string;
  prefix: string | null;
  suffix: string | null;
  first_number: number;
  last_number: number | null;
  next_number: number;
  is_default: boolean;
  is_locked: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type DocumentNumberingInsert = Omit<
  DocumentNumbering,
  'id' | 'created_at' | 'updated_at'
> & { id?: string };

// -------- Posting Periods --------
export type PostingPeriodStatus = 'open' | 'closed' | 'locked';

export interface PostingPeriod {
  id: string;
  company_id: string | null;
  period_name: string;        // 'YYYY-MM'
  fiscal_year: number | null;
  period_number: number | null;
  start_date: string;
  end_date: string;
  status: PostingPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// -------- Workflow Tasks --------
export type WorkflowTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'cancelled'
  | 'blocked';

export type WorkflowTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkflowTask {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  status: WorkflowTaskStatus;
  priority: WorkflowTaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  related_doc_type: string | null;
  related_doc_id: string | null;
  related_doc_number: string | null;
  module: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// -------- Inventory Transactions --------
export type InventoryTransactionType =
  | 'in'
  | 'out'
  | 'transfer'
  | 'adjustment'
  | 'count'
  | 'return'
  | 'consume';

export interface InventoryTransaction {
  id: string;
  company_id: string | null;
  branch_id: string | null;
  transaction_type: InventoryTransactionType;
  reference_doc_type: string | null;
  reference_doc_id: string | null;
  reference_doc_number: string | null;
  item_id: string | null;
  item_code: string;
  item_description: string | null;
  warehouse: string | null;
  from_warehouse: string | null;
  to_warehouse: string | null;
  quantity: number;
  unit: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  batch_no: string | null;
  serial_no: string | null;
  notes: string | null;
  posted_by: string | null;
  posted_at: string;
  created_at: string;
  updated_at: string;
}

// -------- Contacts --------
export interface Contact {
  id: string;
  company_id: string | null;
  business_partner_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// -------- Inventory Counting Sessions (view alias) --------
export interface InventoryCountingSession {
  id: string;
  status: string | null;
  warehouse: string | null;
  created_at: string;
  // The underlying inventory_countings table has more columns;
  // narrow further as you adopt them.
  [key: string]: unknown;
}

// -------- Employee Trainings (view alias) --------
export interface EmployeeTraining {
  id: string;
  employee_id: string | null;
  training_program_id: string | null;
  status: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

// -------- Sales Quotations (view alias on quotes) --------
export interface SalesQuotationLite {
  id: string;
  doc_num: number;        // from quotes.quote_number
  doc_date: string | null;
  total: number;
  status: string;
}

// -------- CPMS Subcontractor Orders (view alias) --------
export interface CpmsSubcontractorOrderLite {
  id: string;
  project_id: string | null;
  status: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  [key: string]: unknown;
}

// ====================================================
// Administration & Setup module
// ====================================================

export type SetupAuditAction =
  | 'create' | 'update' | 'delete'
  | 'publish' | 'rollback' | 'import' | 'export';

export interface SetupAuditLogEntry {
  id: string;
  company_id: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action: SetupAuditAction;
  changed_fields: string[] | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_at: string;
}

export type SetupImportStatus =
  | 'pending' | 'validating' | 'running'
  | 'completed' | 'failed' | 'rolled_back';

export interface SetupImportJob {
  id: string;
  company_id: string | null;
  job_name: string;
  target_entity: string;
  source_type: 'excel' | 'csv' | 'json' | 'sap' | 'api';
  source_file: string | null;
  status: SetupImportStatus;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  validation_errors: Array<{ row: number; field?: string; message: string }>;
  rollback_snapshot: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type SetupExportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SetupExportJob {
  id: string;
  company_id: string | null;
  job_name: string;
  target_entity: string;
  format: 'xlsx' | 'csv' | 'json' | 'pdf';
  filters: Record<string, unknown>;
  status: SetupExportStatus;
  row_count: number;
  download_url: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type SetupImplStatus =
  | 'pending' | 'in_progress' | 'blocked' | 'completed' | 'skipped';

export interface SetupImplementationTask {
  id: string;
  company_id: string | null;
  category: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  owner_id: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: SetupImplStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  blockers: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
