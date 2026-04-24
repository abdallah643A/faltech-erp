import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'poNo', header: 'PO No.' }, { key: 'vendor', header: 'Vendor' },
  { key: 'item', header: 'Item' }, { key: 'ordered', header: 'Ordered' },
  { key: 'received', header: 'Received' }, { key: 'backorder', header: 'Backorder' },
  { key: 'requiredDate', header: 'Required Date' },
];

export default function PurchaseBackorderReport() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Backorder Report (Purchasing)</h1>
        <ExportImportButtons data={data} columns={columns} filename="purchase-backorders" title="Backorder Report (Purchasing)" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Item</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">PO No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-right border-b border-[#d0d5dd]">Ordered</th><th className="p-2 text-right border-b border-[#d0d5dd]">Received</th><th className="p-2 text-right border-b border-[#d0d5dd]">Backorder</th><th className="p-2 text-left border-b border-[#d0d5dd]">Required Date</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No backorders</td></tr></tbody></table>
      </div>
    </div>
  );
}
