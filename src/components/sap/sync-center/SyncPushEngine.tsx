import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePushQueue, usePushQueueStats, usePushQueueActions } from '@/hooks/useSyncEnhanced';
import { Loader2, RotateCcw, XCircle, Upload, ArrowUpRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const ENTITIES = ['business_partner','item','sales_order','ar_invoice','incoming_payment','purchase_order','journal_entry','ap_invoice_payable'];

export function SyncPushEngine() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const { data: records = [], isLoading } = usePushQueue(entityFilter || undefined, statusFilter || undefined);
  const { data: stats } = usePushQueueStats();
  const { retryFailed, cancelRecord } = usePushQueueActions();

  const statCards = [
    { label: isAr ? 'معلقة' : 'Pending', value: stats?.pending || 0, icon: Clock, color: 'text-amber-500' },
    { label: isAr ? 'قيد المعالجة' : 'Processing', value: stats?.processing || 0, icon: Upload, color: 'text-blue-500' },
    { label: isAr ? 'تم الدفع' : 'Pushed', value: stats?.pushed || 0, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: isAr ? 'فاشلة' : 'Failed', value: stats?.failed || 0, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`h-6 w-6 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter || 'all'} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder={isAr ? 'كل الكيانات' : 'All Entities'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {ENTITIES.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder={isAr ? 'كل الحالات' : 'All Statuses'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {['pending','processing','pushed','failed','cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => retryFailed.mutate({ entity_type: entityFilter || undefined })} disabled={retryFailed.isPending}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إعادة الفاشلة' : 'Retry Failed'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">{isAr ? 'الكيان' : 'Entity'}</th>
                    <th className="p-2 text-left">{isAr ? 'معرف محلي' : 'Local ID'}</th>
                    <th className="p-2 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-2 text-left">{isAr ? 'SAP DocEntry' : 'SAP DocEntry'}</th>
                    <th className="p-2 text-right">{isAr ? 'المحاولات' : 'Attempts'}</th>
                    <th className="p-2 text-left">{isAr ? 'الخطأ' : 'Error'}</th>
                    <th className="p-2 text-left">{isAr ? 'آخر محاولة' : 'Last Attempt'}</th>
                    <th className="p-2">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(records as any[]).map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedRecord(r)}>
                      <td className="p-2 capitalize">{r.entity_type?.replace(/_/g, ' ')}</td>
                      <td className="p-2 font-mono text-xs">{r.local_record_id?.slice(0, 8)}...</td>
                      <td className="p-2 text-center">
                        <Badge variant={r.status === 'pushed' ? 'secondary' : r.status === 'failed' ? 'destructive' : 'outline'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{r.sap_doc_entry || '-'}</td>
                      <td className="p-2 text-right">{r.attempt_count}/{r.max_attempts}</td>
                      <td className="p-2 text-xs text-destructive max-w-[200px] truncate">{r.error_message || '-'}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.last_attempt_at ? format(new Date(r.last_attempt_at), 'MMM dd HH:mm') : '-'}</td>
                      <td className="p-2">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'failed' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retryFailed.mutate({ record_ids: [r.id] })}><RotateCcw className="h-3.5 w-3.5" /></Button>
                          )}
                          {['pending','failed'].includes(r.status) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelRecord.mutate(r.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(records as any[]).length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No push queue records'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isAr ? 'تفاصيل سجل الدفع' : 'Push Record Detail'}</SheetTitle>
          </SheetHeader>
          {selectedRecord && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium capitalize">{selectedRecord.entity_type?.replace(/_/g, ' ')}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedRecord.status}</Badge></div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium">{selectedRecord.priority}</span></div>
                <div><span className="text-muted-foreground">Attempts:</span> <span className="font-medium">{selectedRecord.attempt_count}/{selectedRecord.max_attempts}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Local ID:</span> <span className="font-mono text-xs">{selectedRecord.local_record_id}</span></div>
                {selectedRecord.sap_doc_entry && <div className="col-span-2"><span className="text-muted-foreground">SAP DocEntry:</span> <span className="font-mono">{selectedRecord.sap_doc_entry}</span></div>}
              </div>
              {selectedRecord.error_message && (
                <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                  <p className="text-xs font-medium text-destructive">Error: {selectedRecord.error_category}</p>
                  <p className="text-xs mt-1">{selectedRecord.error_message}</p>
                </div>
              )}
              {selectedRecord.sap_response && (
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium mb-1">SAP Response</p>
                  <pre className="text-[10px] overflow-auto max-h-40">{JSON.stringify(selectedRecord.sap_response, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
