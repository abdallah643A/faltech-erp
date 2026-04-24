import { useState, useMemo } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';

export default function APDownPaymentInvoice() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * ((l.taxPercent || 15) / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [lines]);

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
      <div className="space-y-1"><Label className="text-xs text-gray-600">Linked DP Request</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="APDPR-..." /></div>
      <div className="space-y-1"><Label className="text-xs text-gray-600">Down Payment %</Label><Input type="number" defaultValue="30" className="h-8 text-sm border-[#d0d5dd]" /></div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="A/P Down Payment Invoice"
      docNumber="APDPI-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      baseDocument={{ type: 'DP Request', number: '' }}
      onSave={() => toast({ title: 'A/P Down Payment Invoice saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding DP Invoice: ${q || 'all'}` })}
    >
      <div className="mt-3">
        <AccountingValidationPanel
          documentType="ap_down_payment"
          getDocumentData={() => ({
            document_type: 'ap_down_payment',
            total: totals.total,
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            conditions: {},
          })}
          compact
        />
      </div>
    </SalesDocumentForm>
  );
}
