import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceMetrics } from '@/hooks/useServiceITSM';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ITSMAnalyticsPage() {
  const { data: m } = useServiceMetrics(30);

  const kpis = [
    { label: 'Total tickets (30d)', value: m?.total ?? 0 },
    { label: 'Open', value: m?.open ?? 0 },
    { label: 'Resolved', value: m?.resolved ?? 0 },
    { label: 'SLA breached', value: m?.breached ?? 0 },
    { label: 'Breach rate', value: `${m?.breach_rate ?? 0}%` },
    { label: 'Avg first response', value: `${m?.avg_first_response_min ?? 0}m` },
    { label: 'Avg resolution (MTTR)', value: `${m?.avg_resolution_min ?? 0}m` },
  ];

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" />Service Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tickets by priority</CardTitle></CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m?.by_priority ?? []}>
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
