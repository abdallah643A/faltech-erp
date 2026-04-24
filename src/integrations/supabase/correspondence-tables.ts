/**
 * Typed escape hatches for the Correspondence module tables until
 * the auto-generated Supabase types catch up.
 */
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as any;

export const corrTables = {
  correspondence: () => untyped.from('corr_correspondence'),
  types: () => untyped.from('corr_types'),
  categories: () => untyped.from('corr_categories'),
  attachments: () => untyped.from('corr_attachments'),
  assignments: () => untyped.from('corr_assignments'),
  comments: () => untyped.from('corr_comments'),
  related: () => untyped.from('corr_related_links'),
  dispatch: () => untyped.from('corr_dispatch'),
  audit: () => untyped.from('corr_audit_log'),
  ecmSync: () => untyped.from('corr_ecm_sync_log'),
  workflowDefs: () => untyped.from('corr_workflow_definitions'),
  workflowSteps: () => untyped.from('corr_workflow_steps'),
};

export type CorrDirection = 'incoming' | 'outgoing' | 'internal';
export type CorrStatus =
  | 'draft' | 'registered' | 'in_review' | 'assigned' | 'in_progress'
  | 'pending_approval' | 'approved' | 'returned' | 'rejected'
  | 'dispatched' | 'delivered' | 'closed' | 'archived' | 'cancelled';
export type CorrPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type CorrChannel = 'email' | 'courier' | 'hand_delivery' | 'portal' | 'system_integration' | 'fax' | 'print' | 'whatsapp' | 'other';
export type CorrConfidentiality = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
export type CorrSyncStatus = 'pending' | 'synced' | 'failed' | 'retry_required' | 'not_required';

export interface CorrespondenceRow {
  id: string;
  company_id: string | null;
  branch_id: string | null;
  reference_no: string | null;
  external_reference: string | null;
  direction: CorrDirection;
  type_id: string | null;
  category_id: string | null;
  status: CorrStatus;
  priority: CorrPriority;
  confidentiality: CorrConfidentiality;
  channel: CorrChannel | null;
  language: string;
  subject: string;
  summary: string | null;
  body_html: string | null;
  sender_name: string | null;
  sender_org: string | null;
  sender_email: string | null;
  recipient_name: string | null;
  recipient_org: string | null;
  recipient_email: string | null;
  correspondence_date: string | null;
  received_date: string | null;
  due_date: string | null;
  sla_hours: number | null;
  dispatch_date: string | null;
  closed_at: string | null;
  current_department: string | null;
  current_assignee: string | null;
  owner_user_id: string | null;
  related_project_id: string | null;
  related_incoming_id: string | null;
  workflow_definition_id: string | null;
  workflow_step_no: number | null;
  ecm_folder_path: string | null;
  ecm_sync_status: CorrSyncStatus;
  ecm_last_synced_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
