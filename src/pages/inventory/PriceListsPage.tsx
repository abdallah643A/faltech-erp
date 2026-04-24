import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'no', header: 'No.' }, { key: 'name', header: 'Name' },
  { key: 'currency', header: 'Currency' }, { key: 'factor', header: 'Factor' },
  { key: 'validFrom', header: 'Valid From' }, { key: 'validTo', header: 'Valid To' },
  { key: 'basePriceList', header: 'Base Price List' },
];

export default function PriceListsPage() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Price Lists</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Price List</Button>
          <ExportImportButtons data={data} columns={columns} filename="price-lists" title="Price Lists" buttonVariant="secondary" />
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Currency</th><th className="p-2 text-right border-b border-[#d0d5dd]">Factor</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid From</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid To</th><th className="p-2 text-left border-b border-[#d0d5dd]">Base Price List</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No price lists</td></tr></tbody></table>
      </div>
    </div>
  );
}
