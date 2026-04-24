import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'item_no', header: 'Item No.' },
  { key: 'description', header: 'Description' },
  { key: 'bp_price', header: 'BP Price' },
  { key: 'discount', header: 'Discount %' },
  { key: 'valid_from', header: 'Valid From' },
  { key: 'valid_to', header: 'Valid To' },
];


export default function SpecialPricesPage() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Special Prices for Business Partners</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="special-prices-page" title="Special Prices Page" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-xs">Business Partner</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select BP" /></div>
        <div className="space-y-1"><Label className="text-xs">Base Price List</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="Default" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <div className="flex items-center justify-between p-3 border-b border-[#d0d5dd]">
          <span className="text-sm font-medium">Special Prices</span>
          <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Item</Button>
        </div>
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-right border-b border-[#d0d5dd]">BP Price</th><th className="p-2 text-right border-b border-[#d0d5dd]">Discount %</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid From</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid To</th>
        </tr></thead><tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">Select a BP to view special prices</td></tr></tbody></table>
      </div>
    </div>
  );
}
