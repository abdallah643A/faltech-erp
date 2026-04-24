import { useState } from 'react';
import { useCreditOverrides, type CreditOverrideRequest } from '@/hooks/useCreditOverrides';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const labels = {
  en: {
    title: 'Credit Override Approvals',
    subtitle: 'Approve or reject credit-limit override requests for blocked sales orders.',
    all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    requestedBy: 'Requested by', reason: 'Reason', current: 'Current limit', requested: 'Requested limit',
    status: 'Status', date: 'Date', actions: 'Actions', approve: 'Approve', reject: 'Reject',
    rejectTitle: 'Reject override request', rejectReason: 'Reason for rejection', cancel: 'Cancel', confirmReject: 'Confirm rejection',
    noData: 'No override requests.',
  },
  ar: {
    title: 'موافقات تجاوز سقف الائتمان',
    subtitle: 'اعتماد أو رفض طلبات تجاوز سقف الائتمان للطلبات المحجوبة.',
    all: 'الكل', pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض',
    requestedBy: 'مقدم الطلب', reason: 'السبب', current: 'السقف الحالي', requested: 'السقف المطلوب',
    status: 'الحالة', date: 'التاريخ', actions: 'إجراءات', approve: 'اعتماد', reject: 'رفض',
    rejectTitle: 'رفض طلب التجاوز', rejectReason: 'سبب الرفض', cancel: 'إلغاء', confirmReject: 'تأكيد الرفض',
    noData: 'لا توجد طلبات.',
  },
};

const statusVariant: Record<CreditOverrideRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary', approved: 'default', rejected: 'destructive',
};

export default function CreditOverrideInbox() {
  const { language } = useLanguage();
  const t = labels[language === 'ar' ? 'ar' : 'en'];
  const [tab, setTab] = useState<'all' | CreditOverrideRequest['status']>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { data, isLoading, approve, reject } = useCreditOverrides(tab === 'all' ? undefined : tab);

  const doReject = () => {
    if (!rejectId) return;
    reject.mutate({ id: rejectId, reason: rejectReason }, {
      onSettled: () => { setRejectId(null); setRejectReason(''); },
    });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />{t.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">{t.all}</TabsTrigger>
              <TabsTrigger value="pending">{t.pending}</TabsTrigger>
              <TabsTrigger value="approved">{t.approved}</TabsTrigger>
              <TabsTrigger value="rejected">{t.rejected}</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="text-muted-foreground p-4">…</div>
              ) : !data || data.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{t.noData}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.requestedBy}</TableHead>
                      <TableHead>{t.reason}</TableHead>
                      <TableHead className="text-right">{t.current}</TableHead>
                      <TableHead className="text-right">{t.requested}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell className="text-sm">{r.requested_by_name || '—'}</TableCell>
                        <TableCell className="max-w-md truncate" title={r.reason}>{r.reason}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.current_limit?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.requested_limit?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell><Badge variant={statusVariant[r.status]}>{t[r.status]}</Badge></TableCell>
                        <TableCell className="text-right">
                          {r.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => approve.mutate(r.id)} className="gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />{t.approve}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejectId(r.id)} className="gap-1">
                                <XCircle className="h-3.5 w-3.5" />{t.reject}
                              </Button>
                            </div>
                          )}
                          {r.status === 'rejected' && r.rejection_reason && (
                            <span className="text-xs text-muted-foreground italic">{r.rejection_reason}</span>
                          )}
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

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t.rejectReason}</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>{t.cancel}</Button>
            <Button variant="destructive" onClick={doReject} disabled={!rejectReason.trim() || reject.isPending}>{t.confirmReject}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
