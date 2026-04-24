import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorrespondenceList } from '@/hooks/useCorrespondence';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export default function CorrespondenceReportsPage() {
  const { data: rows = [] } = useCorrespondenceList({ limit: 1000 });

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach(r => { m[r.status] = (m[r.status] ?? 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const byDirection = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach(r => { m[r.direction] = (m[r.direction] ?? 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const byMonth = useMemo(() => {
    const m: Record<string, { month: string; incoming: number; outgoing: number }> = {};
    rows.forEach(r => {
      const k = r.created_at.slice(0, 7);
      m[k] = m[k] ?? { month: k, incoming: 0, outgoing: 0 };
      if (r.direction === 'incoming') m[k].incoming++;
      if (r.direction === 'outgoing') m[k].outgoing++;
    });
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month));
  }, [rows]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Correspondence Reports</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Volume by Month</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="incoming" fill="hsl(var(--primary))" />
                <Bar dataKey="outgoing" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={100}>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Direction</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDirection}><XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
