import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTenantAnalytics } from '@/hooks/usePortalEnhanced';
import { useSaasTenants } from '@/hooks/useSaasAdmin';
import { BarChart3 } from 'lucide-react';

export default function TenantAnalyticsDashboard() {
  const { data: tenants = [] } = useSaasTenants();
  const [tenantId, setTenantId] = useState('');
  const { data } = useTenantAnalytics(tenantId || undefined);

  const seats = data?.seats ?? [];
  const activeSeats = seats.filter((s: any) => s.status === 'active').length;
  const sub: any = (data?.subscriptions ?? [])[0];
  const maxSeats = (sub?.max_seats as number) || 0;
  const utilization = maxSeats > 0 ? (activeSeats / maxSeats) * 100 : 0;
  const eventsByType = (data?.activity ?? []).reduce((acc: any, e: any) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1;
    return acc;
  }, {});
  const subRequests = data?.subscription_requests ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2"><BarChart3 className="h-6 w-6" /><h1 className="text-2xl font-bold">Tenant Analytics</h1></div>

      <Card>
        <CardContent className="pt-6">
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Select tenant…" /></SelectTrigger>
            <SelectContent>
              {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {tenantId && (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active seats</p><p className="text-2xl font-bold">{activeSeats}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Licensed seats</p><p className="text-2xl font-bold">{maxSeats}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Seat utilization</p><Progress value={utilization} className="h-2 mt-2" /><p className="text-xs mt-1">{utilization.toFixed(0)}%{utilization >= 90 && <Badge className="ml-2 bg-red-100 text-red-800">Near limit</Badge>}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending sub. requests</p><p className="text-2xl font-bold">{subRequests.filter((r: any) => r.status === 'pending').length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Activity (last 30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(eventsByType).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2">
                    <span className="text-sm">{k}</span>
                    <Badge variant="secondary">{v as number}</Badge>
                  </div>
                ))}
                {Object.keys(eventsByType).length === 0 && <p className="text-center text-muted-foreground py-4">No activity yet</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
