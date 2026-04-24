import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function PaymentMeansModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1"><CreditCard className="h-3.5 w-3.5" /> Payment Means</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Outgoing Payment Means</DialogTitle></DialogHeader>
        <Tabs defaultValue="transfer">
          <TabsList className="border-b border-[#d0d5dd]">
            <TabsTrigger value="check">Check</TabsTrigger>
            <TabsTrigger value="transfer">Bank Transfer</TabsTrigger>
            <TabsTrigger value="card">Credit Card</TabsTrigger>
            <TabsTrigger value="cash">Cash</TabsTrigger>
          </TabsList>
          <TabsContent value="check" className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Check No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Bank Account</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Due Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            </div>
          </TabsContent>
          <TabsContent value="transfer" className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">From Bank Account</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">To Bank (Vendor)</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Reference No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            </div>
          </TabsContent>
          <TabsContent value="card" className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Card Type</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="Visa / MC" /></div>
              <div><Label className="text-xs">Card No. (last 4)</Label><Input className="h-8 text-sm border-[#d0d5dd]" maxLength={4} /></div>
              <div><Label className="text-xs">Authorization No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
              <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            </div>
          </TabsContent>
          <TabsContent value="cash" className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount Paid</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end"><Button className="bg-[#0066cc]">Apply Payment</Button></div>
      </DialogContent>
    </Dialog>
  );
}

export default function APInvoicePage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [vendorInvNo, setVendorInvNo] = useState('');

  const extraHeader = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-2 gap-4">
      <div className="space-y-1"><Label className="text-xs text-gray-600">Vendor Invoice No. *</Label><Input value={vendorInvNo} onChange={e => setVendorInvNo(e.target.value)} className="h-8 text-sm border-[#d0d5dd]" placeholder="Vendor's reference" /></div>
    </div>
  );

  return (
    <SalesDocumentForm
      title="A/P Invoice"
      docNumber="APINV-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      extraHeaderFields={extraHeader}
      copyFromOptions={['Purchase Order', 'Goods Receipt PO', 'Down Payment Invoice']}
      extraToolbarButtons={<PaymentMeansModal />}
      onSave={() => toast({ title: 'A/P Invoice saved' })}
      onCancel={() => {}}
      onPrint={() => {}}
      onEmail={() => {}}
      onFind={(q) => toast({ title: `Finding AP Invoice: ${q || 'all'}` })}
    />
  );
}
