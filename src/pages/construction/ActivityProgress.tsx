import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Activity Progress Entry',
  description: 'Record physical progress against WBS activities',
  businessPurpose: 'Enter percent complete or quantities against scheduled activities',
  financeEffect: 'none',
  financeEffectDescription: 'No journal. Updates earned value and productivity metrics',
  module: 'construction',
  documentType: 'Progress Entry',
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
