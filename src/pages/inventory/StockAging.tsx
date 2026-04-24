import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Stock Aging',
  description: 'Inventory aging analysis',
  businessPurpose: 'Age inventory by receipt date to identify slow-moving and obsolete stock',
  financeEffect: 'none',
  financeEffectDescription: 'No finance effect. Analytical reporting for provision decisions',
  module: 'inventory',
  documentType: 'Report',
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
