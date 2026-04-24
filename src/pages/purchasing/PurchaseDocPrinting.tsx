import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc_no', header: 'Doc No.' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'date', header: 'Date' },
  { key: 'amount', header: 'Amount' },
  { key: 'printed', header: 'Printed' },
];


export default function PurchaseDocPrinting() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Document Printing (Purchasing)</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="purchase-doc-printing" title="Purchase Doc Printing" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Document Type</Label>
          <Select defaultValue="po"><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="po">Purchase Order</SelectItem><SelectItem value="grpo">Goods Receipt PO</SelectItem><SelectItem value="apinv">A/P Invoice</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <div className="flex items-center justify-between p-3 border-b border-[#d0d5dd]">
          <span className="text-sm font-medium">Results</span>
          <Button size="sm" className="gap-1 bg-[#0066cc]"><Printer className="h-3.5 w-3.5" /> Print Selected</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr><th className="p-2 w-8"><Checkbox /></th><th className="p-2 text-left">Doc No.</th><th className="p-2 text-left">Vendor</th><th className="p-2 text-left">Date</th><th className="p-2 text-right">Amount</th><th className="p-2 text-center">Printed</th></tr></thead>
          <tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No documents found</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
