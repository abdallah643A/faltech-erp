import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'item_no', header: 'Item No.' },
  { key: 'description', header: 'Description' },
  { key: 'qty', header: 'Qty' },
  { key: 'unit', header: 'Unit' },
];


export default function InventoryTransferRequestPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory Transfer Request</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="inventory-transfer-request-page" title="Inventory Transfer Request Page" />
          <span className="text-sm opacity-80">ITR-2025-00001</span>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-muted text-muted-foreground">Draft</Badge>
          <Button size="sm" variant="secondary" className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" className="bg-[#0066cc]">Copy To → Transfer</Button>
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Warehouse</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Warehouse</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Required Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Reference</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">#</th><th className="p-2 text-left border-b border-[#d0d5dd]">Item No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty</th><th className="p-2 text-left border-b border-[#d0d5dd]">Unit</th>
        </tr></thead><tbody><tr><td colSpan={5} className="p-4 text-center text-gray-400">Add items</td></tr></tbody></table>
      </div>
    </div>
  );
}
