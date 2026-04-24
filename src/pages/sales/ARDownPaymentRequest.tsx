import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ARDownPaymentRequest() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [dpPercent, setDpPercent] = useState(30);
  const [linkedSO, setLinkedSO] = useState('');

  const soTotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const dpAmount = soTotal * (dpPercent / 100);

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Linked Sales Order</Label>
          <Input value={linkedSO} onChange={e => setLinkedSO(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" placeholder="SO-2025-..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Down Payment %</Label>
          <Input type="number" value={dpPercent} onChange={e => setDpPercent(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" min={0} max={100} />
        </div>
      </div>
      <div className="mt-4 p-3 bg-[#f0f2f4] rounded border border-[#d0d5dd]">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Down Payment Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Total SO Amount</span><br /><strong>{soTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></div>
          <div><span className="text-gray-500">Down Payment %</span><br /><strong>{dpPercent}%</strong></div>
          <div><span className="text-gray-500">Down Payment Amount</span><br /><strong className="text-[#0066cc]">{dpAmount.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></div>
          <div><span className="text-gray-500">Remaining Amount</span><br /><strong>{(soTotal - dpAmount).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Down Payment Request"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraHeaderFields={extraHeader}
        hideJournalTab
        onSave={() => toast({ title: 'Down Payment Request saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onFind={(q) => toast({ title: `Finding DP Request: ${q || 'all'}` })}
        copyFromOptions={['Sales Order']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
