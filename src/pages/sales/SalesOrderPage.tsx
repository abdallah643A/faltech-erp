import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ReactNode } from 'react';

export default function SalesOrderPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [status] = useState<DocumentStatus>('Open');
  const [shippingType, setShippingType] = useState('');
  const [pickPackRemarks, setPickPackRemarks] = useState('');

  const extraLineColumns = [
    {
      key: 'deliveryDate', label: 'Delivery Date', width: 'w-28',
      render: (line: DocumentLine, idx: number) => (
        <Input type="date" value={line.deliveryDate || ''} onChange={e => {
          const updated = [...lines];
          updated[idx] = { ...updated[idx], deliveryDate: e.target.value };
          setLines(updated);
        }} className="h-7 text-xs border-[#d0d5dd]" />
      ),
    },
    {
      key: 'fulfilled', label: 'Fulfillment', width: 'w-32',
      render: (line: DocumentLine) => {
        const delivered = line.deliveredQty || 0;
        const pct = line.quantity > 0 ? (delivered / line.quantity) * 100 : 0;
        return (
          <div className="space-y-0.5">
            <Progress value={pct} className="h-2" />
            <span className="text-[10px] text-gray-500">{delivered}/{line.quantity}</span>
          </div>
        );
      },
    },
  ];

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Shipping Type</Label>
        <Select value={shippingType} onValueChange={setShippingType}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="express">Express</SelectItem>
            <SelectItem value="same_day">Same Day</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Pick & Pack Remarks</Label>
        <Input value={pickPackRemarks} onChange={e => setPickPackRemarks(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="Sales Order"
        status={status}
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        extraLineColumns={extraLineColumns}
        hideJournalTab
        onSave={() => toast({ title: 'Sales Order saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Sales Order: ${q || 'all'}` })}
        copyToOptions={['Delivery', 'A/R Invoice']}
        copyFromOptions={['Sales Quotation']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
