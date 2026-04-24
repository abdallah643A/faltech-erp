import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'template_code', header: 'Template Code' },
  { key: 'name', header: 'Name' },
  { key: 'doc_type', header: 'Doc Type' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'amount', header: 'Amount' },
  { key: 'frequency', header: 'Frequency' },
  { key: 'active', header: 'Active' },
];


export default function PurchaseRecurringTemplates() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Recurring Transaction Templates (Purchasing)</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="purchase-recurring-templates" title="Purchase Recurring Templates" />
        <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Template</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Template Code</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Name</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Doc Type</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th>
            <th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Frequency</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Active</th>
          </tr></thead>
          <tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No templates created</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
