import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, AlertTriangle, Clock, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProcessMiningDashboard() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('insights');

  const { data: insights = [] } = useQuery({
    queryKey: ['process-insights', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('process_mining_insights' as any).select('*').order('created_at', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['process-events', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('process_mining_events' as any).select('*').order('event_time', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const severityColor = (s: string) => s === 'critical' ? 'destructive' : s === 'warning' ? 'default' : 'secondary';

  // Mock KPIs from data
  const totalCases = new Set(events.map((e: any) => e.case_id)).size;
  const avgDelay = insights.length > 0 ? Math.round(insights.reduce((s: number, i: any) => s + (i.avg_delay_minutes || 0), 0) / insights.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" />Process Mining Dashboard</h1>
        <p className="text-muted-foreground">Analyze document flows, detect delays, loops, and bottlenecks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {[{ label: 'Total Cases', value: totalCases, icon: BarChart3, color: 'text-primary' },
          { label: 'Insights', value: insights.length, icon: Zap, color: 'text-purple-600' },
          { label: 'Critical', value: insights.filter((i: any) => i.severity === 'critical').length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Avg Delay (min)', value: avgDelay, icon: Clock, color: 'text-orange-600' },
          { label: 'Resolved', value: insights.filter((i: any) => i.is_resolved).length, icon: TrendingUp, color: 'text-green-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.color}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-[10px] text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="insights">Process Insights</TabsTrigger><TabsTrigger value="events">Event Log</TabsTrigger></TabsList>
        <TabsContent value="insights">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Insight</TableHead><TableHead>Process</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Severity</TableHead><TableHead>Cases</TableHead><TableHead>Avg Delay</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {insights.map((ins: any) => (
                  <TableRow key={ins.id}>
                    <TableCell><div className="font-medium text-sm">{ins.title}</div><div className="text-xs text-muted-foreground max-w-[250px] truncate">{ins.description}</div></TableCell>
                    <TableCell><Badge variant="outline">{ins.process_name}</Badge></TableCell>
                    <TableCell className="text-sm">{ins.insight_type}</TableCell>
                    <TableCell><Badge variant={severityColor(ins.severity)}>{ins.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{ins.affected_cases}</TableCell>
                    <TableCell className="text-sm">{ins.avg_delay_minutes ? `${Math.round(ins.avg_delay_minutes)}m` : '—'}</TableCell>
                    <TableCell><Badge variant={ins.is_resolved ? 'default' : 'secondary'}>{ins.is_resolved ? 'Resolved' : 'Open'}</Badge></TableCell>
                  </TableRow>
                ))}
                {insights.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No process insights yet. The system will analyze document flows automatically.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="events">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Case</TableHead><TableHead>Activity</TableHead><TableHead>Process</TableHead><TableHead>Module</TableHead><TableHead>Performer</TableHead><TableHead>Duration</TableHead><TableHead>Time</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {events.map((ev: any) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-mono text-sm">{ev.case_id}</TableCell>
                    <TableCell className="font-medium text-sm">{ev.activity}</TableCell>
                    <TableCell><Badge variant="outline">{ev.process_name}</Badge></TableCell>
                    <TableCell className="text-sm">{ev.module || '—'}</TableCell>
                    <TableCell className="text-sm">{ev.performer_name || '—'}</TableCell>
                    <TableCell className="text-sm">{ev.duration_minutes ? `${Math.round(ev.duration_minutes)}m` : '—'}</TableCell>
                    <TableCell className="text-sm">{format(new Date(ev.event_time), 'dd MMM HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events recorded yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
