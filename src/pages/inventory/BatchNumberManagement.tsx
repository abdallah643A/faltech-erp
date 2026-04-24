import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'batchNo', header: 'Batch No.' }, { key: 'item', header: 'Item' },
  { key: 'warehouse', header: 'Warehouse' }, { key: 'qty', header: 'Qty' },
  { key: 'expiry', header: 'Expiry' }, { key: 'mfgDate', header: 'Mfg Date' }, { key: 'status', header: 'Status' },
];

export default function BatchNumberManagement() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Batch Number Management</h1>
        <ExportImportButtons data={data} columns={columns} filename="batch-numbers" title="Batch Number Management" buttonVariant="secondary" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Item</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Status</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Warehouse</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="h-8 bg-[#0066cc] text-sm">Search</Button></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Batch No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-left border-b border-[#d0d5dd]">Warehouse</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty</th><th className="p-2 text-left border-b border-[#d0d5dd]">Expiry</th><th className="p-2 text-left border-b border-[#d0d5dd]">Mfg Date</th><th className="p-2 text-center border-b border-[#d0d5dd]">Status</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No batch numbers found</td></tr></tbody></table>
      </div>
    </div>
  );
}
