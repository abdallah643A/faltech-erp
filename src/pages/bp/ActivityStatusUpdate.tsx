import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'no', header: 'No.' },
  { key: 'type', header: 'Type' },
  { key: 'subject', header: 'Subject' },
  { key: 'bp', header: 'BP' },
  { key: 'date', header: 'Date' },
  { key: 'status', header: 'Status' },
];


export default function ActivityStatusUpdate() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Activity Status Update</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="activity-status-update" title="Activity Status Update" />
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Handled By</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Type</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="meeting">Meeting</SelectItem></SelectContent></Select></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-3 flex gap-3">
        <Button size="sm" className="bg-[#1a7a4a] gap-1">Mark as Closed</Button>
        <Button size="sm" variant="outline" className="gap-1">Reassign To</Button>
        <Button size="sm" variant="outline" className="gap-1">Change Priority</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 w-8"><Checkbox /></th><th className="p-2 text-left border-b border-[#d0d5dd]">No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Subject</th><th className="p-2 text-left border-b border-[#d0d5dd]">BP</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Status</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No activities found</td></tr></tbody></table>
      </div>
    </div>
  );
}
