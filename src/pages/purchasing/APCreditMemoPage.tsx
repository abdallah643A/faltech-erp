import { useState, useMemo } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';

export default function APCreditMemoPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [reason, setReason] = useState('Price Dispute');

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const taxAmount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * ((l.taxPercent || 15) / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [lines]);

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-4">
      <div className="space-y-1"><Label className="text-xs text-gray-600">Base A/P Invoice</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="APINV-..." /></div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">Reason</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Price Dispute">Price Dispute</SelectItem>
            <SelectItem value="Return">Return</SelectItem>
            <SelectItem value="Correction">Correction</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="A/P Credit Memo"
      docNumber="APCM-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      extraToolbarButtons={<Button size="sm" variant="secondary" className="gap-1"><Link2 className="h-3.5 w-3.5" /> Reconcile</Button>}
      onSave={() => toast({ title: 'A/P Credit Memo saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding Credit Memo: ${q || 'all'}` })}
    >
      <div className="mt-3">
        <AccountingValidationPanel
          documentType="ap_credit_memo"
          getDocumentData={() => ({
            document_type: 'ap_credit_memo',
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
