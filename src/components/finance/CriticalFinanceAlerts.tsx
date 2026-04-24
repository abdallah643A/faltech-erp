import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, AlertTriangle, TrendingDown, Clock, CheckCircle, Settings, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  type: 'receivable_overdue' | 'cash_low' | 'payable_due' | 'high_concentration';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  amount?: number;
  relatedId?: string;
  timestamp: Date;
}

export function CriticalFinanceAlerts() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [cashThreshold, setCashThreshold] = useState(50000);
  const [agingThresholdDays, setAgingThresholdDays] = useState(90);
  const [showSettings, setShowSettings] = useState(false);

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['critical-alerts-ar'],
    queryFn: async () => {
      const { data } = await supabase.from('ar_invoices').select('id, total, balance_due, status, doc_date, doc_due_date, customer_name, doc_num').limit(1000);
      return data || [];
    },
    refetchInterval: 60000, // Real-time: refetch every minute
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['critical-alerts-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('id, total, status, doc_date, doc_due_date, vendor_name').limit(1000);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['critical-alerts-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('incoming_payments').select('id, total_amount, doc_date, status');
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  const alerts = useMemo<Alert[]>(() => {
    const now = new Date();
    const result: Alert[] = [];

    // 1. Receivables exceeding aging threshold
    const overdueInvoices = arInvoices.filter(i => {
      if ((i.balance_due || 0) <= 0) return false;
      const dueDate = i.doc_due_date || i.doc_date;
      return differenceInDays(now, new Date(dueDate)) > agingThresholdDays;
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);
      result.push({
        id: `overdue-batch-${agingThresholdDays}`,
        type: 'receivable_overdue',
        severity: 'critical',
        title: isAr ? `${overdueInvoices.length} فاتورة متأخرة أكثر من ${agingThresholdDays} يوم` : `${overdueInvoices.length} invoices overdue beyond ${agingThresholdDays} days`,
        description: isAr
          ? `إجمالي المبالغ المتأخرة: SAR ${totalOverdue.toLocaleString()}`
          : `Total overdue amount: SAR ${totalOverdue.toLocaleString()}. Immediate collection action recommended.`,
        amount: totalOverdue,
        timestamp: now,
      });

      // Individual critical invoices > 100K
      overdueInvoices.filter(i => (i.balance_due || 0) > 100000).forEach(inv => {
        const days = differenceInDays(now, new Date(inv.doc_due_date || inv.doc_date));
        result.push({
          id: `overdue-${inv.id}`,
          type: 'receivable_overdue',
          severity: 'critical',
          title: `${inv.customer_name} - ${days} days overdue`,
          description: `Invoice #${inv.doc_num}: SAR ${(inv.balance_due || 0).toLocaleString()} outstanding`,
          amount: inv.balance_due || 0,
          relatedId: inv.id,
          timestamp: now,
        });
      });
    }

    // 2. Cash flow below threshold
    const totalCashIn = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalCashOut = apInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0);
    const netCash = totalCashIn - totalCashOut;

    if (netCash < cashThreshold) {
      result.push({
        id: 'cash-low',
        type: 'cash_low',
        severity: netCash < 0 ? 'critical' : 'warning',
        title: isAr ? 'تحذير: انخفاض التدفق النقدي' : 'Cash Flow Below Threshold',
        description: isAr
          ? `الرصيد الحالي SAR ${netCash.toLocaleString()} أقل من الحد الأدنى SAR ${cashThreshold.toLocaleString()}`
          : `Net cash position SAR ${netCash.toLocaleString()} is below minimum threshold of SAR ${cashThreshold.toLocaleString()}`,
        amount: netCash,
        timestamp: now,
      });
    }

    // 3. Payables due within 7 days
    const urgentPayables = apInvoices.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (!i.doc_due_date) return false;
      const daysUntilDue = differenceInDays(new Date(i.doc_due_date), now);
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });

    if (urgentPayables.length > 0) {
      const urgentTotal = urgentPayables.reduce((s, i) => s + (i.total || 0), 0);
      result.push({
        id: 'payables-urgent',
        type: 'payable_due',
        severity: 'warning',
        title: isAr ? `${urgentPayables.length} دفعات مستحقة خلال 7 أيام` : `${urgentPayables.length} payments due within 7 days`,
        description: isAr
          ? `إجمالي المبالغ المستحقة: SAR ${urgentTotal.toLocaleString()}`
          : `Total amount due: SAR ${urgentTotal.toLocaleString()}`,
        amount: urgentTotal,
        timestamp: now,
      });
    }

    // 4. High customer concentration risk
    const customerTotals: Record<string, number> = {};
    arInvoices.filter(i => (i.balance_due || 0) > 0).forEach(i => {
      customerTotals[i.customer_name] = (customerTotals[i.customer_name] || 0) + (i.balance_due || 0);
    });
    const totalAR = Object.values(customerTotals).reduce((s, v) => s + v, 0);
    Object.entries(customerTotals).forEach(([name, amount]) => {
      const pct = totalAR > 0 ? (amount / totalAR) * 100 : 0;
      if (pct > 30) {
        result.push({
          id: `concentration-${name}`,
          type: 'high_concentration',
          severity: 'info',
          title: isAr ? `تركيز عالي: ${name}` : `High Concentration: ${name}`,
          description: `${pct.toFixed(0)}% of total receivables (SAR ${amount.toLocaleString()})`,
          amount,
          timestamp: now,
        });
      }
    });

    return result;
  }, [arInvoices, apInvoices, payments, cashThreshold, agingThresholdDays, isAr]);

  const activeAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (s === 'warning') return <Clock className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-blue-500" />;
  };

  const severityBadge = (s: string) => {
    if (s === 'critical') return <Badge variant="destructive" className="text-[10px]">{isAr ? 'حرج' : 'Critical'}</Badge>;
    if (s === 'warning') return <Badge className="text-[10px] bg-yellow-500/20 text-yellow-700 border-yellow-300">{isAr ? 'تحذير' : 'Warning'}</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{isAr ? 'معلومات' : 'Info'}</Badge>;
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-destructive" />
            {isAr ? 'التنبيهات المالية الحرجة' : 'Critical Finance Alerts'}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] animate-pulse">{criticalCount}</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="text-[10px] bg-yellow-500/20 text-yellow-700">{warningCount}</Badge>
            )}
          </CardTitle>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? 'إعدادات التنبيهات' : 'Alert Thresholds'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{isAr ? 'الحد الأدنى للتدفق النقدي (SAR)' : 'Minimum Cash Flow Threshold (SAR)'}</label>
                  <Input type="number" value={cashThreshold} onChange={e => setCashThreshold(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-sm font-medium">{isAr ? 'حد التقادم (أيام)' : 'Aging Alert Threshold (days)'}</label>
                  <Input type="number" value={agingThresholdDays} onChange={e => setAgingThresholdDays(Number(e.target.value))} />
                </div>
                <Button onClick={() => { setShowSettings(false); toast({ title: 'Thresholds updated' }); }} className="w-full">
                  {isAr ? 'حفظ' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {isAr ? 'لا توجد تنبيهات حرجة' : 'No critical alerts – all clear!'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activeAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                alert.severity === 'critical' ? 'bg-destructive/5 border-destructive/20' :
                alert.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200' :
                'bg-muted/30 border-border'
              }`}>
                {severityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold truncate">{alert.title}</span>
                    {severityBadge(alert.severity)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => setDismissedIds(prev => new Set([...prev, alert.id]))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
