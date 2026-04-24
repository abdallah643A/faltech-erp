import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'vendorCode', header: 'Vendor Code' }, { key: 'vendorName', header: 'Vendor Name' },
  { key: 'opening', header: 'Opening' }, { key: 'purchases', header: 'Purchases' },
  { key: 'payments', header: 'Payments' }, { key: 'closing', header: 'Closing' },
];

export default function VendorBalancesReport() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Vendor Balances Report</h1>
        <ExportImportButtons data={data} columns={columns} filename="vendor-balances" title="Vendor Balances Report" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Vendor Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor Name</th><th className="p-2 text-right border-b border-[#d0d5dd]">Opening</th><th className="p-2 text-right border-b border-[#d0d5dd]">Purchases</th><th className="p-2 text-right border-b border-[#d0d5dd]">Payments</th><th className="p-2 text-right border-b border-[#d0d5dd]">Closing</th>
        </tr></thead><tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}
