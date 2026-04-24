import { usePMOAlerts } from '@/hooks/usePMOAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useMemo } from 'react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

export function AlertAnalytics() {
  const { alerts, alertsBySeverity, alertsByCategory } = usePMOAlerts();

  // Trend data: last 30 days
  const trendData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 29 - i));
      const dayAlerts = alerts.filter(a => isSameDay(new Date(a.created_at), date));
      return {
        date: format(date, 'MMM dd'),
        total: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length,
        high: dayAlerts.filter(a => a.severity === 'high').length,
      };
    });
    return days;
  }, [alerts]);

  const severityData = [
    { name: 'Critical', value: alertsBySeverity.critical, color: '#ef4444' },
    { name: 'High', value: alertsBySeverity.high, color: '#f97316' },
    { name: 'Medium', value: alertsBySeverity.medium, color: '#eab308' },
    { name: 'Low', value: alertsBySeverity.low, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const categoryData = Object.entries(alertsByCategory).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    count,
  }));

  // Resolution time
  const resolvedAlerts = alerts.filter(a => a.resolved_at && a.created_at);
  const avgResolutionHrs = resolvedAlerts.length > 0
    ? Math.round(resolvedAlerts.reduce((s, a) => s + (new Date(a.resolved_at!).getTime() - new Date(a.created_at).getTime()) / 3600000, 0) / resolvedAlerts.length)
    : 0;
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged_at);
  const avgAckHrs = acknowledgedAlerts.length > 0
    ? Math.round(acknowledgedAlerts.reduce((s, a) => s + (new Date(a.acknowledged_at!).getTime() - new Date(a.created_at).getTime()) / 3600000, 0) / acknowledgedAlerts.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Alerts (30d)" value={alerts.length} />
        <MetricCard label="Avg Ack Time" value={`${avgAckHrs}h`} />
        <MetricCard label="Avg Resolution" value={`${avgResolutionHrs}h`} />
        <MetricCard label="Ack Rate" value={`${alerts.length > 0 ? Math.round((acknowledgedAlerts.length / alerts.length) * 100) : 0}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Alert trend */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alert Trend (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Total" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" name="Critical" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="high" stroke="#f97316" name="High" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">By Severity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {severityData.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-[10px]">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By category */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alerts by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 px-3 text-center">
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
