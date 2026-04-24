import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function ARInvoicePaymentPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [checkAmt, setCheckAmt] = useState(0);
  const [bankAmt, setBankAmt] = useState(0);
  const [cardAmt, setCardAmt] = useState(0);
  const [cashAmt, setCashAmt] = useState(0);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + (l.taxPercent || 15) / 100) * (1 - (l.discountPercent || 0) / 100), 0);
  const paidAmount = checkAmt + bankAmt + cardAmt + cashAmt;

  const paymentSection = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Means</h3>
      <Tabs defaultValue="check">
        <TabsList className="w-full">
          <TabsTrigger value="check" className="flex-1">Check</TabsTrigger>
          <TabsTrigger value="bank" className="flex-1">Bank Transfer</TabsTrigger>
          <TabsTrigger value="card" className="flex-1">Credit Card</TabsTrigger>
          <TabsTrigger value="cash" className="flex-1">Cash</TabsTrigger>
        </TabsList>
        <TabsContent value="check" className="grid grid-cols-3 gap-3 p-3">
          <div className="space-y-1"><Label className="text-xs">Check No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="space-y-1"><Label className="text-xs">Bank</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={checkAmt} onChange={e => setCheckAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="bank" className="grid grid-cols-3 gap-3 p-3">
          <div className="space-y-1"><Label className="text-xs">Bank Name</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="space-y-1"><Label className="text-xs">Reference No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={bankAmt} onChange={e => setBankAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="card" className="grid grid-cols-3 gap-3 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Card Type</Label>
            <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="visa">Visa</SelectItem><SelectItem value="mc">MC</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Last 4 Digits</Label><Input maxLength={4} className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={cardAmt} onChange={e => setCardAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="cash" className="grid grid-cols-2 gap-3 p-3">
          <div className="space-y-1"><Label className="text-xs">Amount Tendered</Label><Input type="number" value={cashAmt} onChange={e => setCashAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="pt-5 text-sm text-gray-600">Change: <strong>{Math.max(0, paidAmount - total).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Invoice + Payment"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        showPaymentSection
        paidAmount={paidAmount}
        onSave={() => toast({ title: 'Invoice + Payment saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Invoice+Payment: ${q || 'all'}` })}
        copyFromOptions={['Sales Order', 'Delivery']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      >
        {paymentSection}
      </SalesDocumentForm>
    </div>
  );
}
