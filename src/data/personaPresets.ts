/**
 * KPI Persona Presets — Module 1 / Enhancement #4
 *
 * Curated KPI/widget visibility sets per executive persona. Selecting a persona
 * one-click applies a preset to the user's dashboard_preferences.widgets array.
 *
 * Persona = role-flavored *view*, NOT a security boundary. Real RBAC still lives
 * in user_roles + RLS. A user can switch personas freely to see different lenses
 * of their own data.
 */

export type PersonaKey =
  | 'ceo'
  | 'cfo'
  | 'coo'
  | 'sales_manager'
  | 'procurement_manager'
  | 'project_manager'
  | 'hr_manager'
  | 'custom';

export interface PersonaPreset {
  key: PersonaKey;
  label: string;
  labelAr: string;
  description: string;
  /** Widget IDs to show, in display order. All others are hidden. */
  widgets: string[];
  /** Default landing workspace for this persona (optional). */
  defaultWorkspace?: string;
}

/**
 * Widget IDs follow the catalog in DashboardCustomizer.DEFAULT_PREFERENCES.
 * Add new widgets to that catalog first, then reference them here.
 */
export const PERSONA_PRESETS: Record<Exclude<PersonaKey, 'custom'>, PersonaPreset> = {
  ceo: {
    key: 'ceo',
    label: 'CEO / Executive',
    labelAr: 'الرئيس التنفيذي',
    description: 'Strategic snapshot: revenue, cash, approvals, project health',
    defaultWorkspace: 'executive',
    widgets: [
      'executive-brief',
      'kpi-revenue',
      'kpi-cash',
      'kpi-pending-approvals',
      'kpi-active-projects',
      'sales-chart',
      'pipeline-kanban',
      'global-activity',
    ],
  },
  cfo: {
    key: 'cfo',
    label: 'CFO / Finance Head',
    labelAr: 'المدير المالي',
    description: 'Cash, AR/AP aging, ZATCA compliance, JE exceptions',
    defaultWorkspace: 'finance',
    widgets: [
      'kpi-cash',
      'kpi-ar-overdue',
      'kpi-ap-due',
      'kpi-zatca-failed',
      'kpi-pending-approvals',
      'aging-chart',
      'je-exceptions',
      'global-activity',
    ],
  },
  coo: {
    key: 'coo',
    label: 'COO / Operations',
    labelAr: 'المدير التشغيلي',
    description: 'Project health, delivery, manufacturing, field execution',
    defaultWorkspace: 'construction',
    widgets: [
      'kpi-active-projects',
      'kpi-project-red-flags',
      'kpi-open-grns',
      'kpi-wo-progress',
      'project-status-chart',
      'global-activity',
    ],
  },
  sales_manager: {
    key: 'sales_manager',
    label: 'Sales Manager',
    labelAr: 'مدير المبيعات',
    description: 'Pipeline, opportunities, quotations, customer health',
    defaultWorkspace: 'sales',
    widgets: [
      'kpi-revenue',
      'kpi-open-quotations',
      'kpi-won-opportunities',
      'kpi-customer-health',
      'pipeline-kanban',
      'top-opportunities',
      'sales-chart',
      'lead-source-roi',
    ],
  },
  procurement_manager: {
    key: 'procurement_manager',
    label: 'Procurement Manager',
    labelAr: 'مدير المشتريات',
    description: 'Open POs, GRNs, vendor performance, AP due',
    defaultWorkspace: 'procurement',
    widgets: [
      'kpi-open-pos',
      'kpi-open-grns',
      'kpi-ap-due',
      'kpi-vendor-otd',
      'kpi-pending-approvals',
      'global-activity',
    ],
  },
  project_manager: {
    key: 'project_manager',
    label: 'Project Manager',
    labelAr: 'مدير المشروع',
    description: 'Project schedule, WBS progress, RFI, QA/QC, budget',
    defaultWorkspace: 'construction',
    widgets: [
      'kpi-active-projects',
      'kpi-wbs-progress',
      'kpi-open-rfi',
      'kpi-qa-qc-open',
      'kpi-project-budget',
      'project-status-chart',
      'global-activity',
    ],
  },
  hr_manager: {
    key: 'hr_manager',
    label: 'HR Manager',
    labelAr: 'مدير الموارد البشرية',
    description: 'Headcount, attendance, expiring docs, leave requests',
    defaultWorkspace: 'hr',
    widgets: [
      'kpi-headcount',
      'kpi-attendance',
      'kpi-expiring-docs',
      'kpi-leave-pending',
      'kpi-pending-approvals',
      'global-activity',
    ],
  },
};

export const PERSONA_LIST: PersonaPreset[] = Object.values(PERSONA_PRESETS);

export function getPersonaPreset(key: PersonaKey | null | undefined): PersonaPreset | null {
  if (!key || key === 'custom') return null;
  return PERSONA_PRESETS[key] ?? null;
}
