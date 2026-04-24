/**
 * Typed wrappers around the Supabase client for tables that exist in
 * the database but are not yet present in the auto-generated
 * `src/integrations/supabase/types.ts` (it refreshes asynchronously
 * after migrations).
 *
 * The single `as any` cast is intentionally isolated here so call
 * sites can stay strongly typed against `src/types/data-contracts.ts`.
 */
import { supabase } from '@/integrations/supabase/client';

// One narrow escape hatch — kept here, not scattered across the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as any;

export const newTables = {
  documentNumbering: () => untyped.from('document_numbering'),
  postingPeriods: () => untyped.from('posting_periods'),
  workflowTasks: () => untyped.from('workflow_tasks'),
  inventoryTransactions: () => untyped.from('inventory_transactions'),
  contacts: () => untyped.from('contacts'),
  inventoryCountingSessions: () => untyped.from('inventory_counting_sessions'),
  employeeTrainings: () => untyped.from('employee_trainings'),
  salesQuotations: () => untyped.from('sales_quotations'),
  cpmsSubcontractorOrders: () => untyped.from('cpms_subcontractor_orders'),
  // Administration & Setup module
  setupAuditLog: () => untyped.from('setup_audit_log'),
  setupImportJobs: () => untyped.from('setup_import_jobs'),
  setupExportJobs: () => untyped.from('setup_export_jobs'),
  setupImplementationTasks: () => untyped.from('setup_implementation_tasks'),
};
