import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const columns: ColumnDef[] = [
  { key: 'vendor', header: 'Vendor' }, { key: 'current', header: 'Current' },
  { key: 'd30', header: '1-30' }, { key: 'd60', header: '31-60' },
  { key: 'd90', header: '61-90' }, { key: 'over90', header: '90+' }, { key: 'total', header: 'Total' },
];

export default function VendorLiabilitiesAging() {
  const data: any[] = [];
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Vendor Liabilities Aging</h1>
        <ExportImportButtons data={data} columns={columns} filename="vendor-liabilities-aging" title="Vendor Liabilities Aging" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label className="text-xs">As of Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Currency</Label><Input className="h-8 text-sm border-[#d0d5dd]" defaultValue="SAR" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] overflow-auto">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th>
          {['Current', '1-30', '31-60', '61-90', '90+', 'Total'].map(c => <th key={c} className="p-2 text-right border-b border-[#d0d5dd]">{c}</th>)}
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No data</td></tr></tbody></table>
      </div>
    </div>
  );
}
