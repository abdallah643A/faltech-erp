import { useState } from 'react';
import { useRMAs, type ARReturn } from '@/hooks/useRMA';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, FileText, RotateCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusVariant: Record<ARReturn['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'secondary',
  approved: 'default',
  received: 'default',
  credited: 'outline',
  cancelled: 'destructive',
};

const labels = {
  en: {
    title: 'Returns / RMA Workbench',
    subtitle: 'Approve customer returns and auto-create AR Credit Memos.',
    all: 'All', open: 'Open', approved: 'Approved', received: 'Received', credited: 'Credited', cancelled: 'Cancelled',
    rma: 'RMA #', customer: 'Customer', reason: 'Reason', total: 'Total', status: 'Status', date: 'Date', actions: 'Actions',
    approveCredit: 'Approve & Credit', cancel: 'Cancel', viewCM: 'View Credit Memo',
    confirmTitle: 'Approve RMA & create credit memo?',
    confirmDesc: 'This will mark the RMA as approved and automatically generate an AR Credit Memo for the same customer and lines. The action is logged in the audit trail.',
    confirm: 'Yes, Approve & Credit', noData: 'No returns found.', loading: 'Loading…',
  },
  ar: {
    title: 'مرتجعات RMA',
    subtitle: 'اعتماد مرتجعات العملاء وإنشاء إشعارات دائنة تلقائياً.',
    all: 'الكل', open: 'مفتوح', approved: 'معتمد', received: 'مستلم', credited: 'مدين', cancelled: 'ملغي',
    rma: 'رقم المرتجع', customer: 'العميل', reason: 'السبب', total: 'المبلغ', status: 'الحالة', date: 'التاريخ', actions: 'إجراءات',
    approveCredit: 'اعتماد وإصدار إشعار دائن', cancel: 'إلغاء', viewCM: 'عرض الإشعار الدائن',
    confirmTitle: 'اعتماد المرتجع وإنشاء الإشعار الدائن؟',
    confirmDesc: 'سيتم اعتماد المرتجع وإنشاء إشعار دائن تلقائياً بنفس بنود العميل، وسيُسجَّل الإجراء في سجل التدقيق.',
    confirm: 'نعم، اعتمد', noData: 'لا توجد مرتجعات.', loading: 'جارٍ التحميل…',
  },
};

export default function ReturnsRmaWorkbench() {
  const { language } = useLanguage();
  const t = labels[language === 'ar' ? 'ar' : 'en'];
  const [tab, setTab] = useState<ARReturn['status'] | 'all'>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data, isLoading, approveAndCredit, cancel } = useRMAs(tab === 'all' ? undefined : tab);

  const onApprove = (id: string) => setConfirmId(id);
  const doApprove = () => {
    if (!confirmId) return;
    approveAndCredit.mutate(confirmId, { onSettled: () => setConfirmId(null) });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RotateCw className="h-5 w-5" />{t.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="open">{t.open}</TabsTrigger>
              <TabsTrigger value="approved">{t.approved}</TabsTrigger>
              <TabsTrigger value="received">{t.received}</TabsTrigger>
              <TabsTrigger value="credited">{t.credited}</TabsTrigger>
              <TabsTrigger value="cancelled">{t.cancelled}</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4"><AlertCircle className="h-4 w-4" />{t.loading}</div>
              ) : !data || data.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{t.noData}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.rma}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.customer}</TableHead>
                      <TableHead>{t.reason}</TableHead>
                      <TableHead className="text-right">{t.total}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.doc_num}</TableCell>
                        <TableCell>{format(new Date(r.doc_date), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{r.customer_code}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.return_reason || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.total.toLocaleString()} {r.currency}</TableCell>
                        <TableCell><Badge variant={statusVariant[r.status]}>{t[r.status]}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(r.status === 'open' || r.status === 'received') && (
                              <Button size="sm" onClick={() => onApprove(r.id)} className="gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />{t.approveCredit}
                              </Button>
                            )}
                            {r.status === 'open' && (
                              <Button size="sm" variant="outline" onClick={() => cancel.mutate(r.id)} className="gap-1">
                                <XCircle className="h-3.5 w-3.5" />{t.cancel}
                              </Button>
                            )}
                            {r.credit_memo_id && (
                              <Button size="sm" variant="ghost" asChild className="gap-1">
                                <a href={`/sales/credit-memo?id=${r.credit_memo_id}`}><FileText className="h-3.5 w-3.5" />{t.viewCM}</a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>{t.confirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>{t.cancel}</Button>
            <Button onClick={doApprove} disabled={approveAndCredit.isPending}>{t.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
