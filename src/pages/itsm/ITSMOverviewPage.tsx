import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, AlertTriangle, Clock, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useServiceMetrics, useServiceTickets, useEscalations } from '@/hooks/useServiceITSM';
import { Badge } from '@/components/ui/badge';

export default function ITSMOverviewPage() {
  const { data: m } = useServiceMetrics(30);
  const { data: tickets = [] } = useServiceTickets({});
  const { data: escs = [] } = useEscalations('open');

  const tiles = [
    { label: 'Open tickets', value: m?.open ?? 0, icon: Headphones, color: 'text-blue-500', href: '/itsm/tickets' },
    { label: 'SLA breached', value: m?.breached ?? 0, icon: AlertTriangle, color: 'text-red-500', href: '/itsm/escalations' },
    { label: 'Avg first response', value: `${m?.avg_first_response_min ?? 0}m`, icon: Clock, color: 'text-amber-500', href: '/itsm/analytics' },
    { label: 'Avg resolution', value: `${m?.avg_resolution_min ?? 0}m`, icon: CheckCircle, color: 'text-emerald-500', href: '/itsm/analytics' },
    { label: 'Breach rate', value: `${m?.breach_rate ?? 0}%`, icon: TrendingUp, color: 'text-purple-500', href: '/itsm/analytics' },
    { label: 'Open escalations', value: escs.length, icon: Users, color: 'text-orange-500', href: '/itsm/escalations' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Headphones className="h-6 w-6" />Service & ITSM</h1>
        <p className="text-muted-foreground">Ticket lifecycle, SLA tracking, field service & analytics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} to={t.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="text-2xl font-bold mt-1">{t.value}</p>
                  </div>
                  <t.icon className={`h-6 w-6 ${t.color}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent tickets</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tickets.slice(0, 8).map((t: any) => (
              <Link key={t.id} to={`/itsm/tickets/${t.id}`} className="flex items-center justify-between border-b py-2 hover:bg-muted/40 px-2 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                    <span className="font-medium text-sm">{t.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.customer_name || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={t.priority === 'critical' ? 'destructive' : 'secondary'}>{t.priority}</Badge>
                  <Badge variant="outline">{t.status}</Badge>
                  {t.is_breached && <Badge variant="destructive">SLA</Badge>}
                </div>
              </Link>
            ))}
            {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
