import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Printer, Mail } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'date', header: 'Date' },
  { key: 'doc_type', header: 'Doc Type' },
  { key: 'doc_no', header: 'Doc No.' },
  { key: 'debit', header: 'Debit' },
  { key: 'credit', header: 'Credit' },
  { key: 'balance', header: 'Balance' },
];


export default function CustomerStatementReport() {
  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Customer Statement Report</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="customer-statement-report" title="Customer Statement Report" />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-white gap-1"><Printer className="h-3.5 w-3.5" /> Print</Button>
          <Button size="sm" variant="ghost" className="text-white gap-1"><Mail className="h-3.5 w-3.5" /> Email</Button>
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">BP Code</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select" /></div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="flex items-end gap-2"><Checkbox id="overdue" /><Label htmlFor="overdue" className="text-sm">Overdue Only</Label></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr>
          <th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-left border-b border-[#d0d5dd]">Doc Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Doc No.</th><th className="p-2 text-right border-b border-[#d0d5dd]">Debit</th><th className="p-2 text-right border-b border-[#d0d5dd]">Credit</th><th className="p-2 text-right border-b border-[#d0d5dd]">Balance</th>
        </tr></thead><tbody><tr><td colSpan={6} className="p-8 text-center text-gray-400">Select a customer to view statement</td></tr></tbody></table>
      </div>
    </div>
  );
}
