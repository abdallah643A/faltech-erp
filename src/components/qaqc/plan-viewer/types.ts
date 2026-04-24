export interface QAPlan {
  id: string;
  qa_project_id: string;
  plan_title: string;
  drawing_number: string | null;
  plan_type: string;
  building: string | null;
  floor: string | null;
  zone: string | null;
  area: string | null;
  discipline: string | null;
  scale: string | null;
  author: string | null;
  issue_date: string | null;
  notes: string | null;
  active_revision_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface QAPlanRevision {
  id: string;
  plan_id: string;
  revision_code: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  width_px: number | null;
  height_px: number | null;
  revision_notes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface QATicket {
  id: string;
  ticket_number: string;
  qa_project_id: string;
  plan_id: string | null;
  plan_revision_id: string | null;
  template_id: string | null;
  title: string;
  description: string | null;
  ticket_type: string;
  status: string;
  priority: string;
  severity: string;
  pin_x: number | null;
  pin_y: number | null;
  building: string | null;
  floor: string | null;
  zone: string | null;
  area: string | null;
  room: string | null;
  trade: string | null;
  progress: number;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  subcontractor_id: string | null;
  subcontractor_name: string | null;
  root_cause: string | null;
  resolution_notes: string | null;
  closed_at: string | null;
  approved_at: string | null;
  company_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface QAProject {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  company_id: string | null;
  status: string;
  created_at: string;
}

export interface QATicketComment {
  id: string;
  ticket_id: string;
  comment_text: string;
  is_internal: boolean;
  is_system: boolean;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface QATicketMedia {
  id: string;
  ticket_id: string;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  media_type: string;
  caption: string | null;
  is_before: boolean;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface QATemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  discipline: string | null;
  is_active: boolean;
}

export interface QATemplateSection {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  fields: QATemplateField[];
}

export interface QATemplateField {
  id: string;
  section_id: string;
  field_label: string;
  field_type: string;
  options: any;
  is_required: boolean;
  default_value: string | null;
  placeholder: string | null;
  sort_order: number;
}

export const TICKET_TYPES = ['defect', 'snag', 'observation', 'ncr', 'inspection', 'safety', 'quality_check', 'material', 'handover', 'rework'] as const;
export const TICKET_STATUSES = ['draft', 'open', 'assigned', 'in_progress', 'pending_review', 'resolved', 'approved', 'rejected', 'closed'] as const;
export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export const SEVERITIES = ['critical', 'major', 'minor', 'cosmetic'] as const;
export const TRADES = ['structural', 'finishing', 'mep', 'hvac', 'electrical', 'plumbing', 'fire_protection', 'waterproofing', 'landscape', 'civil'] as const;

export const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  open: '#ef4444',
  assigned: '#3b82f6',
  in_progress: '#f59e0b',
  pending_review: '#8b5cf6',
  resolved: '#10b981',
  approved: '#059669',
  rejected: '#dc2626',
  closed: '#6b7280',
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};
