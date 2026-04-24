import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SalesBlanketAgreement() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [status] = useState<DocumentStatus>('Draft');
  const [agreementType, setAgreementType] = useState('General');
  const [agreementMethod, setAgreementMethod] = useState('Item');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 365 * 86400000));
  const [probability, setProbability] = useState(50);
  const [bpProject, setBpProject] = useState('');

  const extraLineColumns = [
    { key: 'agreedQty', label: 'Agreed Qty', width: 'w-20' },
    { key: 'cumulativeQty', label: 'Cumul. Qty', width: 'w-20' },
    { key: 'cumulativeAmt', label: 'Cumul. Amt', width: 'w-24' },
    { key: 'remainingQty', label: 'Remaining', width: 'w-20' },
  ];

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Agreement Type</Label>
        <Select value={agreementType} onValueChange={setAgreementType}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="Specific">Specific</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Agreement Method</Label>
        <Select value={agreementMethod} onValueChange={setAgreementMethod}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Item">Item</SelectItem>
            <SelectItem value="Monetary">Monetary</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Settlement Probability %</Label>
        <Input type="number" value={probability} onChange={e => setProbability(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" min={0} max={100} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(startDate, 'yyyy-MM-dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={d => d && setStartDate(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">End Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {format(endDate, 'yyyy-MM-dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={d => d && setEndDate(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">BP Project</Label>
        <Input value={bpProject} onChange={e => setBpProject(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="Sales Blanket Agreement"
        status={status}
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        extraLineColumns={extraLineColumns}
        onSave={() => toast({ title: 'Blanket Agreement saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Blanket Agreement: ${q || 'all'}` })}
        copyToOptions={['Sales Order', 'A/R Invoice']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
