import { useState } from 'react';
import { SalesDocumentForm, DocumentStatus } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function DeliveryPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [status] = useState<DocumentStatus>('Open');

  const extraLineColumns = [
    { key: 'batchSerial', label: 'Batch/Serial No.', width: 'w-28' },
    { key: 'binLocation', label: 'Bin Location', width: 'w-24' },
  ];

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="Delivery"
        status={status}
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraLineColumns={extraLineColumns}
        baseDocument={{ type: 'Sales Order', number: '' }}
        onSave={() => toast({ title: 'Delivery saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Delivery: ${q || 'all'}` })}
        copyToOptions={['A/R Invoice']}
        copyFromOptions={['Sales Order']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
