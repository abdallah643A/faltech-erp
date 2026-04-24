import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Snag / Punch List',
  description: 'Deficiency tracking and resolution',
  businessPurpose: 'Log snag items by area, assign responsibility, track rectification and closure',
  financeEffect: 'none',
  financeEffectDescription: 'No finance effect. Gates practical completion',
  module: 'construction',
  documentType: 'Snag Item',
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
