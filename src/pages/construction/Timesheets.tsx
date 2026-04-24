import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Timesheets',
  description: 'Worker time recording for payroll and project costing',
  businessPurpose: 'Log hours by project, activity, cost code, and shift type including overtime',
  financeEffect: 'project_cost',
  financeEffectDescription: 'Approved timesheets feed payroll allocation and project labor cost',
  financeRegistryKey: 'timesheets',
  module: 'construction',
  documentType: 'Timesheet',
  statusFlow: ['draft', 'pending_approval', 'approved', 'open', 'closed'] as any,
  approvalRequired: false,
  approvalConditions: undefined,
  validationRules: undefined,
  downstreamDocs: undefined,
  upstreamDocs: undefined,
  reversalRules: undefined,
  kpis: undefined,
  dimensionRequirements: undefined,
  columns: [
      { key: 'doc_num', label: 'Doc #', sortable: true },
      { key: 'date', label: 'Date', type: 'date', sortable: true },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  formFields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  sampleData: [],
};

export default function Page() {
  return <ERPModulePage config={config} />;
}
