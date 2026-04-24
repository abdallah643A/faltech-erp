import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Copy, ChevronLeft, ChevronRight, Search, Upload } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'warehouse', header: 'Warehouse' },
  { key: 'in_stock', header: 'In Stock' },
  { key: 'committed', header: 'Committed' },
  { key: 'ordered', header: 'Ordered' },
  { key: 'available', header: 'Available' },
  { key: 'min_stock', header: 'Min Stock' },
  { key: 'max_stock', header: 'Max Stock' },
  { key: 'reorder', header: 'Reorder' },
];


export default function ItemMasterDataPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Item Master Data</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="item-master-data-page" title="Item Master Data Page" />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
          <Button size="sm" variant="secondary" className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" variant="secondary" className="gap-1"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
          <Button size="sm" variant="ghost" className="text-white"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-white"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Item No.</Label><div className="flex gap-1"><Input className="h-8 text-sm border-[#d0d5dd]" /><Button size="sm" variant="outline" className="h-8 px-2"><Search className="h-3.5 w-3.5" /></Button></div></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Description</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Foreign Description</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Item Type</Label>
              <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Items" /></SelectTrigger><SelectContent><SelectItem value="items">Items</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="travel">Travel</SelectItem><SelectItem value="fixed">Fixed Assets</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs text-gray-600">Item Group</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="g1">Raw Materials</SelectItem><SelectItem value="g2">Finished Goods</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs text-gray-600">Inventory UoM</Label><Input className="h-8 text-sm border-[#d0d5dd]" defaultValue="Each" /></div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-green-50 rounded text-center border border-green-200"><div className="text-sm font-bold text-green-700">0</div><div className="text-[10px] text-gray-500">In Stock</div></div>
            <div className="p-2 bg-amber-50 rounded text-center border border-amber-200"><div className="text-sm font-bold text-amber-700">0</div><div className="text-[10px] text-gray-500">Committed</div></div>
            <div className="p-2 bg-blue-50 rounded text-center border border-blue-200"><div className="text-sm font-bold text-blue-700">0</div><div className="text-[10px] text-gray-500">Ordered</div></div>
            <div className="p-2 bg-green-50 rounded text-center border border-green-200"><div className="text-sm font-bold text-green-700">0</div><div className="text-[10px] text-gray-500">Available</div></div>
          </div>
          <div className="border-2 border-dashed border-[#d0d5dd] rounded-lg p-6 text-center">
            <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-400">Item image</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-[#d0d5dd] flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Bar Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Country of Origin</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">HS Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Manufacturer</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Shelf Life (days)</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Manage By</Label>
              <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="serial">Serial Numbers</SelectItem><SelectItem value="batch">Batches</SelectItem></SelectContent></Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="purchasing" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Default Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select" /></div>
            <div className="space-y-1"><Label className="text-xs">Purchase Price</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Lead Time (days)</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Min Order Qty</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Last Purchase Price</Label><Input className="h-8 text-sm border-[#d0d5dd] bg-[#f5f5f5]" readOnly /></div>
            <div className="space-y-1"><Label className="text-xs">Last Purchase Date</Label><Input className="h-8 text-sm border-[#d0d5dd] bg-[#f5f5f5]" readOnly /></div>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Default Price List</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="pl1">Default</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Default Discount %</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Sales Tax Group</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="vat15">VAT 15%</SelectItem></SelectContent></Select></div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="bg-white rounded border border-[#d0d5dd] p-4">
          <table className="w-full text-sm mb-3"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Warehouse</th><th className="p-2 text-right border-b border-[#d0d5dd]">In Stock</th><th className="p-2 text-right border-b border-[#d0d5dd]">Committed</th><th className="p-2 text-right border-b border-[#d0d5dd]">Ordered</th><th className="p-2 text-right border-b border-[#d0d5dd]">Available</th><th className="p-2 text-right border-b border-[#d0d5dd]">Min Stock</th><th className="p-2 text-right border-b border-[#d0d5dd]">Max Stock</th><th className="p-2 text-right border-b border-[#d0d5dd]">Reorder</th></tr></thead>
            <tbody><tr><td colSpan={8} className="p-4 text-center text-gray-400">No warehouse data</td></tr></tbody>
          </table>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Valuation Method</Label><Input className="h-8 text-sm border-[#d0d5dd] bg-[#f5f5f5]" readOnly defaultValue="Moving Average" /></div>
            <div className="space-y-1"><Label className="text-xs">Moving Avg Price</Label><Input className="h-8 text-sm border-[#d0d5dd] bg-[#f5f5f5]" readOnly /></div>
          </div>
        </TabsContent>

        <TabsContent value="planning" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Planning Method</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="mrp">MRP</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Procurement Method</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Buy" /></SelectTrigger><SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="make">Make</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Order Policy</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="MRP" /></SelectTrigger><SelectContent><SelectItem value="mrp">MRP</SelectItem><SelectItem value="fixed">Fixed Order Qty</SelectItem><SelectItem value="minmax">Min-Max</SelectItem></SelectContent></Select></div>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-4 gap-3">{Array.from({ length: 16 }, (_, i) => (<div key={i} className="flex items-center gap-2"><Checkbox id={`ip${i}`} /><Label htmlFor={`ip${i}`} className="text-sm">Property {String(i + 1).padStart(2, '0')}</Label></div>))}</div>
        </TabsContent>

        <TabsContent value="remarks" className="bg-white rounded border border-[#d0d5dd] p-4"><Textarea className="min-h-[200px] border-[#d0d5dd]" placeholder="Remarks..." /></TabsContent>

        <TabsContent value="attachments" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="border-2 border-dashed border-[#d0d5dd] rounded-lg p-8 text-center"><Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" /><p className="text-sm text-gray-500">Drag and drop files here</p></div>
        </TabsContent>

        <TabsContent value="production" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">Issue Method</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Manual" /></SelectTrigger><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="backflush">Backflush</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Default WH for Production</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="flex items-end gap-2"><Checkbox id="phantom" /><Label htmlFor="phantom" className="text-sm">Phantom Item</Label></div>
          </div>
          <Button variant="outline" className="mt-3 gap-1">Open Bill of Materials →</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
