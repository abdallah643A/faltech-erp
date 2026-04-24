import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Phone, Mail, Calendar, CheckCircle, FileText, TrendingUp, Clock, Target } from 'lucide-react';
import { format, subDays, startOfDay, isAfter } from 'date-fns';
import type { Activity } from '@/hooks/useActivities';

interface ActivityPerformanceDashboardProps {
  activities: Activity[];
}

const PIE_COLORS = ['hsl(var(--info))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))'];

export function ActivityPerformanceDashboard({ activities }: ActivityPerformanceDashboardProps) {
  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter(a => a.status === 'completed').length;
    const pending = activities.filter(a => a.status === 'pending').length;
    const overdue = activities.filter(a => a.status === 'pending' && a.due_date && new Date(a.due_date) < new Date()).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // By type
    const byType = ['call', 'email', 'meeting', 'task', 'note'].map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: activities.filter(a => a.type === type).length,
    })).filter(d => d.value > 0);

    // By priority
    const byPriority = [
      { name: 'High', value: activities.filter(a => a.priority === 'high').length, fill: 'hsl(var(--destructive))' },
      { name: 'Medium', value: activities.filter(a => a.priority === 'medium' || !a.priority).length, fill: 'hsl(var(--warning))' },
      { name: 'Low', value: activities.filter(a => a.priority === 'low').length, fill: 'hsl(var(--muted-foreground))' },
    ].filter(d => d.value > 0);

    // Last 14 days trend
    const trend = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(new Date(), 13 - i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      const created = activities.filter(a => {
        const d = new Date(a.created_at);
        return d >= dayStart && d < dayEnd;
      }).length;
      const done = activities.filter(a => {
        if (!a.completed_at) return false;
        const d = new Date(a.completed_at);
        return d >= dayStart && d < dayEnd;
      }).length;
      return { date: format(day, 'MMM d'), created, completed: done };
    });

    return { total, completed, pending, overdue, completionRate, byType, byPriority, trend };
  }, [activities]);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Activities', value: stats.total, icon: Target, color: 'bg-primary/10 text-primary' },
          { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'bg-success/10 text-success' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-warning/10 text-warning' },
          { label: 'Overdue', value: stats.overdue, icon: Clock, color: 'bg-destructive/10 text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">14-Day Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} name="Created" dot={false} />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--success))" strokeWidth={2} name="Completed" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Type Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats.byType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Priority Bar */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats.byPriority} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.byPriority.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
