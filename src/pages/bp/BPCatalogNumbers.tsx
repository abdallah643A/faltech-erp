import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'bp_catalog_no', header: 'BP Catalog No.' },
  { key: 'item_code', header: 'Item Code' },
  { key: 'description', header: 'Description' },
  { key: 'substitute', header: 'Substitute' },
];


export default function BPCatalogNumbers() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Business Partner Catalog Numbers</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="bpcatalog-numbers" title="B P Catalog Numbers" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="space-y-1 mb-3"><Label className="text-xs">Select Business Partner</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 BP Code..." /></div>
        </div>
        <div className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="flex justify-between mb-3"><h3 className="text-sm font-semibold">Catalog Items</h3><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button></div>
          <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">BP Catalog No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Item Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-left border-b border-[#d0d5dd]">Substitute</th></tr></thead>
            <tbody><tr><td colSpan={4} className="p-4 text-center text-gray-400">Select a BP to view catalog numbers</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
