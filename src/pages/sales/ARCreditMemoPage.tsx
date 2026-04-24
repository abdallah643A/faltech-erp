import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GitCompare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ARCreditMemoPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [reasonCode, setReasonCode] = useState('');

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="space-y-1 w-64">
        <Label className="text-xs text-gray-600">Reason for Credit Memo</Label>
        <Select value={reasonCode} onValueChange={setReasonCode}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select reason..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Return">Return</SelectItem>
            <SelectItem value="Price Adjustment">Price Adjustment</SelectItem>
            <SelectItem value="Correction">Correction</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const reconcileButton = (
    <Button size="sm" variant="secondary" className="gap-1" onClick={() => toast({ title: 'Reconciling with invoice...' })}>
      <GitCompare className="h-3.5 w-3.5" /> Reconcile with Invoice
    </Button>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Credit Memo"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        extraToolbarButtons={reconcileButton}
        baseDocument={{ type: 'A/R Invoice', number: '' }}
        onSave={() => toast({ title: 'Credit Memo saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Credit Memo: ${q || 'all'}` })}
        copyFromOptions={['A/R Invoice']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
