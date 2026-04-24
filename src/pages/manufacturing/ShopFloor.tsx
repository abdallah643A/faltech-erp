import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Shop Floor Dispatch',
  description: 'Production order dispatch and execution',
  businessPurpose: 'Release and track production orders on the shop floor',
  financeEffect: 'none',
  financeEffectDescription: 'No journal at dispatch. Controls production execution flow',
  module: 'manufacturing',
  documentType: 'Dispatch',
  statusFlow: ['draft', 'pending_approval', 'approved', 'open', 'closed'] as any,
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
