import { useState, useMemo } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';

export default function ARDownPaymentInvoice() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [linkedDPR, setLinkedDPR] = useState('');

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * ((l.taxPercent || 15) / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [lines]);

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Linked Down Payment Request</Label>
        <Input value={linkedDPR} onChange={e => setLinkedDPR(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" placeholder="DPR-2025-..." />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Down Payment Invoice"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        baseDocument={{ type: 'Down Payment Request', number: linkedDPR }}
        onSave={() => toast({ title: 'Down Payment Invoice posted' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onFind={(q) => toast({ title: `Finding DP Invoice: ${q || 'all'}` })}
        copyFromOptions={['Down Payment Request']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      >
        <div className="mt-3">
          <AccountingValidationPanel
            documentType="ar_down_payment"
            getDocumentData={() => ({
              document_type: 'ar_down_payment',
              total: totals.total,
              subtotal: totals.subtotal,
              tax_amount: totals.taxAmount,
              conditions: {},
            })}
            compact
          />
        </div>
      </SalesDocumentForm>
    </div>
  );
}
