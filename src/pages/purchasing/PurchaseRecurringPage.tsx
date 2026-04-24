import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Pause, Trash2, Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'transaction_no', header: 'Transaction No.' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'template', header: 'Template' },
  { key: 'amount', header: 'Amount' },
  { key: 'frequency', header: 'Frequency' },
  { key: 'next_run', header: 'Next Run' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Actions' },
];


export default function PurchaseRecurringPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Recurring Transactions (Purchasing)</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="purchase-recurring-page" title="Purchase Recurring Page" />
        <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Transaction No.</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Template</th>
            <th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Frequency</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Next Run</th>
            <th className="p-2 text-left border-b border-[#d0d5dd]">Status</th>
            <th className="p-2 text-center border-b border-[#d0d5dd]">Actions</th>
          </tr></thead>
          <tbody><tr><td colSpan={8} className="p-8 text-center text-gray-400">No recurring transactions configured</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
