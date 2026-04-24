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
import { format, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function PurchaseBlanketAgreement() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [status] = useState<DocumentStatus>('Draft');
  const [agreementType, setAgreementType] = useState('General');
  const [agreementMethod, setAgreementMethod] = useState('Item');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addMonths(new Date(), 12));
  const [probability, setProbability] = useState('80');

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-5 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Agreement Type</Label>
        <Select value={agreementType} onValueChange={setAgreementType}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Specific">Specific</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Agreement Method</Label>
        <Select value={agreementMethod} onValueChange={setAgreementMethod}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Item">Item</SelectItem><SelectItem value="Monetary">Monetary</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(startDate, 'yyyy-MM-dd')}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={d => d && setStartDate(d)} className="p-3 pointer-events-auto" /></PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">End Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(endDate, 'yyyy-MM-dd')}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={d => d && setEndDate(d)} className="p-3 pointer-events-auto" /></PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Settlement Probability %</Label>
        <Input type="number" value={probability} onChange={e => setProbability(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" min={0} max={100} />
      </div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="Purchase Blanket Agreement"
      docNumber="PBA-2025-00001"
      status={status}
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      copyToOptions={['Purchase Order']}
      onSave={() => toast({ title: 'Purchase Blanket Agreement saved' })}
      onCancel={() => {}}
      onPrint={() => {}}
      onEmail={() => {}}
      onFind={(q) => toast({ title: `Finding Blanket Agreement: ${q || 'all'}` })}
    />
  );
}
