import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Shield, Layout, Download, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/measurementExport';

interface Props {
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

export default function ReportingOverview({ reporting }: Props) {
  const reports = reporting.reports.data || [];
  const logs = reporting.auditLogs.data || [];
  const schedules = reporting.schedules.data || [];
  const templates = reporting.templates.data || [];

  const totalExports = logs.filter(l => l.action === 'export').length;
  const totalSize = reports.reduce((a, r) => a + (r.file_size || 0), 0);
  const activeSchedules = schedules.filter(s => s.is_active).length;
  const recentLogs = logs.slice(0, 8);

  const stats = [
    { icon: Download, label: 'Total Exports', value: totalExports, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: FileText, label: 'Reports', value: reports.length, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Clock, label: 'Active Schedules', value: activeSchedules, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Layout, label: 'Templates', value: templates.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Shield, label: 'Audit Entries', value: logs.length, color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Activity, label: 'Storage Used', value: formatFileSize(totalSize), color: 'text-sky-600', bg: 'bg-sky-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs w-16 justify-center">
                      {log.status}
                    </Badge>
                    <div className="flex-1 truncate">
                      <span className="font-medium">{log.user_name || 'System'}</span>
                      {' — '}
                      <span className="text-muted-foreground">{log.action}</span>
                      {log.export_format && (
                        <Badge variant="outline" className="ml-1 text-xs">{log.export_format.toUpperCase()}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(log.created_at), 'dd MMM HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reports generated yet</p>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 8).map(r => (
                  <div key={r.id} className="flex items-center gap-3 text-sm">
                    <Badge variant="outline" className="text-xs w-14 justify-center uppercase">{r.format}</Badge>
                    <div className="flex-1 truncate font-medium">{r.title}</div>
                    <span className="text-xs text-muted-foreground">
                      {r.file_size ? formatFileSize(r.file_size) : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(r.created_at), 'dd MMM')}
                    </span>
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
