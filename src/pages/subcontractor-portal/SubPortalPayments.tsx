import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalPayments({ subcontractor }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const [ordersRes, paymentsRes, invoicesRes] = await Promise.all([
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id).order('created_at', { ascending: false }) as any,
      supabase.from('cpms_subcontract_payments').select('*').order('application_date', { ascending: false }) as any,
      supabase.from('cpms_subcontractor_invoices').select('*').eq('subcontractor_id', subcontractor.id).order('invoice_date', { ascending: false }) as any,
    ]);
    setOrders(ordersRes.data || []);
    // Filter payments for this subcontractor's orders
    const orderIds = (ordersRes.data || []).map((o: any) => o.id);
    setPayments((paymentsRes.data || []).filter((p: any) => orderIds.includes(p.subcontract_order_id)));
    setInvoices(invoicesRes.data || []);
  };

  const totalContract = orders.reduce((s: number, o: any) => s + (o.contract_value || 0), 0);
  const totalPaid = orders.reduce((s: number, o: any) => s + (o.paid_amount || 0), 0);
  const totalRetention = orders.reduce((s: number, o: any) => s + (o.retention_amount || 0), 0);
  const totalCertified = orders.reduce((s: number, o: any) => s + (o.certified_amount || 0), 0);
  const paidPct = totalContract > 0 ? (totalPaid / totalContract) * 100 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Payment & Retention Status</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CreditCard className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Total Contract</span></div>
            <p className="text-lg font-bold">{totalContract.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Total Paid</span></div>
            <p className="text-lg font-bold">{totalPaid.toLocaleString()} SAR</p>
            <Progress value={paidPct} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Retention Held</span></div>
            <p className="text-lg font-bold">{totalRetention.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CreditCard className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Outstanding</span></div>
            <p className="text-lg font-bold">{(totalContract - totalPaid).toLocaleString()} SAR</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">By Contract</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Certified</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => {
                    const pct = o.contract_value > 0 ? (o.paid_amount / o.contract_value) * 100 : 0;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium text-sm">{o.order_number}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{o.scope_description}</TableCell>
                        <TableCell className="text-right text-sm">{(o.contract_value || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{(o.certified_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{(o.paid_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{(o.retention_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 w-16" />
                            <span className="text-xs">{pct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments</TableCell></TableRow>
                  ) : payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.payment_number}</TableCell>
                      <TableCell className="text-xs">{p.application_date}</TableCell>
                      <TableCell className="text-right text-sm">{(p.gross_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{(p.retention_held || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{(p.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{(p.net_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={p.status === 'paid' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">To Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>
                  ) : invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{inv.invoice_date}</TableCell>
                      <TableCell className="text-right text-sm">{(inv.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{(inv.retention_held || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{(inv.amount_to_pay || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={inv.status === 'paid' ? 'outline' : 'secondary'} className="text-[10px] capitalize">{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}