import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, GitCompare } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'item', header: 'Item' },
  { key: 'vendor_a', header: 'Vendor A' },
  { key: 'vendor_b', header: 'Vendor B' },
  { key: 'vendor_c', header: 'Vendor C' },
];


export default function PurchaseQuotationPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: addDays(new Date(), 14), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 14));
  const [buyer, setBuyer] = useState('');
  const [showCompare, setShowCompare] = useState(false);

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Valid Until</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(validUntil, 'yyyy-MM-dd')}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={validUntil} onSelect={d => d && setValidUntil(d)} className="p-3 pointer-events-auto" /></PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Purchasing Employee</Label>
        <Input value={buyer} onChange={e => setBuyer(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Actions</Label>
        <Dialog open={showCompare} onOpenChange={setShowCompare}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] gap-1"><GitCompare className="h-3.5 w-3.5" />Compare Quotations</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Compare Vendor Quotations</DialogTitle></DialogHeader>
            <div className="border rounded overflow-auto">
              <div className="flex justify-end mb-2"><ExportImportButtons data={[]} columns={exportColumns} filename="purchase-quotation-page" title="Purchase Quotation Page" /></div>
        <table className="w-full text-sm">
                <thead className="bg-[#f0f2f4]">
                  <tr><th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-right border-b border-[#d0d5dd]">Vendor A</th><th className="p-2 text-right border-b border-[#d0d5dd]">Vendor B</th><th className="p-2 text-right border-b border-[#d0d5dd]">Vendor C</th></tr>
                </thead>
                <tbody>
                  <tr><td className="p-2 border-b border-[#d0d5dd]" colSpan={4}>No quotations to compare</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCompare(false)}>Close</Button>
              <Button className="bg-[#0066cc]">Select Best & Convert to PO</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="Purchase Quotation (RFQ)"
      docNumber="RFQ-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      partnerType="vendor"
      hideJournalTab
      copyToOptions={['Purchase Order']}
      onSave={() => toast({ title: 'Purchase Quotation saved' })}
      onCancel={() => {}}
      onPrint={() => {}}
      onEmail={() => {}}
      onAdd={() => {
        setHeaderData({ postingDate: new Date(), documentDate: new Date(), dueDate: addDays(new Date(), 14), currency: 'SAR', series: 'Primary' });
        setLines([]);
      }}
      onFind={(q) => toast({ title: `Finding RFQ: ${q || 'all'}` })}
    />
  );
}
