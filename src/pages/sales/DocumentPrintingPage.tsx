import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc_no', header: 'Doc No.' },
  { key: 'customer', header: 'Customer' },
  { key: 'date', header: 'Date' },
  { key: 'amount', header: 'Amount' },
  { key: 'printed', header: 'Printed' },
];


const mockDocs = [
  { id: '1', docNo: 'INV-2025-00142', customer: 'Al Rajhi Corp', date: '2025-04-01', amount: 125000, printed: false },
  { id: '2', docNo: 'INV-2025-00143', customer: 'SABIC', date: '2025-04-02', amount: 89500, printed: true },
  { id: '3', docNo: 'INV-2025-00144', customer: 'Aramco', date: '2025-04-03', amount: 234000, printed: false },
];

export default function DocumentPrintingPage() {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [docType, setDocType] = useState('A/R Invoice');
  const [printFilter, setPrintFilter] = useState('All');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Document Printing</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="document-printing-page" title="Document Printing Page" />
        <Button size="sm" variant="secondary" className="gap-1" disabled={selectedDocs.length === 0} onClick={() => setPreviewOpen(true)}>
          <Printer className="h-3.5 w-3.5" /> Print Selected ({selectedDocs.length})
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-5 gap-4">
        <div className="space-y-1"><Label className="text-xs">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A/R Invoice">A/R Invoice</SelectItem>
              <SelectItem value="Sales Order">Sales Order</SelectItem>
              <SelectItem value="Delivery">Delivery</SelectItem>
              <SelectItem value="Credit Memo">Credit Memo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">From No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Printed Status</Label>
          <div className="flex gap-2 mt-1">{['All', 'Printed', 'Not Printed'].map(v => (
            <Button key={v} size="sm" variant={printFilter === v ? 'default' : 'outline'} onClick={() => setPrintFilter(v)} className={printFilter === v ? 'bg-[#0066cc] h-7 text-xs' : 'h-7 text-xs'}>{v}</Button>
          ))}</div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="w-8 px-2 py-2"><Checkbox checked={selectedDocs.length === mockDocs.length} onCheckedChange={c => setSelectedDocs(c ? mockDocs.map(d => d.id) : [])} /></th>
            <th className="text-left px-3 py-2">Doc No.</th>
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-center px-3 py-2">Printed</th>
          </tr></thead>
          <tbody>
            {mockDocs.map(doc => (
              <tr key={doc.id} className="border-b border-[#d0d5dd] hover:bg-blue-50/30">
                <td className="px-2 py-2"><Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={c => setSelectedDocs(c ? [...selectedDocs, doc.id] : selectedDocs.filter(x => x !== doc.id))} /></td>
                <td className="px-3 py-2.5 font-mono">{doc.docNo}</td>
                <td className="px-3 py-2.5">{doc.customer}</td>
                <td className="px-3 py-2.5">{doc.date}</td>
                <td className="px-3 py-2.5 text-right font-mono">{doc.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-center">{doc.printed ? <Badge className="bg-green-100 text-green-700">✓</Badge> : <Badge variant="outline">—</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Print Preview</DialogTitle></DialogHeader>
          <div className="h-96 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
            PDF Preview Area
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button className="bg-[#0066cc]">Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
