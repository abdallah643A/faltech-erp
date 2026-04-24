import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { useToast } from '@/hooks/use-toast';

export default function GoodsReceiptPOPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  return (
    <SalesDocumentForm
      title="Goods Receipt PO"
      docNumber="GRPO-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      baseDocument={{ type: 'Purchase Order', number: '' }}
      copyToOptions={['A/P Invoice']}
      copyFromOptions={['Purchase Order']}
      onSave={() => toast({ title: 'Goods Receipt PO saved' })}
      onCancel={() => {}}
      onPrint={() => {}}
      onFind={(q) => toast({ title: `Finding GRPO: ${q || 'all'}` })}
    />
  );
}
