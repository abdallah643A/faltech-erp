import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Phone, Mail, Calendar, FileText, MessageCircle } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'no', header: 'No.' },
  { key: 'type', header: 'Type' },
  { key: 'subject', header: 'Subject' },
  { key: 'bp', header: 'BP' },
  { key: 'date', header: 'Date' },
  { key: 'handled_by', header: 'Handled By' },
  { key: 'closed', header: 'Closed' },
];


const typeIcons: Record<string, any> = { Call: Phone, Email: Mail, Meeting: Calendar, Note: FileText, Fax: MessageCircle };

export default function ActivitiesPage() {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Activities</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="activities-page" title="Activities Page" />
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogTrigger asChild><Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Activity</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Activity Detail</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Type</Label>
                  <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="call">📞 Call</SelectItem><SelectItem value="email">📧 Email</SelectItem><SelectItem value="meeting">📅 Meeting</SelectItem><SelectItem value="note">📝 Note</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Subject</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">BP Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select" /></div>
                <div className="space-y-1"><Label className="text-xs">Contact Person</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
                <div className="space-y-1"><Label className="text-xs">Start Time</Label><Input type="time" className="h-8 text-sm border-[#d0d5dd]" /></div>
                <div className="space-y-1"><Label className="text-xs">End Time</Label><Input type="time" className="h-8 text-sm border-[#d0d5dd]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Handled By</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
                <div className="space-y-1"><Label className="text-xs">Priority</Label>
                  <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea className="border-[#d0d5dd]" /></div>
              <div className="flex items-center gap-2"><Checkbox id="closed" /><Label htmlFor="closed" className="text-sm">Closed</Label></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowDetail(false)}>Cancel</Button><Button className="bg-[#0066cc]">Save</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Type</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="meeting">Meeting</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">BP</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Status</Label><Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Subject</th><th className="p-2 text-left border-b border-[#d0d5dd]">BP</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Handled By</th><th className="p-2 text-center border-b border-[#d0d5dd]">Closed</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No activities found</td></tr></tbody></table>
      </div>
    </div>
  );
}
