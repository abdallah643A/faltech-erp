import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSOfflineSync } from '@/hooks/usePOSOfflineSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, WifiOff, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, Clock, HardDrive, Upload, Download } from 'lucide-react';

export default function POSOfflineSync() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const {
    online, syncing, serverTransactions, syncLogs, productCache, loadingServer,
    syncPendingTransactions, refreshProductCache, getLocalTransactions,
  } = usePOSOfflineSync();

  const [localTx, setLocalTx] = useState<any[]>([]);
  const [tab, setTab] = useState('queue');

  useEffect(() => {
    getLocalTransactions().then(setLocalTx);
  }, [syncing]);

  const pendingCount = localTx.filter(t => t.syncStatus === 'pending').length;
  const failedCount = localTx.filter(t => t.syncStatus === 'failed').length;
  const conflictCount = localTx.filter(t => t.syncStatus === 'conflict').length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {online ? <Wifi className="h-6 w-6 text-success" /> : <WifiOff className="h-6 w-6 text-destructive" />}
            {t('POS Offline Sync', 'مزامنة نقاط البيع غير المتصلة')}
          </h1>
          <p className="text-muted-foreground">
            {t('Manage offline transactions, product cache, and sync status', 'إدارة المعاملات غير المتصلة وذاكرة التخزين المؤقت')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={online ? 'default' : 'destructive'} className="text-sm">
            {online ? t('Online', 'متصل') : t('Offline', 'غير متصل')}
          </Badge>
          <Button size="sm" onClick={syncPendingTransactions} disabled={syncing || !online}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {t('Sync Now', 'مزامنة الآن')}
          </Button>
          <Button size="sm" variant="outline" onClick={refreshProductCache} disabled={!online}>
            <Download className="h-4 w-4 mr-2" />
            {t('Refresh Cache', 'تحديث الذاكرة')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('Pending', 'معلق'), value: pendingCount, icon: Clock, color: 'text-warning' },
          { label: t('Failed', 'فشل'), value: failedCount, icon: XCircle, color: 'text-destructive' },
          { label: t('Conflicts', 'تعارضات'), value: conflictCount, icon: AlertTriangle, color: 'text-orange-500' },
          { label: t('Synced (Server)', 'تمت المزامنة'), value: serverTransactions?.length || 0, icon: CheckCircle, color: 'text-success' },
          { label: t('Cached Products', 'المنتجات المخزنة'), value: productCache?.length || 0, icon: HardDrive, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="queue">{t('Sync Queue', 'طابور المزامنة')} ({localTx.length})</TabsTrigger>
          <TabsTrigger value="server">{t('Server Log', 'سجل الخادم')}</TabsTrigger>
          <TabsTrigger value="sync-history">{t('Sync History', 'تاريخ المزامنة')}</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card>
            <CardContent className="p-0">
              {localTx.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('No queued transactions', 'لا توجد معاملات في الطابور')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ID', 'المعرف')}</TableHead>
                      <TableHead>{t('Type', 'النوع')}</TableHead>
                      <TableHead>{t('Time', 'الوقت')}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                      <TableHead>{t('Attempts', 'المحاولات')}</TableHead>
                      <TableHead>{t('Error', 'الخطأ')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localTx.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.id.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(tx.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={tx.syncStatus === 'synced' ? 'default' : tx.syncStatus === 'failed' ? 'destructive' : 'secondary'}>
                            {tx.syncStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.syncAttempts}</TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">{tx.errorMessage || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <Card>
            <CardContent className="p-0">
              {loadingServer ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" />{t('Loading...', 'جار التحميل...')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Local ID', 'المعرف المحلي')}</TableHead>
                      <TableHead>{t('Type', 'النوع')}</TableHead>
                      <TableHead>{t('Local Time', 'الوقت المحلي')}</TableHead>
                      <TableHead>{t('Synced At', 'وقت المزامنة')}</TableHead>
                      <TableHead>{t('Status', 'الحالة')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(serverTransactions || []).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.local_transaction_id?.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline">{tx.transaction_type}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(tx.local_timestamp).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{tx.synced_at ? new Date(tx.synced_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.sync_status === 'synced' ? 'default' : 'secondary'}>{tx.sync_status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Type', 'النوع')}</TableHead>
                    <TableHead>{t('Status', 'الحالة')}</TableHead>
                    <TableHead>{t('Total', 'الإجمالي')}</TableHead>
                    <TableHead>{t('Synced', 'تمت المزامنة')}</TableHead>
                    <TableHead>{t('Failed', 'فشل')}</TableHead>
                    <TableHead>{t('Conflicts', 'تعارضات')}</TableHead>
                    <TableHead>{t('Started', 'البدء')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(syncLogs || []).map(log => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">{log.sync_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>{log.total_records}</TableCell>
                      <TableCell className="text-success">{log.synced_records}</TableCell>
                      <TableCell className="text-destructive">{log.failed_records}</TableCell>
                      <TableCell>{log.conflict_records}</TableCell>
                      <TableCell className="text-xs">{new Date(log.started_at).toLocaleString()}</TableCell>
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
