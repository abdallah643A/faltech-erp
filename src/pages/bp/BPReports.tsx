import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'group', header: 'Group' },
  { key: 'city', header: 'City' },
  { key: 'phone', header: 'Phone' },
  { key: 'balance', header: 'Balance' },
  { key: 'contact', header: 'Contact' },
  { key: 'bp_name', header: 'BP Name' },
  { key: 'position', header: 'Position' },
];


export function BPListReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Business Partner List</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="bpreports" title="B P Reports" />
        <Button size="sm" variant="ghost" className="text-white gap-1"><Download className="h-3.5 w-3.5" /> Export</Button>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">BP Type</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Country</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="h-8 bg-[#0066cc] text-sm">Search</Button></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-center border-b border-[#d0d5dd]">Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Group</th><th className="p-2 text-left border-b border-[#d0d5dd]">City</th><th className="p-2 text-left border-b border-[#d0d5dd]">Phone</th><th className="p-2 text-right border-b border-[#d0d5dd]">Balance</th>
        </tr></thead><tbody><tr><td colSpan={7} className="p-8 text-center text-gray-400">No business partners found</td></tr></tbody></table>
      </div>
    </div>
  );
}

export function ContactListReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Contact List</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Contact</th><th className="p-2 text-left border-b border-[#d0d5dd]">BP Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Position</th><th className="p-2 text-left border-b border-[#d0d5dd]">Phone</th><th className="p-2 text-left border-b border-[#d0d5dd]">Email</th></tr></thead>
          <tbody><tr><td colSpan={5} className="p-8 text-center text-gray-400">No contacts found</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

export function ActivityReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Activity Report</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd] p-3 flex gap-6">
        <div className="text-center"><div className="text-xl font-bold">0</div><div className="text-xs text-gray-500">Total</div></div>
        <div className="text-center"><div className="text-xl font-bold text-[#0066cc]">0</div><div className="text-xs text-gray-500">Open</div></div>
        <div className="text-center"><div className="text-xl font-bold text-[#1a7a4a]">0</div><div className="text-xs text-gray-500">Closed</div></div>
        <div className="text-center"><div className="text-xl font-bold text-red-600">0</div><div className="text-xs text-gray-500">Overdue</div></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Subject</th><th className="p-2 text-left border-b border-[#d0d5dd]">BP</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-center border-b border-[#d0d5dd]">Status</th></tr></thead>
          <tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No activities found</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

export function InactiveCustomersReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Inactive Customers Report</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label className="text-xs">Inactive Since</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Sales Employee</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Code</th><th className="p-2 text-left border-b border-[#d0d5dd]">Name</th><th className="p-2 text-left border-b border-[#d0d5dd]">Last Transaction</th><th className="p-2 text-right border-b border-[#d0d5dd]">Days Inactive</th><th className="p-2 text-right border-b border-[#d0d5dd]">Balance</th></tr></thead>
          <tbody><tr><td colSpan={5} className="p-8 text-center text-gray-400">No inactive customers</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

export function LeadConversionReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg"><h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Lead Conversion Report</h1></div>
      <div className="bg-white rounded border border-[#d0d5dd] p-3 flex gap-6">
        <div className="text-center"><div className="text-xl font-bold">0</div><div className="text-xs text-gray-500">Total Leads</div></div>
        <div className="text-center"><div className="text-xl font-bold text-[#1a7a4a]">0</div><div className="text-xs text-gray-500">Converted</div></div>
        <div className="text-center"><div className="text-xl font-bold text-[#0066cc]">0%</div><div className="text-xs text-gray-500">Rate</div></div>
        <div className="text-center"><div className="text-xl font-bold text-amber-600">0</div><div className="text-xs text-gray-500">Avg Days</div></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Lead</th><th className="p-2 text-left border-b border-[#d0d5dd]">Source</th><th className="p-2 text-left border-b border-[#d0d5dd]">Created</th><th className="p-2 text-left border-b border-[#d0d5dd]">Converted</th><th className="p-2 text-right border-b border-[#d0d5dd]">Days</th><th className="p-2 text-right border-b border-[#d0d5dd]">Revenue</th></tr></thead>
          <tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">No data</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

export default function BPReportsPage() { return <BPListReport />; }
