import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'qty_from', header: 'Qty From' },
  { key: 'qty_to', header: 'Qty To' },
  { key: 'discount', header: 'Discount %' },
  { key: 'price', header: 'Price' },
  { key: 'valid_from', header: 'Valid From' },
  { key: 'valid_to', header: 'Valid To' },
  { key: 'type', header: 'Type' },
];


export default function PeriodVolumeDiscounts() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Period and Volume Discounts</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="period-volume-discounts" title="Period Volume Discounts" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-xs">Item / Item Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All Items" /></div>
        <div className="space-y-1"><Label className="text-xs">BP / BP Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All BPs" /></div>
      </div>
      <Tabs defaultValue="volume">
        <TabsList className="border-b border-[#d0d5dd]">
          <TabsTrigger value="volume">Volume Discounts</TabsTrigger>
          <TabsTrigger value="period">Period Discounts</TabsTrigger>
          <TabsTrigger value="combined">Combined</TabsTrigger>
        </TabsList>
        <TabsContent value="volume" className="bg-white rounded border border-[#d0d5dd] p-4">
          <div className="flex justify-end mb-3"><Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Row</Button></div>
          <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-right border-b border-[#d0d5dd]">Qty From</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty To</th><th className="p-2 text-right border-b border-[#d0d5dd]">Discount %</th><th className="p-2 text-right border-b border-[#d0d5dd]">Price</th></tr></thead>
            <tbody><tr><td colSpan={4} className="p-4 text-center text-gray-400">No volume discounts</td></tr></tbody>
          </table>
        </TabsContent>
        <TabsContent value="period" className="bg-white rounded border border-[#d0d5dd] p-4">
          <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Valid From</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid To</th><th className="p-2 text-right border-b border-[#d0d5dd]">Discount %</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th></tr></thead>
            <tbody><tr><td colSpan={4} className="p-4 text-center text-gray-400">No period discounts</td></tr></tbody>
          </table>
        </TabsContent>
        <TabsContent value="combined" className="bg-white rounded border border-[#d0d5dd] p-4 text-center text-gray-400 py-8">Combined view coming soon</TabsContent>
      </Tabs>
    </div>
  );
}
