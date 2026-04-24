import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, RotateCcw, FileText, DollarSign, Package, Shield } from 'lucide-react';

export default function POSTransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: txn, isLoading } = useQuery({
    queryKey: ['pos-transaction-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pos_transactions').select('*, pos_transaction_lines(*)').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!txn) return <div className="p-6 text-center text-muted-foreground">Transaction not found</div>;

  const lines = txn.pos_transaction_lines || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos/transactions')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{txn.transaction_no}</h1>
          <p className="text-sm text-muted-foreground">{txn.created_at ? new Date(txn.created_at).toLocaleDateString() : ''} • {txn.customer_name || 'Walk-in Customer'}</p>
        </div>
        <Badge className={txn.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{txn.status}</Badge>
        <Button variant="outline" size="sm" className="gap-1"><Printer className="h-3 w-3" /> Print</Button>
        <Button variant="outline" size="sm" className="gap-1 text-destructive"><RotateCcw className="h-3 w-3" /> Return</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Subtotal', value: txn.subtotal },
          { label: 'Tax', value: txn.tax_amount },
          { label: 'Discount', value: txn.discount_amount },
          { label: 'Total', value: txn.grand_total, bold: true },
          { label: 'Payment', value: txn.payment_method, isCurrency: false },
        ].map(c => (
          <Card key={c.label} className="border"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg ${c.bold ? 'font-bold text-primary' : 'font-medium'}`}>
              {c.isCurrency === false ? String(c.value || '-') : `SAR ${Number(c.value || 0).toFixed(2)}`}
            </p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items" className="gap-1"><Package className="h-3 w-3" /> Items</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1"><DollarSign className="h-3 w-3" /> Payments</TabsTrigger>
          <TabsTrigger value="accounting" className="gap-1"><FileText className="h-3 w-3" /> Accounting</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1"><Shield className="h-3 w-3" /> Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card className="border"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left py-2 px-3">#</th><th className="text-left py-2 px-3">Item Code</th><th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Qty</th><th className="text-right py-2 px-3">Price</th><th className="text-right py-2 px-3">Disc %</th>
                <th className="text-right py-2 px-3">Tax %</th><th className="text-right py-2 px-3">Total</th>
              </tr></thead>
              <tbody>
                {lines.map((l: any) => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2 px-3">{l.line_num}</td><td className="py-2 px-3 font-mono text-xs">{l.item_code}</td>
                    <td className="py-2 px-3">{l.item_description}</td><td className="py-2 px-3 text-right">{l.quantity}</td>
                    <td className="py-2 px-3 text-right">{Number(l.unit_price || 0).toFixed(2)}</td><td className="py-2 px-3 text-right">{l.discount_percent}%</td>
                    <td className="py-2 px-3 text-right">{l.tax_percent}%</td><td className="py-2 px-3 text-right font-medium">{Number(l.line_total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border"><CardContent className="p-4 space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><Badge variant="outline">{txn.payment_method}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">SAR {Number(txn.grand_total || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tendered</span><span>SAR {Number(txn.amount_tendered || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span>SAR {Number(txn.change_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cashier</span><span>{txn.cashier_name}</span></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="accounting">
          <Card className="border"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">Journal entries generated by account determination rules for this POS transaction.</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm border-b py-2"><span>Debit: Cash/Bank</span><span className="font-mono">SAR {Number(txn.grand_total || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm border-b py-2"><span>Credit: Sales Revenue</span><span className="font-mono">SAR {Number(txn.subtotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm border-b py-2"><span>Credit: Tax Payable</span><span className="font-mono">SAR {Number(txn.tax_amount || 0).toFixed(2)}</span></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border"><CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Created At</span><span>{new Date(txn.created_at).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cashier ID</span><span className="font-mono text-xs">{txn.cashier_id}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Transaction ID</span><span className="font-mono text-xs">{txn.id}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sync Status</span><span>{txn.sync_status || 'local'}</span></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
