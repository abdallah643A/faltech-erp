import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'UOM Groups',
  description: 'Unit of Measure group management',
  businessPurpose: 'Define UOM groups with conversion factors for purchasing, sales, and inventory',
  financeEffect: 'none',
  financeEffectDescription: 'No finance effect. Controls quantity conversion',
  module: 'inventory',
  documentType: 'UOM Group',
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
