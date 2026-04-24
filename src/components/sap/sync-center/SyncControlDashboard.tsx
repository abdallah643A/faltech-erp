import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSyncAdminDashboard, useSyncAdminJobs } from '@/hooks/useSyncAdmin';
import { AlertTriangle, CheckCircle2, Clock, Activity, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export function SyncControlDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: stats, isLoading } = useSyncAdminDashboard();
  const { data: jobs = [] } = useSyncAdminJobs();

  const recentJobs = (jobs as any[]).slice(0, 5);

  const statCards = [
    { label: isAr ? 'مهام قيد التشغيل' : 'Running Jobs', value: stats?.runningCount || 0, icon: Activity, color: 'text-blue-500' },
    { label: isAr ? 'سجلات معلقة' : 'Pending Records', value: stats?.pendingCount || 0, icon: Clock, color: 'text-amber-500' },
    { label: isAr ? 'سجلات فاشلة' : 'Failed Records', value: stats?.failedCount || 0, icon: AlertTriangle, color: 'text-destructive' },
    { label: isAr ? 'تمت معالجتها اليوم' : 'Processed Today', value: stats?.todayProcessed || 0, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extra stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isAr ? 'مهام اليوم' : 'Jobs Today'}</p>
              <p className="text-xl font-bold">{stats.todayJobCount || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isAr ? 'متوسط المدة' : 'Avg Duration'}</p>
              <p className="text-xl font-bold">{stats.avgDurationMs ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '-'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isAr ? 'فشل اليوم' : 'Failed Today'}</p>
              <p className="text-xl font-bold text-destructive">{stats.todayFailed || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Errors */}
      {stats?.topErrors?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? 'أكثر الأخطاء شيوعاً' : 'Top Error Categories'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topErrors.map((e: any) => (
                <Badge key={e.category} variant="destructive" className="gap-1">
                  {e.category}: {e.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Sync by Entity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'آخر مزامنة حسب الكيان' : 'Last Successful Sync by Entity'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(stats?.entityLastSync || {}).map(([entity, s]: [string, any]) => (
                <div key={entity} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entity.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.completed_at ? format(new Date(s.completed_at), 'MMM dd, HH:mm') : 'Never'}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <Badge variant={s.records_failed > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {(s.records_inserted || 0) + (s.records_updated || 0)} synced
                    </Badge>
                    {s.duration_ms && (
                      <p className="text-muted-foreground mt-1">{(s.duration_ms / 1000).toFixed(1)}s</p>
                    )}
                  </div>
                </div>
              ))}
              {Object.keys(stats?.entityLastSync || {}).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">{isAr ? 'لا توجد بيانات مزامنة بعد' : 'No sync data yet. Run your first sync.'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'المهام الأخيرة' : 'Recent Sync Jobs'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentJobs.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <StatusIcon status={job.status} />
                  <div>
                    <p className="text-sm font-medium">{job.entity_name.replace(/_/g, ' ')} <span className="text-xs text-muted-foreground">#{job.job_number}</span></p>
                    <p className="text-xs text-muted-foreground">{format(new Date(job.created_at), 'MMM dd, HH:mm:ss')}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <Badge variant={job.status === 'completed' ? 'secondary' : job.status === 'failed' ? 'destructive' : 'outline'}>
                    {job.status}
                  </Badge>
                  <p className="text-muted-foreground mt-1">
                    +{job.records_inserted} / ~{job.records_updated} / ✗{job.records_failed}
                  </p>
                </div>
              </div>
            ))}
            {recentJobs.length === 0 && (
              <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مهام بعد' : 'No sync jobs yet'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'completed_with_errors': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'queued': return <Clock className="h-4 w-4 text-amber-500" />;
    default: return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  }
}
