import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'bp_code', header: 'BP Code' },
  { key: 'bp_name', header: 'BP Name' },
  { key: 'date', header: 'Date' },
  { key: 'level', header: 'Level' },
  { key: 'amount', header: 'Amount' },
  { key: 'letter_sent', header: 'Letter Sent' },
  { key: 'status', header: 'Status' },
];


export default function DunningHistoryPage() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Dunning History</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="dunning-history-page" title="Dunning History Page" />
        <Button size="sm" variant="ghost" className="text-white gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label className="text-xs">BP</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Level</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">BP Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">BP Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-center border-b border-[#d0d5dd]">Level</th><th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th><th className="p-2 text-center border-b border-[#d0d5dd]">Letter Sent</th><th className="p-2 text-center border-b border-[#d0d5dd]">Status</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No dunning history</td></tr></tbody></table>
      </div>
    </div>
  );
}
