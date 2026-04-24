import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIntegrationStats } from '@/hooks/useIntegrationLayer';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function IntegrationMonitoring() {
  const { data } = useIntegrationStats();
  const events = data?.events.data || [];
  const deliveries = data?.deliveries.data || [];
  const failures = events.filter((e: any) => e.status !== 'success').length + deliveries.filter((d: any) => d.status === 'dead_letter').length;

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Integration Monitoring</h1><p className="text-sm text-muted-foreground">Operational visibility across partner APIs, sync jobs, templates, and webhook delivery</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric title="Recent Events" value={events.length} /><Metric title="Recent Deliveries" value={deliveries.length} /><Metric title="Open Failures" value={failures} alert /><Metric title="DLQ" value={deliveries.filter((d: any) => d.is_dead_letter).length} alert /></div>
    <Card><CardHeader><CardTitle className="text-sm">Event Stream</CardTitle></CardHeader><CardContent className="space-y-2">{events.map((e: any) => <div key={e.id} className="flex items-center gap-3 p-3 border rounded-md">{e.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}<div className="flex-1"><p className="font-medium text-sm">{e.integration_name} · {e.event_type}</p><p className="text-xs text-muted-foreground">{e.direction} · {e.record_type || 'n/a'}</p></div><Badge variant={e.status === 'success' ? 'default' : 'destructive'}>{e.status}</Badge></div>)}{!events.length && <p className="text-sm text-muted-foreground text-center py-8">No monitor events yet</p>}</CardContent></Card>
  </div>;
}
function Metric({ title, value, alert }: any) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{title}</p><p className={alert && value > 0 ? 'text-2xl font-bold text-destructive' : 'text-2xl font-bold'}>{value}</p></CardContent></Card>; }
