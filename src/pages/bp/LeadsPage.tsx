import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UserPlus, Plus, Save } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'lead_code', header: 'Lead Code' },
  { key: 'name', header: 'Name' },
  { key: 'source', header: 'Source' },
  { key: 'status', header: 'Status' },
  { key: 'revenue', header: 'Revenue' },
  { key: 'closing', header: 'Closing %' },
  { key: 'sales_employee', header: 'Sales Employee' },
];


export default function LeadsPage() {
  const [closingPct, setClosingPct] = useState(30);
  const [expectedDate, setExpectedDate] = useState<Date>(addDays(new Date(), 60));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Leads</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="leads-page" title="Leads Page" />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Lead</Button>
          <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"><UserPlus className="h-3.5 w-3.5" /> Convert to Customer</Button>
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Lead Source</Label>
          <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="web">Web</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="cold">Cold Call</SelectItem><SelectItem value="exhibition">Exhibition</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Lead Status</Label>
          <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="progress">In Progress</SelectItem><SelectItem value="qualified">Qualified</SelectItem><SelectItem value="unqualified">Unqualified</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Potential Revenue (SAR)</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Closing % ({closingPct}%)</Label><Slider value={[closingPct]} onValueChange={v => setClosingPct(v[0])} max={100} step={5} className="mt-2" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label className="text-xs">Expected Closing Date</Label>
          <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(expectedDate, 'yyyy-MM-dd')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={expectedDate} onSelect={d => d && setExpectedDate(d)} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
        </div>
        <div className="space-y-1"><Label className="text-xs">Campaign</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select" /></div>
        <div className="space-y-1"><Label className="text-xs">Sales Employee</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Lead Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Source</th><th className="p-2 text-left border-b border-[#d0d5dd]">Status</th><th className="p-2 text-right border-b border-[#d0d5dd]">Revenue</th><th className="p-2 text-right border-b border-[#d0d5dd]">Closing %</th><th className="p-2 text-left border-b border-[#d0d5dd]">Sales Employee</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No leads found</td></tr></tbody></table>
      </div>
    </div>
  );
}
