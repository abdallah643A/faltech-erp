import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'item_no', header: 'Item No.' },
  { key: 'description', header: 'Description' },
  { key: 'in_stock', header: 'In Stock' },
  { key: 'committed', header: 'Committed' },
  { key: 'ordered', header: 'Ordered' },
  { key: 'available', header: 'Available' },
  { key: 'min_stock', header: 'Min Stock' },
  { key: 'reorder', header: 'Reorder' },
  { key: 'item', header: 'Item' },
  { key: 'last_purchase_price', header: 'Last Purchase Price' },
];


export function InventoryStatusReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory Status Report</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="inventory-reports" title="Inventory Reports" />
        <Button size="sm" variant="ghost" className="text-white gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">As of Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Warehouse</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Item Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="h-8 bg-[#0066cc] text-sm">Search</Button></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-right border-b border-[#d0d5dd]">In Stock</th><th className="p-2 text-right border-b border-[#d0d5dd]">Committed</th><th className="p-2 text-right border-b border-[#d0d5dd]">Ordered</th><th className="p-2 text-right border-b border-[#d0d5dd]">Available</th><th className="p-2 text-right border-b border-[#d0d5dd]">Min Stock</th><th className="p-2 text-center border-b border-[#d0d5dd]">Reorder</th>
        </tr></thead><tbody><tr><td colSpan={8} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}

export function InventoryInWarehouseReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory In Warehouse Report</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 text-center text-gray-400 py-12">Pivot table: Items × Warehouses — select filters to view</div>
    </div>
  );
}

export function LastPricesReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Last Prices Report</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-right border-b border-[#d0d5dd]">Last Purchase Price</th><th className="p-2 text-left border-b border-[#d0d5dd]">Last Purchase Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-right border-b border-[#d0d5dd]">Last Sales Price</th><th className="p-2 text-left border-b border-[#d0d5dd]">Last Sales Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Customer</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}

export function InventoryValuationReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory Valuation Report</h1>
        <Button size="sm" variant="ghost" className="text-white gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty</th><th className="p-2 text-right border-b border-[#d0d5dd]">Unit Cost</th><th className="p-2 text-right border-b border-[#d0d5dd]">Total Value</th><th className="p-2 text-center border-b border-[#d0d5dd]">Method</th>
        </tr></thead><tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}

export function InventoryTurnoverAnalysis() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inventory Turnover Analysis</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-right border-b border-[#d0d5dd]">Opening</th><th className="p-2 text-right border-b border-[#d0d5dd]">Received</th><th className="p-2 text-right border-b border-[#d0d5dd]">Issued</th><th className="p-2 text-right border-b border-[#d0d5dd]">Closing</th><th className="p-2 text-right border-b border-[#d0d5dd]">Turnover Ratio</th><th className="p-2 text-right border-b border-[#d0d5dd]">Days in Stock</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}

export function ItemListReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Item List</h1>
        <Button size="sm" variant="ghost" className="text-white gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4"><Input className="h-8 text-sm border-[#d0d5dd] max-w-md" placeholder="🔍 Search items..." /></div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Item No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Description</th><th className="p-2 text-left border-b border-[#d0d5dd]">Group</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th><th className="p-2 text-right border-b border-[#d0d5dd]">In Stock</th><th className="p-2 text-right border-b border-[#d0d5dd]">Price</th><th className="p-2 text-center border-b border-[#d0d5dd]">Active</th><th className="p-2 text-center border-b border-[#d0d5dd]">Manage By</th>
        </tr></thead><tbody><tr><td colSpan={8} className="p-8 text-center text-gray-400">No items found</td></tr></tbody></table>
      </div>
    </div>
  );
}

export default function InventoryReportsPage() { return <InventoryStatusReport />; }
