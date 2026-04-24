import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function APDownPaymentRequest() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [dpPercent, setDpPercent] = useState('30');

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs text-gray-600">Down Payment %</Label><Input type="number" value={dpPercent} onChange={e => setDpPercent(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs text-gray-600">Linked PO</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="Select PO..." /></div>
      </div>
      <div className="mt-3 p-3 bg-[#f0f2f4] rounded grid grid-cols-4 gap-4 text-sm">
        <div><span className="text-gray-500">Total PO Amount:</span> <strong>0.00 SAR</strong></div>
        <div><span className="text-gray-500">DP %:</span> <strong>{dpPercent}%</strong></div>
        <div><span className="text-gray-500">DP Amount:</span> <strong>0.00 SAR</strong></div>
        <div><span className="text-gray-500">Remaining:</span> <strong>0.00 SAR</strong></div>
      </div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="A/P Down Payment Request"
      docNumber="APDPR-2025-00001"
      status="Draft"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      hideJournalTab
      onSave={() => toast({ title: 'A/P Down Payment Request saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding DP Request: ${q || 'all'}` })}
    />
  );
}
