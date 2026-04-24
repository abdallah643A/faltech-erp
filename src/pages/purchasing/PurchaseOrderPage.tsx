import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function PurchaseOrderPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: addDays(new Date(), 30), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [buyer, setBuyer] = useState('');
  const [confirmDate, setConfirmDate] = useState<Date | undefined>();

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Buyer</Label>
        <Input value={buyer} onChange={e => setBuyer(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Confirm Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{confirmDate ? format(confirmDate, 'yyyy-MM-dd') : 'Select'}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={confirmDate} onSelect={setConfirmDate} className="p-3 pointer-events-auto" /></PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="Purchase Order"
      docNumber="PO-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      copyToOptions={['Goods Receipt PO', 'A/P Invoice']}
      copyFromOptions={['Purchase Quotation', 'Purchase Blanket Agreement']}
      onSave={() => toast({ title: 'Purchase Order saved' })}
      onCancel={() => {}}
      onPrint={() => {}}
      onEmail={() => {}}
      onFind={(q) => toast({ title: `Finding PO: ${q || 'all'}` })}
    />
  );
}
