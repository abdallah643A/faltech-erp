import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSyncCheckpoints, useSyncRowStateStats, usePushQueueStats } from '@/hooks/useSyncCheckpoints';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { Loader2, Database, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, Clock, SkipForward } from 'lucide-react';

export function SyncCheckpointPanel() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: checkpoints = [], isLoading: cpLoading } = useSyncCheckpoints();
  const { data: rowStats = {}, isLoading: rsLoading } = useSyncRowStateStats();
  const { data: pushStats = {}, isLoading: psLoading } = usePushQueueStats();

  const isLoading = cpLoading || rsLoading || psLoading;

  const statusColor = (s: string) => {
    switch (s) {
      case 'synced': return 'text-emerald-600';
      case 'pending': return 'text-amber-600';
      case 'failed': return 'text-destructive';
      case 'skipped': return 'text-muted-foreground';
      case 'conflict': return 'text-orange-600';
      default: return 'text-foreground';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'synced': case 'pushed': return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'pending': return <Clock className="h-3 w-3 text-amber-500" />;
      case 'failed': return <XCircle className="h-3 w-3 text-destructive" />;
      case 'skipped': return <SkipForward className="h-3 w-3 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Checkpoints Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            {isAr ? 'نقاط التحقق حسب الكيان' : 'Sync Checkpoints by Entity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : checkpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد نقاط تحقق بعد' : 'No checkpoints recorded yet. Run your first sync.'}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>{isAr ? 'الكيان' : 'Entity'}</TableHead>
                  <TableHead>{isAr ? 'الاتجاه' : 'Direction'}</TableHead>
                  <TableHead>{isAr ? 'نوع النقطة' : 'Type'}</TableHead>
                  <TableHead>{isAr ? 'القيمة' : 'Value'}</TableHead>
                  <TableHead>{isAr ? 'آخر تحديث' : 'Last Updated'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkpoints.map((cp: any) => (
                  <TableRow key={cp.id} className="text-xs">
                    <TableCell className="font-medium">{cp.entity_name?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {cp.direction === 'pull' ? (
                        <Badge variant="outline" className="text-[10px] gap-1"><ArrowDownCircle className="h-3 w-3 text-blue-500" /> Pull</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1"><ArrowUpCircle className="h-3 w-3 text-emerald-500" /> Push</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{cp.checkpoint_type}</Badge></TableCell>
                    <TableCell className="font-mono text-[10px] max-w-[200px] truncate">{cp.checkpoint_value}</TableCell>
                    <TableCell className="text-muted-foreground">{cp.updated_at ? format(new Date(cp.updated_at), 'MMM dd, HH:mm') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Row State Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-blue-500" />
              {isAr ? 'حالة سجلات السحب' : 'Pull Row State Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(rowStats).length === 0 ? (
              <p className="text-xs text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No row state data yet'}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(rowStats).map(([entity, statuses]) => (
                  <div key={entity} className="flex items-center justify-between p-2 rounded border bg-card">
                    <span className="text-xs font-medium">{entity.replace(/_/g, ' ')}</span>
                    <div className="flex gap-2">
                      {Object.entries(statuses as Record<string, number>).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-1">
                          {statusIcon(status)}
                          <span className={`text-[10px] font-mono ${statusColor(status)}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
              {isAr ? 'حالة قائمة الدفع' : 'Push Queue Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pushStats).length === 0 ? (
              <p className="text-xs text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No push queue data yet'}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(pushStats).map(([entity, statuses]) => (
                  <div key={entity} className="flex items-center justify-between p-2 rounded border bg-card">
                    <span className="text-xs font-medium">{entity.replace(/_/g, ' ')}</span>
                    <div className="flex gap-2">
                      {Object.entries(statuses as Record<string, number>).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-1">
                          {statusIcon(status)}
                          <span className={`text-[10px] font-mono ${statusColor(status)}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
