import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, CheckCircle2, Clock, XCircle, Link2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MatchResult {
  paymentId: string;
  invoiceId: string;
  paymentAmount: number;
  invoiceAmount: number;
  paymentDate: string;
  invoiceDate: string;
  customerName: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy_amount' | 'fuzzy_date' | 'partial' | 'unmatched';
  amountDiffPct: number;
  daysDiff: number;
}

export function PaymentReconciliationEngine() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [amountTolerance, setAmountTolerance] = useState(1); // percent
  const [dateFlex, setDateFlex] = useState(3); // days

  const { data: incomingPayments = [] } = useQuery({
    queryKey: ['recon-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('incoming_payments')
        .select('id, total_amount, doc_date, status, customer_name, payment_type, doc_num, sales_order_id')
        .eq('status', 'completed')
        .limit(500);
      return (data || []) as any[];
    },
  });

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['recon-ar-invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices')
        .select('id, total, balance_due, doc_date, doc_due_date, customer_name, doc_num, status')
        .limit(1000);
      return data || [];
    },
  });

  const runMatching = () => {
    setIsRunning(true);
    const results: MatchResult[] = [];
    const matchedInvoiceIds = new Set<string>();

    for (const payment of incomingPayments) {
      const pAmount = payment.total_amount || 0;
      const pDate = payment.doc_date;
      let bestMatch: MatchResult | null = null;

      for (const invoice of arInvoices) {
        if (matchedInvoiceIds.has(invoice.id)) continue;

        const invAmount = invoice.balance_due || invoice.total || 0;
        if (invAmount <= 0) continue;

        const amountDiff = Math.abs(pAmount - invAmount);
        const amountDiffPct = invAmount > 0 ? (amountDiff / invAmount) * 100 : 100;
        const daysDiff = Math.abs(differenceInDays(parseISO(pDate), parseISO(invoice.doc_due_date || invoice.doc_date)));

        // Customer name match (case-insensitive partial)
        const nameMatch = payment.customer_name && invoice.customer_name &&
          (payment.customer_name.toLowerCase().includes(invoice.customer_name.toLowerCase().substring(0, 5)) ||
           invoice.customer_name.toLowerCase().includes(payment.customer_name.toLowerCase().substring(0, 5)));

        let confidence = 0;
        let matchType: MatchResult['matchType'] = 'unmatched';

        // Exact match
        if (amountDiffPct === 0 && daysDiff <= 1) {
          confidence = 99;
          matchType = 'exact';
        }
        // Fuzzy amount match
        else if (amountDiffPct <= amountTolerance && daysDiff <= dateFlex) {
          confidence = 90 - amountDiffPct * 5 - daysDiff * 2;
          matchType = amountDiffPct === 0 ? 'fuzzy_date' : 'fuzzy_amount';
        }
        // Name + amount close
        else if (nameMatch && amountDiffPct <= 5) {
          confidence = 75 - amountDiffPct * 3;
          matchType = 'partial';
        }
        // Name match only
        else if (nameMatch && amountDiffPct <= 15) {
          confidence = 50 - amountDiffPct;
          matchType = 'partial';
        }

        if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            paymentId: payment.id,
            invoiceId: invoice.id,
            paymentAmount: pAmount,
            invoiceAmount: invAmount,
            paymentDate: pDate,
            invoiceDate: invoice.doc_due_date || invoice.doc_date,
            customerName: payment.customer_name || invoice.customer_name,
            confidence: Math.round(Math.max(0, Math.min(99, confidence))),
            matchType,
            amountDiffPct: Math.round(amountDiffPct * 10) / 10,
            daysDiff,
          };
        }
      }

      if (bestMatch) {
        matchedInvoiceIds.add(bestMatch.invoiceId);
        results.push(bestMatch);
      } else {
        results.push({
          paymentId: payment.id,
          invoiceId: '',
          paymentAmount: pAmount,
          invoiceAmount: 0,
          paymentDate: pDate,
          invoiceDate: '',
          customerName: payment.customer_name || 'Unknown',
          confidence: 0,
          matchType: 'unmatched',
          amountDiffPct: 100,
          daysDiff: 0,
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    setMatches(results);
    setIsRunning(false);

    const matched = results.filter(r => r.confidence >= 70).length;
    toast({
      title: isAr ? 'اكتملت المطابقة' : 'Matching Complete',
      description: `${matched}/${results.length} ${isAr ? 'تمت مطابقتها' : 'payments matched'} (${results.length > 0 ? Math.round(matched / results.length * 100) : 0}%)`,
    });
  };

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const matched = matches.filter(m => m.confidence >= 70).length;
  const review = matches.filter(m => m.confidence >= 40 && m.confidence < 70).length;
  const unmatched = matches.filter(m => m.confidence < 40).length;
  const matchRate = matches.length > 0 ? Math.round(matched / matches.length * 100) : 0;

  const confidenceBadge = (c: number) => {
    if (c >= 90) return <Badge className="text-[10px] bg-green-500/20 text-green-700">{c}%</Badge>;
    if (c >= 70) return <Badge className="text-[10px] bg-blue-500/20 text-blue-700">{c}%</Badge>;
    if (c >= 40) return <Badge className="text-[10px] bg-yellow-500/20 text-yellow-700">{c}%</Badge>;
    if (c > 0) return <Badge variant="destructive" className="text-[10px]">{c}%</Badge>;
    return <Badge variant="outline" className="text-[10px]">—</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {isAr ? 'محرك تسوية المدفوعات' : 'Payment Reconciliation Engine'}
          </CardTitle>
          <Button size="sm" className="h-7 text-xs" onClick={runMatching} disabled={isRunning || incomingPayments.length === 0}>
            <Zap className="h-3 w-3 mr-1" />
            {isRunning ? (isAr ? 'جاري المطابقة...' : 'Matching...') : (isAr ? 'تشغيل المطابقة' : 'Run Auto-Match')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Link2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p>{isAr ? 'اضغط "تشغيل المطابقة" لمطابقة المدفوعات تلقائياً مع الفواتير' : 'Click "Run Auto-Match" to automatically match payments to invoices'}</p>
            <p className="text-[10px] mt-1">{incomingPayments.length} {isAr ? 'مدفوعات' : 'payments'} • {arInvoices.filter(i => (i.balance_due || 0) > 0).length} {isAr ? 'فواتير مفتوحة' : 'open invoices'}</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">{isAr ? 'معدل المطابقة' : 'Match Rate'}</p>
                <p className="text-lg font-bold text-green-600">{matchRate}%</p>
                <Progress value={matchRate} className="h-1.5 mt-1" />
              </div>
              <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                <CheckCircle2 className="h-3.5 w-3.5 mx-auto text-green-500 mb-0.5" />
                <p className="text-lg font-bold">{matched}</p>
                <p className="text-[10px] text-muted-foreground">{isAr ? 'مطابق' : 'Matched'}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                <Clock className="h-3.5 w-3.5 mx-auto text-yellow-500 mb-0.5" />
                <p className="text-lg font-bold">{review}</p>
                <p className="text-[10px] text-muted-foreground">{isAr ? 'مراجعة' : 'Review'}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/10">
                <XCircle className="h-3.5 w-3.5 mx-auto text-red-500 mb-0.5" />
                <p className="text-lg font-bold">{unmatched}</p>
                <p className="text-[10px] text-muted-foreground">{isAr ? 'غير مطابق' : 'Unmatched'}</p>
              </div>
            </div>

            {/* Results table */}
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-right p-2">{isAr ? 'الدفعة' : 'Payment'}</th>
                    <th className="text-right p-2">{isAr ? 'الفاتورة' : 'Invoice'}</th>
                    <th className="text-center p-2">{isAr ? 'الثقة' : 'Confidence'}</th>
                    <th className="text-center p-2">{isAr ? 'النوع' : 'Type'}</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, idx) => (
                    <tr key={idx} className={`border-t hover:bg-accent/30 ${m.confidence < 40 ? 'opacity-60' : ''}`}>
                      <td className="p-2 truncate max-w-[120px]">{m.customerName}</td>
                      <td className="p-2 text-right font-mono">SAR {fmt(m.paymentAmount)}</td>
                      <td className="p-2 text-right font-mono">{m.invoiceAmount > 0 ? `SAR ${fmt(m.invoiceAmount)}` : '—'}</td>
                      <td className="p-2 text-center">{confidenceBadge(m.confidence)}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px]">{m.matchType.replace('_', ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
