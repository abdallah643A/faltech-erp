import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, Percent, Zap, ArrowRight, CheckCircle, Clock, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { differenceInDays, format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'vendor', header: 'Vendor' },
  { key: 'invoice', header: 'Invoice' },
  { key: 'discount', header: 'Discount' },
  { key: 'savings', header: 'Savings' },
  { key: 'apr', header: 'APR' },
  { key: 'days_left', header: 'Days Left' },
  { key: 'action', header: 'Action' },
];


export default function PaymentOptimization() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('discounts');

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['pay-opt-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('id, invoice_number, vendor_name, vendor_code, total, status, doc_date, doc_due_date, payment_terms, currency, discount_percent, discount_amount').eq('status', 'open');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: outPayments = [] } = useQuery({
    queryKey: ['pay-opt-out', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('outgoing_payments' as any).select('id, total_amount, doc_date, vendor_name, vendor_code, currency, status').limit(1000) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v);
  const today = new Date();

  // === EARLY PAYMENT DISCOUNTS ===
  const discountOpportunities = useMemo(() => {
    return apInvoices
      .filter(inv => (inv.discount_percent || 0) > 0 || (inv.discount_amount || 0) > 0)
      .map(inv => {
        const discPct = inv.discount_percent || 2;
        const discAmt = inv.discount_amount || (inv.total || 0) * (discPct / 100);
        const dueDate = inv.doc_due_date ? new Date(inv.doc_due_date) : addDays(today, 30);
        const earlyDate = addDays(new Date(inv.doc_date), 10);
        const daysLeft = differenceInDays(earlyDate, today);
        const annualizedReturn = daysLeft > 0 ? ((discPct / (100 - discPct)) * (365 / daysLeft) * 100) : 0;
        return {
          ...inv,
          discPct,
          discAmt,
          earlyDate: format(earlyDate, 'yyyy-MM-dd'),
          daysLeft: Math.max(0, daysLeft),
          annualizedReturn,
          recommendation: annualizedReturn > 10 ? 'take' : 'skip',
        };
      })
      .sort((a, b) => b.annualizedReturn - a.annualizedReturn);
  }, [apInvoices]);

  const totalPotentialSavings = discountOpportunities.reduce((s, d) => s + d.discAmt, 0);

  // === DYNAMIC PAYMENT SCHEDULE ===
  const paymentSchedule = useMemo(() => {
    const schedule: { date: string; invoices: any[]; totalAmount: number }[] = [];
    const batchDays = [1, 8, 15, 22]; // Weekly batch days
    const sortedInvoices = [...apInvoices].sort((a, b) => (a.doc_due_date || '').localeCompare(b.doc_due_date || ''));

    // Group invoices by optimal batch date
    sortedInvoices.forEach(inv => {
      const dueDate = inv.doc_due_date ? new Date(inv.doc_due_date) : addDays(today, 30);
      const dueDayOfMonth = dueDate.getDate();
      // Find nearest batch day before due date
      const batchDay = batchDays.filter(d => d <= dueDayOfMonth).pop() || batchDays[0];
      const batchDate = format(new Date(dueDate.getFullYear(), dueDate.getMonth(), batchDay), 'yyyy-MM-dd');

      let existing = schedule.find(s => s.date === batchDate);
      if (!existing) {
        existing = { date: batchDate, invoices: [], totalAmount: 0 };
        schedule.push(existing);
      }
      existing.invoices.push(inv);
      existing.totalAmount += inv.total || 0;
    });

    return schedule.sort((a, b) => a.date.localeCompare(b.date));
  }, [apInvoices]);

  // === MULTI-CURRENCY CONSOLIDATION ===
  const currencyConsolidation = useMemo(() => {
    const vendorCurrency: Record<string, { vendor: string; currencies: Record<string, number>; invoiceCount: number }> = {};
    apInvoices.forEach(inv => {
      const vendor = inv.vendor_name || inv.vendor_code || 'Unknown';
      const currency = inv.currency || 'SAR';
      if (!vendorCurrency[vendor]) vendorCurrency[vendor] = { vendor, currencies: {}, invoiceCount: 0 };
      vendorCurrency[vendor].currencies[currency] = (vendorCurrency[vendor].currencies[currency] || 0) + (inv.total || 0);
      vendorCurrency[vendor].invoiceCount++;
    });
    return Object.values(vendorCurrency).filter(v => Object.keys(v.currencies).length > 1);
  }, [apInvoices]);

  // === DUPLICATE DETECTION ===
  const duplicates = useMemo(() => {
    const results: { invoice1: any; invoice2: any; confidence: number; reason: string }[] = [];
    for (let i = 0; i < apInvoices.length; i++) {
      for (let j = i + 1; j < apInvoices.length; j++) {
        const a = apInvoices[i];
        const b = apInvoices[j];
        if (a.vendor_name === b.vendor_name && Math.abs((a.total || 0) - (b.total || 0)) < 0.01) {
          const dateDiff = a.doc_date && b.doc_date ? Math.abs(differenceInDays(new Date(a.doc_date), new Date(b.doc_date))) : 999;
          if (dateDiff <= 7) {
            results.push({
              invoice1: a, invoice2: b,
              confidence: dateDiff === 0 ? 95 : dateDiff <= 3 ? 80 : 60,
              reason: `Same vendor & amount${dateDiff === 0 ? ', same date' : `, ${dateDiff} days apart`}`,
            });
          }
        }
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }, [apInvoices]);

  const scheduleChartData = paymentSchedule.slice(0, 8).map(s => ({
    date: s.date,
    amount: s.totalAmount,
    count: s.invoices.length,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Optimization</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="payment-optimization" title="Payment Optimization" />
        <p className="text-sm text-muted-foreground">Maximize savings through intelligent payment scheduling</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="discounts"><Percent className="h-3 w-3 mr-1" /> Early Discounts</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="h-3 w-3 mr-1" /> Payment Schedule</TabsTrigger>
          <TabsTrigger value="currency"><Globe className="h-3 w-3 mr-1" /> Multi-Currency</TabsTrigger>
          <TabsTrigger value="duplicates"><Zap className="h-3 w-3 mr-1" /> Duplicate Detection</TabsTrigger>
        </TabsList>

        {/* EARLY PAYMENT DISCOUNTS */}
        <TabsContent value="discounts" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Discount Opportunities</p><p className="text-2xl font-bold">{discountOpportunities.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Potential Savings</p><p className="text-2xl font-bold text-green-600">SAR {fmt(totalPotentialSavings)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recommended to Take</p><p className="text-2xl font-bold text-primary">{discountOpportunities.filter(d => d.recommendation === 'take').length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Early Payment Discount Analysis</CardTitle></CardHeader>
            <CardContent>
              {discountOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices with early payment discounts found</p>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-2">Vendor</th><th className="text-left p-2">Invoice</th><th className="text-right p-2">{t('common.amount')}</th><th className="text-right p-2">Discount</th><th className="text-right p-2">Savings</th><th className="text-right p-2">APR</th><th className="text-center p-2">Days Left</th><th className="text-center p-2">Action</th></tr></thead>
                  <tbody>
                    {discountOpportunities.slice(0, 20).map((d, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{d.vendor_name}</td>
                        <td className="p-2">{d.invoice_number}</td>
                        <td className="p-2 text-right">{fmt(d.total || 0)}</td>
                        <td className="p-2 text-right">{d.discPct}%</td>
                        <td className="p-2 text-right text-green-600">{fmt(d.discAmt)}</td>
                        <td className="p-2 text-right font-bold">{d.annualizedReturn.toFixed(1)}%</td>
                        <td className="p-2 text-center"><Badge variant={d.daysLeft <= 3 ? 'destructive' : 'outline'} className="text-[10px]">{d.daysLeft}d</Badge></td>
                        <td className="p-2 text-center"><Badge variant={d.recommendation === 'take' ? 'default' : 'secondary'} className="text-[10px]">{d.recommendation === 'take' ? '✓ Take' : 'Skip'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT SCHEDULE */}
        <TabsContent value="schedule" className="space-y-4">
          {scheduleChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Optimized Payment Schedule</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={scheduleChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                    <Bar dataKey="amount" name="Payment Amount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <div className="space-y-3">
            {paymentSchedule.map((batch, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{batch.date}</p>
                      <p className="text-xs text-muted-foreground">{batch.invoices.length} invoice(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold">SAR {fmt(batch.totalAmount)}</span>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => toast({ title: 'Batch scheduled' })}>
                      Schedule Batch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MULTI-CURRENCY */}
        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Multi-Currency Consolidation Opportunities</CardTitle></CardHeader>
            <CardContent>
              {currencyConsolidation.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No multi-currency consolidation opportunities found</p>
              ) : (
                <div className="space-y-3">
                  {currencyConsolidation.map((v, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{v.vendor}</span>
                        <Badge variant="outline" className="text-xs">{v.invoiceCount} invoices</Badge>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {Object.entries(v.currencies).map(([cur, amt]) => (
                          <Badge key={cur} variant="secondary" className="text-xs">{cur}: {fmt(amt)}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Consider consolidating payments to reduce transaction costs
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DUPLICATE DETECTION */}
        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Potential Duplicates Found</p>
              <p className="text-2xl font-bold text-destructive">{duplicates.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Duplicate Payment Detection</CardTitle></CardHeader>
            <CardContent>
              {duplicates.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-muted-foreground">No duplicate payments detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((d, i) => (
                    <div key={i} className="border rounded-lg p-4 border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive" className="text-[10px]">{d.confidence}% Confidence</Badge>
                        <span className="text-xs text-muted-foreground">{d.reason}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="border rounded p-2">
                          <p className="font-medium">{d.invoice1.invoice_number}</p>
                          <p>{d.invoice1.vendor_name} • SAR {fmt(d.invoice1.total || 0)} • {d.invoice1.doc_date}</p>
                        </div>
                        <div className="border rounded p-2">
                          <p className="font-medium">{d.invoice2.invoice_number}</p>
                          <p>{d.invoice2.vendor_name} • SAR {fmt(d.invoice2.total || 0)} • {d.invoice2.doc_date}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => toast({ title: 'Flagged for review' })}>
                        Flag for Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
