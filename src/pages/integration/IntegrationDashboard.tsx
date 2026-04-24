import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIntegrationStats } from '@/hooks/useIntegrationLayer';
import { Activity, KeyRound, Webhook, FileCode2, Map, PlugZap, BookOpen, DatabaseZap } from 'lucide-react';
import { Link } from 'react-router-dom';

const links = [
  { title: 'API Management', href: '/integration/api-management', icon: KeyRound, desc: 'API keys, OAuth clients, scopes, rate limits' },
  { title: 'Webhook Events', href: '/integration/webhooks', icon: Webhook, desc: 'Topics, subscriptions, retry, DLQ, replay' },
  { title: 'Templates & Mappings', href: '/integration/templates', icon: Map, desc: 'Import/export templates and field governance' },
  { title: 'Connector Templates', href: '/integration/connectors', icon: PlugZap, desc: 'Banking, e-commerce, payroll, eSign, BI' },
  { title: 'Interface Docs', href: '/integration/docs', icon: BookOpen, desc: 'Versioned partner-ready documentation' },
];

export default function IntegrationDashboard() {
  const { data } = useIntegrationStats();
  const failures = (data?.deliveries.data || []).filter((d: any) => d.status === 'dead_letter' || d.status === 'retrying').length;
  const recent = data?.events.data || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Integration Control Tower</h1>
        <p className="text-sm text-muted-foreground">Open APIs, webhooks, connector governance, monitoring, and interface documentation</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric title="API Clients" value={data?.clients.count || 0} icon={KeyRound} />
        <Metric title="Webhook Subs" value={data?.subs.count || 0} icon={Webhook} />
        <Metric title="Failures / DLQ" value={failures} icon={DatabaseZap} alert={failures > 0} />
        <Metric title="Templates" value={data?.templates.count || 0} icon={FileCode2} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => (
          <Card key={l.href}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><l.icon className="h-5 w-5 text-primary" /></div>
                <div><h3 className="font-semibold">{l.title}</h3><p className="text-xs text-muted-foreground">{l.desc}</p></div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full"><Link to={l.href}>Open</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Integration Events</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recent.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 p-3 border rounded-md">
              <Badge variant={e.status === 'success' ? 'default' : 'destructive'}>{e.status}</Badge>
              <div className="flex-1"><p className="text-sm font-medium">{e.event_type}</p><p className="text-xs text-muted-foreground">{e.direction}</p></div>
              <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!recent.length && <p className="text-sm text-muted-foreground text-center py-8">No integration events yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon: Icon, alert }: any) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-primary" /></div><p className={alert ? 'text-2xl font-bold text-destructive' : 'text-2xl font-bold'}>{value}</p></CardContent></Card>;
}
