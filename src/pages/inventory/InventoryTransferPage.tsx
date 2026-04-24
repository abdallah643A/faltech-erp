import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'item_no', header: 'Item No.' },
  { key: 'description', header: 'Description' },
  { key: 'available_from', header: 'Available (From)' },
  { key: 'qty_to_transfer', header: 'Qty to Transfer' },
  { key: 'bin_from', header: 'Bin (From)' },
  { key: 'bin_to', header: 'Bin (To)' },
];


export default function InventoryTransferPage() {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory Transfer</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="inventory-transfer-page" title="Inventory Transfer Page" />
          <span className="text-sm opacity-80">IT-2025-00001</span>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-100 text-blue-800">Open</Badge>
          <Button size="sm" variant="secondary" className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Warehouse</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="wh1">Main Warehouse</SelectItem><SelectItem value="wh2">Branch WH</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">To Warehouse</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="wh1">Main Warehouse</SelectItem><SelectItem value="wh2">Branch WH</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Transfer Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Reference No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">#</th><th className="p-2 text-left border-b border-[#d0d5dd]">Item No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-right border-b border-[#d0d5dd]">Available (From)</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty to Transfer</th><th className="p-2 text-left border-b border-[#d0d5dd]">Bin (From)</th><th className="p-2 text-left border-b border-[#d0d5dd]">Bin (To)</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-4 text-center text-gray-400">Add items to transfer</td></tr></tbody></table>
      </div>
    </div>
  );
}
