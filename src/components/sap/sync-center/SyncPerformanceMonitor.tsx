import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSyncAdminPerformance, useSyncAdminJobs } from '@/hooks/useSyncAdmin';
import { Loader2, TrendingUp, Clock, Zap, Database } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export function SyncPerformanceMonitor() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: perfData, isLoading: perfLoading } = useSyncAdminPerformance();
  const { data: jobs = [], isLoading: jobsLoading } = useSyncAdminJobs();

  const summary = perfData?.summary || [];
  const allJobs = jobs as any[];

  // Chart data from summary
  const durationChartData = summary
    .map((s: any) => ({
      entity: s.entity.replace(/_/g, ' ').substring(0, 15),
      avgDuration: Math.round(s.avg_duration_ms / 1000),
      throughput: s.throughput_per_min,
      errorRate: s.error_rate,
    }))
    .slice(0, 10);

  // Duration trend (last 20 jobs)
  const trendData = allJobs
    .filter((j: any) => j.status === 'completed' && j.duration_ms)
    .slice(0, 20)
    .reverse()
    .map((j: any) => ({
      job: j.job_number?.replace('JOB-', '').slice(-6),
      duration: Math.round((j.duration_ms || 0) / 1000),
      records: (j.records_inserted || 0) + (j.records_updated || 0),
    }));

  const isLoading = perfLoading || jobsLoading;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? 'متوسط المدة' : 'Avg Duration'}</span></div>
                <p className="text-xl font-bold">
                  {summary.length > 0 ? `${Math.round(summary.reduce((s: number, d: any) => s + d.avg_duration_ms, 0) / summary.length / 1000)}s` : '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Database className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? 'إجمالي التشغيلات' : 'Total Runs'}</span></div>
                <p className="text-xl font-bold">{summary.reduce((s: number, d: any) => s + d.runs, 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? 'الأبطأ' : 'Slowest Entity'}</span></div>
                <p className="text-sm font-bold truncate">{durationChartData[0]?.entity || '-'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? 'أعلى إنتاجية' : 'Best Throughput'}</span></div>
                <p className="text-sm font-bold truncate">
                  {summary.length > 0 ? `${Math.max(...summary.map((d: any) => d.throughput_per_min))} rec/min` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Duration by Entity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isAr ? 'متوسط المدة حسب الكيان (ثانية)' : 'Avg Duration by Entity (seconds)'}</CardTitle>
            </CardHeader>
            <CardContent>
              {durationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={durationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="entity" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDuration" fill="hsl(var(--primary))" name="Avg Duration (s)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{isAr ? 'لا توجد بيانات أداء بعد' : 'No performance data yet'}</p>
              )}
            </CardContent>
          </Card>

          {/* Duration Trend */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{isAr ? 'اتجاه المدة' : 'Duration Trend (Recent Jobs)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="job" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="duration" stroke="hsl(var(--primary))" name="Duration (s)" />
                    <Line yAxisId="right" type="monotone" dataKey="records" stroke="hsl(var(--accent-foreground))" name="Records" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Entity Performance Table */}
          {summary.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{isAr ? 'أداء الكيانات' : 'Entity Performance Summary'}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">Entity</th>
                        <th className="p-2 text-right">Avg Duration</th>
                        <th className="p-2 text-right">API Latency</th>
                        <th className="p-2 text-right">Throughput</th>
                        <th className="p-2 text-right">Total Records</th>
                        <th className="p-2 text-right">Runs</th>
                        <th className="p-2 text-right">Error Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s: any) => (
                        <tr key={s.entity} className="border-b">
                          <td className="p-2 capitalize">{s.entity.replace(/_/g, ' ')}</td>
                          <td className="p-2 text-right">{(s.avg_duration_ms / 1000).toFixed(1)}s</td>
                          <td className="p-2 text-right">{(s.avg_api_response_ms / 1000).toFixed(1)}s</td>
                          <td className="p-2 text-right">{s.throughput_per_min} rec/min</td>
                          <td className="p-2 text-right">{s.total_records.toLocaleString()}</td>
                          <td className="p-2 text-right">{s.runs}</td>
                          <td className="p-2 text-right">
                            <Badge variant={s.error_rate > 10 ? 'destructive' : 'outline'}>{s.error_rate}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
