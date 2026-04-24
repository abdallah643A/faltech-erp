import { ERPModulePage } from '@/components/erp/ERPModulePage';
import type { ERPModulePageConfig } from '@/components/erp/ERPModulePage';

const config: ERPModulePageConfig = {
  title: 'Production Calendars',
  description: 'Factory and shift calendars',
  businessPurpose: 'Define working days, shifts, holidays, and maintenance windows',
  financeEffect: 'none',
  financeEffectDescription: 'No finance effect. Controls capacity calculations',
  module: 'manufacturing',
  documentType: 'Calendar',
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
