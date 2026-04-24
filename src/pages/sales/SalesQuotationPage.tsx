import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function SalesQuotationPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: addDays(new Date(), 30),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [status] = useState<DocumentStatus>('Open');
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 30));
  const [closingPct, setClosingPct] = useState(50);
  const [salesEmployee, setSalesEmployee] = useState('');
  const [owner, setOwner] = useState('');

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Valid Until</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(validUntil, 'yyyy-MM-dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={validUntil} onSelect={d => d && setValidUntil(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Sales Employee</Label>
        <Input value={salesEmployee} onChange={e => setSalesEmployee(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Owner</Label>
        <Input value={owner} onChange={e => setOwner(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Closing % ({closingPct}%)</Label>
        <Slider value={[closingPct]} onValueChange={v => setClosingPct(v[0])} max={100} step={5} className="mt-2" />
      </div>
    </div>
  );

  const convertButton = (
    <Button size="sm" variant="secondary" className="gap-1 bg-[#0066cc] text-white hover:bg-[#0055aa]"
      onClick={() => toast({ title: 'Converting to Sales Order...' })}>
      <ArrowRight className="h-3.5 w-3.5" /> Convert to Sales Order
    </Button>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="Sales Quotation"
        status={status}
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        extraToolbarButtons={convertButton}
        hideJournalTab
        onSave={() => toast({ title: 'Quotation saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Quotation: ${q || 'all'}` })}
        copyToOptions={['Sales Order']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
