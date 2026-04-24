import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wifi, RefreshCw, AlertTriangle, CheckCircle2, Clock, Search, Zap, RotateCcw, XCircle } from 'lucide-react';

export default function IntegrationMonitorConsole() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['integration-monitor-events', activeCompanyId, statusFilter],
    queryFn: async () => {
      let q = supabase.from('integration_monitor_events' as any).select('*').order('created_at', { ascending: false }).limit(500) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const retryEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('integration_monitor_events' as any).update({
        retry_count: events.find((e: any) => e.id === id)?.retry_count + 1 || 1,
        status: 'retrying',
        next_retry_at: new Date(Date.now() + 300000).toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integration-monitor-events'] }); toast.success('Retry scheduled'); },
  });

  const resolveEvent = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await (supabase.from('integration_monitor_events' as any).update({
        status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: notes || 'Manually resolved',
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integration-monitor-events'] }); toast.success('Resolved'); },
  });

  const filtered = events.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.integration_name?.toLowerCase().includes(s) || e.error_message?.toLowerCase().includes(s) || e.record_reference?.toLowerCase().includes(s);
  });

  const failed = events.filter((e: any) => e.status === 'failed');
  const retrying = events.filter((e: any) => e.status === 'retrying');
  const success = events.filter((e: any) => e.status === 'success');
  const integrations = [...new Set(events.map((e: any) => e.integration_name))];
  const successRate = events.length > 0 ? Math.round((success.length / events.length) * 100) : 100;

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === 'retrying') return <RotateCcw className="h-4 w-4 text-amber-500 animate-spin" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-6 w-6" />Integration Monitoring & Recovery</h1>
          <p className="text-muted-foreground">Monitor, diagnose, and recover integration failures</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="retrying">Retrying</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Total Events</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{failed.length}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{retrying.length}</p><p className="text-xs text-muted-foreground">Retrying</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{successRate}%</p><p className="text-xs text-muted-foreground">Success Rate</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{integrations.length}</p><p className="text-xs text-muted-foreground">Integrations</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="failed">Failed Queue</TabsTrigger>
          <TabsTrigger value="retry">Retry Center</TabsTrigger>
          <TabsTrigger value="diagnostics">Error Diagnostics</TabsTrigger>
          <TabsTrigger value="sla">SLA Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="mb-4">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {integrations.map(name => {
              const intEvents = events.filter((e: any) => e.integration_name === name);
              const intFailed = intEvents.filter((e: any) => e.status === 'failed').length;
              const intSuccess = intEvents.filter((e: any) => e.status === 'success').length;
              return (
                <Card key={name}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">{intEvents.length} events</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default">{intSuccess} ok</Badge>
                      {intFailed > 0 && <Badge variant="destructive">{intFailed} failed</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="failed">
          <div className="space-y-3">
            {failed.map((e: any) => (
              <Card key={e.id} className="border-destructive/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(e.status)}
                      <div>
                        <p className="font-medium">{e.integration_name}</p>
                        <p className="text-sm text-muted-foreground">{e.event_type} • {e.record_type} • {e.record_reference || '—'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => retryEvent.mutate(e.id)}><RefreshCw className="h-4 w-4 mr-1" />Retry</Button>
                      <Button size="sm" variant="outline" onClick={() => resolveEvent.mutate({ id: e.id })}><CheckCircle2 className="h-4 w-4 mr-1" />Resolve</Button>
                    </div>
                  </div>
                  {e.error_message && <p className="text-sm text-destructive bg-destructive/5 p-2 rounded">{e.error_message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Retries: {e.retry_count}/{e.max_retries} • {new Date(e.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
            {failed.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No failed events</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="retry">
          <div className="space-y-3">
            {retrying.map((e: any) => (
              <Card key={e.id} className="border-amber-300/50">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(e.status)}
                    <div>
                      <p className="font-medium">{e.integration_name} - {e.event_type}</p>
                      <p className="text-sm text-muted-foreground">Retry {e.retry_count}/{e.max_retries} • Next: {e.next_retry_at ? new Date(e.next_retry_at).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveEvent.mutate({ id: e.id })}>Cancel & Resolve</Button>
                </CardContent>
              </Card>
            ))}
            {retrying.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No retries in progress</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="diagnostics">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Error Distribution</CardTitle></CardHeader>
              <CardContent>
                {[...new Set(failed.map((e: any) => e.error_code).filter(Boolean))].map(code => (
                  <div key={code} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-mono">{code}</span>
                    <Badge variant="destructive">{failed.filter((e: any) => e.error_code === code).length}</Badge>
                  </div>
                ))}
                {[...new Set(failed.map((e: any) => e.root_cause).filter(Boolean))].map(rc => (
                  <div key={rc} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{rc}</span>
                    <Badge variant="secondary">{failed.filter((e: any) => e.root_cause === rc).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sla">
          <div className="space-y-3">
            {events.filter((e: any) => e.sla_due_at).map((e: any) => {
              const breached = new Date(e.sla_due_at) < new Date() && e.status !== 'resolved' && e.status !== 'success';
              return (
                <Card key={e.id} className={breached ? 'border-destructive/50' : ''}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{e.integration_name}</p>
                      <p className="text-sm text-muted-foreground">SLA: {new Date(e.sla_due_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={breached ? 'destructive' : 'default'}>{breached ? 'SLA Breached' : 'Within SLA'}</Badge>
                  </CardContent>
                </Card>
              );
            })}
            {events.filter((e: any) => e.sla_due_at).length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No SLA-tracked events</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
