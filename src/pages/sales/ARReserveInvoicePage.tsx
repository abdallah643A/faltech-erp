import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function ARReserveInvoicePage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  const extraLineColumns = [
    {
      key: 'fulfillmentStatus', label: 'Fulfillment', width: 'w-28',
      render: (line: DocumentLine) => {
        const fulfilled = line.fulfilledQty || 0;
        const pct = line.quantity > 0 ? (fulfilled / line.quantity) * 100 : 0;
        return (
          <div className="space-y-0.5">
            <Progress value={pct} className="h-2" />
            <span className="text-[10px] text-gray-500">{fulfilled}/{line.quantity}</span>
          </div>
        );
      },
    },
  ];

  const reserveBadge = (
    <Badge className="bg-amber-100 text-amber-800 ml-2">Reserve</Badge>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Reserve Invoice"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraLineColumns={extraLineColumns}
        extraToolbarButtons={reserveBadge}
        onSave={() => toast({ title: 'Reserve Invoice saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Reserve Invoice: ${q || 'all'}` })}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
