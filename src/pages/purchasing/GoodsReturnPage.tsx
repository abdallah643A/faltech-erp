import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { useToast } from '@/hooks/use-toast';

export default function GoodsReturnPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  return (
    <SalesDocumentForm
      title="Goods Return"
      docNumber="GR-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      baseDocument={{ type: 'Goods Receipt PO', number: '' }}
      onSave={() => toast({ title: 'Goods Return saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding Goods Return: ${q || 'all'}` })}
    />
  );
}
