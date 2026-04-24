import { useState } from 'react';
import { useMatchExceptions, useMatchOverrideRequests, type MatchException } from '@/hooks/useMatchExceptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const sevColor: Record<MatchException['severity'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline', medium: 'secondary', high: 'default', critical: 'destructive',
};

export default function MatchExceptionWorkbench() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'exceptions' | 'overrides'>('exceptions');
  const [reqInvoiceId, setReqInvoiceId] = useState<string | null>(null);
  const [reqReason, setReqReason] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: exceptions, isLoading, requestOverride } = useMatchExceptions();
  const { data: overrides, approve, reject } = useMatchOverrideRequests();

  const submitOverride = () => {
    if (!reqInvoiceId) return;
    requestOverride.mutate(
      { invoiceId: reqInvoiceId, reason: reqReason },
      { onSettled: () => { setReqInvoiceId(null); setReqReason(''); } },
    );
  };
  const doReject = () => {
    if (!rejectId) return;
    reject.mutate({ id: rejectId, reason: rejectReason }, { onSettled: () => { setRejectId(null); setRejectReason(''); } });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />{t('proc.match.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('proc.match.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="exceptions">{t('proc.match.tabExceptions')}</TabsTrigger>
              <TabsTrigger value="overrides">{t('proc.match.tabOverrides')}</TabsTrigger>
            </TabsList>

            <TabsContent value="exceptions" className="mt-4">
              {isLoading ? <div className="p-4 text-muted-foreground">…</div> : !exceptions?.length ? (
                <div className="text-center text-muted-foreground py-8">{t('proc.match.noExceptions')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('common.type')}</TableHead>
                      <TableHead>{t('proc.match.colSeverity')}</TableHead>
                      <TableHead className="text-right">{t('proc.match.colVariance')}</TableHead>
                      <TableHead className="text-right">{t('proc.match.colExpected')}</TableHead>
                      <TableHead className="text-right">{t('proc.match.colActual')}</TableHead>
                      <TableHead>{t('proc.match.colReason')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptions.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{format(new Date(e.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell><Badge variant="outline">{e.exception_type.replace('_', ' ')}</Badge></TableCell>
                        <TableCell><Badge variant={sevColor[e.severity]}>{e.severity}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{e.variance_percent != null ? `${e.variance_percent.toFixed(2)}%` : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.expected_value?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.actual_value?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate" title={e.reason ?? ''}>{e.reason}</TableCell>
                        <TableCell><Badge variant={e.status === 'open' ? 'destructive' : 'outline'}>{e.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {e.status === 'open' && e.ap_invoice_id && (
                            <Button size="sm" variant="outline" onClick={() => setReqInvoiceId(e.ap_invoice_id)} className="gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />{t('proc.match.requestOverride')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="overrides" className="mt-4">
              {!overrides?.length ? (
                <div className="text-center text-muted-foreground py-8">{t('proc.match.noOverrides')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.created')}</TableHead>
                      <TableHead>{t('proc.match.requestedBy')}</TableHead>
                      <TableHead>{t('proc.match.colReason')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{format(new Date(o.requested_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell className="text-sm">{o.requested_by_name || '—'}</TableCell>
                        <TableCell className="max-w-md truncate" title={o.reason}>{o.reason}</TableCell>
                        <TableCell><Badge variant={o.status === 'pending' ? 'secondary' : o.status === 'approved' ? 'default' : 'destructive'}>{o.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {o.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => approve.mutate(o.id)} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t('proc.match.approve')}</Button>
                              <Button size="sm" variant="destructive" onClick={() => setRejectId(o.id)} className="gap-1"><XCircle className="h-3.5 w-3.5" />{t('proc.match.reject')}</Button>
                            </div>
                          )}
                          {o.status === 'rejected' && o.rejection_reason && (
                            <span className="text-xs text-muted-foreground italic">{o.rejection_reason}</span>
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

      <Dialog open={!!reqInvoiceId} onOpenChange={(o) => !o && setReqInvoiceId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('proc.match.requestOverrideTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>{t('proc.match.colReason')}</Label><Textarea rows={4} value={reqReason} onChange={(e) => setReqReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqInvoiceId(null)}>{t('common.cancel') as any}</Button>
            <Button onClick={submitOverride} disabled={!reqReason.trim()}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('proc.match.rejectTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>{t('proc.match.rejectionReason')}</Label><Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>{t('common.cancel') as any}</Button>
            <Button variant="destructive" onClick={doReject} disabled={!rejectReason.trim()}>{t('proc.match.confirmReject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
