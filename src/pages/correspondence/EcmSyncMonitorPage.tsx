import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEcmSyncMonitor } from '@/hooks/useCorrespondence';
import { CorrEcmBadge } from '@/components/correspondence/CorrBadges';
import { format } from 'date-fns';
import { Cloud, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EcmSyncMonitorPage() {
  const { data: failed = [], refetch: refetchFailed } = useEcmSyncMonitor('failed');
  const { data: pending = [], refetch: refetchPending } = useEcmSyncMonitor('pending');

  const Section = ({ title, rows }: { title: string; rows: any[] }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Cloud className="h-4 w-4" /> {title} ({rows.length})</CardTitle>
        <Button variant="outline" size="sm" onClick={() => { refetchFailed(); refetchPending(); }}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">None.</div>}
        {rows.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between text-sm border rounded p-2">
            <div>
              <div className="font-mono text-xs">{r.correspondence_id}</div>
              <div className="text-muted-foreground">{r.operation} • attempt {r.attempt}</div>
              {r.error_message && <div className="text-destructive text-xs">{r.error_message}</div>}
            </div>
            <div className="flex gap-2 items-center">
              <CorrEcmBadge s={r.status} />
              <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'PPp')}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">ECM Sync Monitor</h1>
      <Section title="Failed Sync" rows={failed} />
      <Section title="Pending Sync" rows={pending} />
    </div>
  );
}
