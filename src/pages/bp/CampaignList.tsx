import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'no', header: 'No.' },
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'start', header: 'Start' },
  { key: 'end', header: 'End' },
  { key: 'targets', header: 'Targets' },
  { key: 'response', header: 'Response %' },
];


export default function CampaignList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Campaign List</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="campaign-list" title="Campaign List" />
        <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Campaign</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th><th className="p-2 text-center border-b border-[#d0d5dd]">Status</th><th className="p-2 text-left border-b border-[#d0d5dd]">Start</th><th className="p-2 text-left border-b border-[#d0d5dd]">End</th><th className="p-2 text-right border-b border-[#d0d5dd]">Targets</th><th className="p-2 text-right border-b border-[#d0d5dd]">Response %</th>
        </tr></thead><tbody><tr><td colSpan={8} className="p-8 text-center text-gray-400">No campaigns created</td></tr></tbody></table>
      </div>
    </div>
  );
}
