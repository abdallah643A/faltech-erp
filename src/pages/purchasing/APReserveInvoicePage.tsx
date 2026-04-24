import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { useToast } from '@/hooks/use-toast';

export default function APReserveInvoicePage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  return (
    <SalesDocumentForm
      title="A/P Reserve Invoice"
      docNumber="APRI-2025-00001"
      status="Draft"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      onSave={() => toast({ title: 'A/P Reserve Invoice saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding Reserve Invoice: ${q || 'all'}` })}
    />
  );
}
