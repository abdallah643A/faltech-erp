import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function ReturnRequestPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  const extraLineColumns = [
    {
      key: 'returnReason', label: 'Return Reason', width: 'w-32',
      render: (line: DocumentLine, idx: number) => (
        <Select value={line.returnReason || ''} onValueChange={v => {
          const updated = [...lines];
          updated[idx] = { ...updated[idx], returnReason: v };
          setLines(updated);
        }}>
          <SelectTrigger className="h-7 text-xs border-[#d0d5dd]"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Damaged">Damaged</SelectItem>
            <SelectItem value="Wrong Item">Wrong Item</SelectItem>
            <SelectItem value="Customer Request">Customer Request</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="Return Request"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraLineColumns={extraLineColumns}
        baseDocument={{ type: 'Delivery', number: '' }}
        hideJournalTab
        onSave={() => toast({ title: 'Return Request saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onFind={(q) => toast({ title: `Finding Return Request: ${q || 'all'}` })}
        copyFromOptions={['Delivery']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
