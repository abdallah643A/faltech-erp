import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'rfqNo', header: 'RFQ No.' }, { key: 'vendor', header: 'Vendor' },
  { key: 'date', header: 'Date' }, { key: 'validUntil', header: 'Valid Until' },
  { key: 'amount', header: 'Amount' }, { key: 'status', header: 'Status' },
];

export default function PurchaseQuotationReport() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Purchase Quotation Report</h1>
        <ExportImportButtons data={data} columns={columns} filename="purchase-quotation-report" title="Purchase Quotation Report" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 flex gap-4">
        <div className="flex items-center gap-4 p-3 bg-[#f0f2f4] rounded flex-1">
          <div className="text-center"><div className="text-2xl font-bold text-[#0066cc]">0</div><div className="text-xs text-gray-500">Total RFQs</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-[#1a7a4a]">0</div><div className="text-xs text-gray-500">Converted to PO</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-amber-600">0%</div><div className="text-xs text-gray-500">Conversion Rate</div></div>
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Status</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">RFQ No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Valid Until</th><th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th><th className="p-2 text-center border-b border-[#d0d5dd]">Status</th></tr></thead>
          <tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No quotations found</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
