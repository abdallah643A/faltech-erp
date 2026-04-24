import { useState } from 'react';
import { SalesDocumentForm } from '@/components/sales/SalesDocumentForm';
import { DocumentHeaderData } from '@/components/sales/DocumentHeader';
import { DocumentLine } from '@/components/sales/DocumentLinesTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function APInvoicePaymentPage() {
  const { toast } = useToast();
  const [headerData, setHeaderData] = useState<DocumentHeaderData>({ postingDate: new Date(), documentDate: new Date(), dueDate: new Date(), currency: 'SAR', series: 'Primary' });
  const [lines, setLines] = useState<DocumentLine[]>([]);

  const paymentSection = (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 mt-4">
      <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Outgoing Payment Means</h3>
      <Tabs defaultValue="transfer">
        <TabsList className="border-b border-[#d0d5dd]">
          <TabsTrigger value="check">Check</TabsTrigger>
          <TabsTrigger value="transfer">Bank Transfer</TabsTrigger>
          <TabsTrigger value="card">Credit Card</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
        </TabsList>
        <TabsContent value="check" className="grid grid-cols-4 gap-3 p-3">
          <div><Label className="text-xs">Check No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Bank Account</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Due Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="transfer" className="grid grid-cols-4 gap-3 p-3">
          <div><Label className="text-xs">From Bank</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">To Bank (Vendor)</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Reference</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="card" className="grid grid-cols-4 gap-3 p-3">
          <div><Label className="text-xs">Card Type</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Last 4 Digits</Label><Input className="h-8 text-sm border-[#d0d5dd]" maxLength={4} /></div>
          <div><Label className="text-xs">Auth No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
          <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
        <TabsContent value="cash" className="grid grid-cols-2 gap-3 p-3">
          <div><Label className="text-xs">Amount Paid</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <SalesDocumentForm
      title="A/P Invoice + Payment"
      docNumber="APINVP-2025-00001"
      status="Open"
      headerData={headerData}
      onHeaderChange={setHeaderData}
      lines={lines}
      onLinesChange={setLines}
      showPaymentSection
      onSave={() => toast({ title: 'A/P Invoice + Payment saved' })}
      onCancel={() => {}}
      onFind={(q) => toast({ title: `Finding AP Invoice+Payment: ${q || 'all'}` })}
    >
      {paymentSection}
    </SalesDocumentForm>
  );
}
