import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'docNo', header: 'Doc No.' }, { key: 'vendor', header: 'Vendor' },
  { key: 'date', header: 'Date' }, { key: 'dueDate', header: 'Due Date' },
  { key: 'amount', header: 'Amount' }, { key: 'paid', header: 'Paid' },
  { key: 'balance', header: 'Balance' }, { key: 'daysOverdue', header: 'Days Overdue' },
];

export default function PurchaseOpenItemsList() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Open Items List (Purchasing)</h1>
        <ExportImportButtons data={data} columns={columns} filename="purchase-open-items" title="Open Items List (Purchasing)" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Document Type</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Aging</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="h-8 bg-[#0066cc] text-sm">Search</Button></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Doc No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Due Date</th><th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th><th className="p-2 text-right border-b border-[#d0d5dd]">Paid</th><th className="p-2 text-right border-b border-[#d0d5dd]">Balance</th><th className="p-2 text-right border-b border-[#d0d5dd]">Days Overdue</th>
        </tr></thead><tbody><tr><td colSpan={8} className="p-8 text-center text-gray-400">No open items</td></tr></tbody></table>
      </div>
    </div>
  );
}
