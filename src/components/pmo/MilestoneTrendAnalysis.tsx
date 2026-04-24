import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Props {
  projects: any[];
}

export function MilestoneTrendAnalysis({ projects }: Props) {
  // Generate simulated MTA data from projects with milestones
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'completed');
  
  // Build trend data: each reporting period, what was the planned completion date for each project
  const reportingPeriods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const trendData = reportingPeriods.map((month, idx) => {
    const entry: Record<string, any> = { period: month };
    activeProjects.slice(0, 5).forEach(p => {
      // Simulate: planned date drifts by 0-3 days per period
      const baseDays = 90 + idx * (Math.floor(Math.random() * 5));
      entry[p.name?.slice(0, 15) || `Project ${p.id.slice(0, 4)}`] = baseDays;
    });
    return entry;
  });

  const projectNames = activeProjects.slice(0, 5).map(p => p.name?.slice(0, 15) || `Project ${p.id.slice(0, 4)}`);
  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Milestone drift summary
  const driftSummary = activeProjects.slice(0, 8).map(p => {
    const originalDays = 90;
    const currentDays = 90 + Math.floor(Math.random() * 20) - 5;
    const drift = currentDays - originalDays;
    return {
      id: p.id,
      name: p.name,
      originalDate: new Date(Date.now() + originalDays * 86400000).toISOString().split('T')[0],
      currentDate: new Date(Date.now() + currentDays * 86400000).toISOString().split('T')[0],
      driftDays: drift,
      trend: drift > 5 ? 'slipping' : drift < -2 ? 'ahead' : 'on_track',
    };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Milestone Trend Analysis (MTA) — Date Drift Over Reporting Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {projectNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Days to Completion', angle: -90, position: 'insideLeft', fontSize: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {projectNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No active projects to analyze</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Milestone Drift Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Original Date</TableHead>
                <TableHead>Current Forecast</TableHead>
                <TableHead>Drift (Days)</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driftSummary.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No milestones to analyze</TableCell></TableRow>
              )}
              {driftSummary.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm">{d.originalDate}</TableCell>
                  <TableCell className="text-sm">{d.currentDate}</TableCell>
                  <TableCell>
                    <span className={d.driftDays > 5 ? 'text-destructive font-bold' : d.driftDays < -2 ? 'text-emerald-600 font-bold' : ''}>
                      {d.driftDays > 0 ? '+' : ''}{d.driftDays}
                    </span>
                  </TableCell>
                  <TableCell>
                    {d.trend === 'slipping' && <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" /> Slipping</Badge>}
                    {d.trend === 'ahead' && <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><TrendingUp className="h-3 w-3" /> Ahead</Badge>}
                    {d.trend === 'on_track' && <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" /> On Track</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
