import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Master Production Schedule',
  description: 'Top-level production planning',
  businessPurpose: 'Schedule finished goods production based on demand, capacity, and policy',
  financeEffect: 'none',
  financeEffectDescription: 'No finance effect. Drives MRP explosion',
  module: 'manufacturing',
  documentType: 'MPS Entry',
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
