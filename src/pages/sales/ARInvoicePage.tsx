import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function PaymentMeansModal({ total, onClose }: { total: number; onClose: () => void }) {
  const [checkAmt, setCheckAmt] = useState(0);
  const [bankAmt, setBankAmt] = useState(0);
  const [cardAmt, setCardAmt] = useState(0);
  const [cashAmt, setCashAmt] = useState(0);
  const allocated = checkAmt + bankAmt + cardAmt + cashAmt;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="check">
        <TabsList className="w-full">
          <TabsTrigger value="check" className="flex-1">Check</TabsTrigger>
          <TabsTrigger value="bank" className="flex-1">Bank Transfer</TabsTrigger>
          <TabsTrigger value="card" className="flex-1">Credit Card</TabsTrigger>
          <TabsTrigger value="cash" className="flex-1">Cash</TabsTrigger>
        </TabsList>
        <TabsContent value="check" className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Check No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Bank</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Branch</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={checkAmt} onChange={e => setCheckAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="bank" className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Bank Name</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Account No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Reference No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={bankAmt} onChange={e => setBankAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="card" className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Card Type</Label>
              <Select><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="visa">Visa</SelectItem><SelectItem value="mc">MasterCard</SelectItem><SelectItem value="amex">Amex</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Card No. (last 4)</Label><Input maxLength={4} className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Expiry</Label><Input placeholder="MM/YY" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Voucher No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" value={cardAmt} onChange={e => setCardAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="cash" className="space-y-3 p-4">
          <div className="space-y-1"><Label className="text-xs">Amount Tendered</Label><Input type="number" value={cashAmt} onChange={e => setCashAmt(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div className="text-sm text-gray-600">Change: <strong>{(cashAmt - (total - allocated + cashAmt)).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></div>
        </TabsContent>
      </Tabs>
      <div className="flex justify-between border-t pt-3 text-sm">
        <span>Total Allocated: <strong>{allocated.toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
        <span>Balance: <strong className={total - allocated > 0 ? 'text-red-600' : 'text-green-600'}>{(total - allocated).toLocaleString('en', { minimumFractionDigits: 2 })}</strong></span>
      </div>
      <div className="flex justify-end"><Button onClick={onClose}>Apply Payment</Button></div>
    </div>
  );
}

export default function ARInvoicePage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({
    postingDate: new Date(),
    documentDate: new Date(),
    dueDate: new Date(),
    currency: 'SAR',
    series: 'Primary',
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + (l.taxPercent || 15) / 100) * (1 - (l.discountPercent || 0) / 100), 0);

  const paymentButton = (
    <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1">
          <CreditCard className="h-3.5 w-3.5" /> Payment Means
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Payment Means</DialogTitle></DialogHeader>
        <PaymentMeansModal total={total} onClose={() => setPaymentOpen(false)} />
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4 page-enter">
      <SalesDocumentForm
        title="A/R Invoice"
        status="Open"
        headerData={headerData}
        onHeaderChange={setHeaderData}
        lines={lines}
        onLinesChange={setLines}
        extraToolbarButtons={paymentButton}
        showPaymentSection
        onSave={() => toast({ title: 'Invoice saved' })}
        onCancel={() => {}}
        onPrint={() => {}}
        onEmail={() => {}}
        onFind={(q) => toast({ title: `Finding Invoice: ${q || 'all'}` })}
        copyFromOptions={['Sales Order', 'Delivery', 'Down Payment Invoice']}
        onFreightChange={() => {}}
        onDiscountPercentChange={() => {}}
      />
    </div>
  );
}
