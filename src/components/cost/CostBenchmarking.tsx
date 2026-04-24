import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  projects: any[];
}

export function CostBenchmarking({ projects }: Props) {
  // Simulated industry benchmarks
  const benchmarks = projects.map((p, i) => {
    const budget = p.budget || 100000;
    const actual = p.actual_cost || budget * 0.9;
    const industryAvg = budget * (0.85 + (i * 0.03) % 0.3);
    const internalAvg = budget * (0.88 + (i * 0.02) % 0.2);
    const variance = actual > 0 ? ((actual - industryAvg) / industryAvg * 100) : 0;
    
    return {
      id: p.id,
      name: p.name?.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
      actual: Math.round(actual / 1000),
      industry: Math.round(industryAvg / 1000),
      internal: Math.round(internalAvg / 1000),
      variance: Math.round(variance),
      performance: variance < -5 ? 'outperforming' : variance > 5 ? 'underperforming' : 'on_par',
    };
  });

  const outperforming = benchmarks.filter(b => b.performance === 'outperforming').length;
  const underperforming = benchmarks.filter(b => b.performance === 'underperforming').length;

  const chartData = benchmarks.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Outperforming</p>
          <p className="text-2xl font-bold text-emerald-600">{outperforming}</p>
          <p className="text-xs text-muted-foreground">vs industry avg</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">On Par</p>
          <p className="text-2xl font-bold">{benchmarks.length - outperforming - underperforming}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Underperforming</p>
          <p className="text-2xl font-bold text-destructive">{underperforming}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cost Comparison: Actual vs Industry vs Internal Avg (K SAR)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[4, 4, 0, 0]} />
              <Bar dataKey="industry" fill="hsl(var(--muted-foreground))" name="Industry Avg" radius={[4, 4, 0, 0]} />
              <Bar dataKey="internal" fill="hsl(var(--chart-2))" name="Internal Avg" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead><TableHead>Actual (K)</TableHead><TableHead>Industry (K)</TableHead>
                <TableHead>Internal (K)</TableHead><TableHead>Variance</TableHead><TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.actual}</TableCell>
                  <TableCell className="text-muted-foreground">{b.industry}</TableCell>
                  <TableCell className="text-muted-foreground">{b.internal}</TableCell>
                  <TableCell className={b.variance > 0 ? 'text-destructive font-bold' : 'text-emerald-600 font-bold'}>
                    {b.variance > 0 ? '+' : ''}{b.variance}%
                  </TableCell>
                  <TableCell>
                    {b.performance === 'outperforming' && <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><TrendingDown className="h-3 w-3" /> Below avg</Badge>}
                    {b.performance === 'underperforming' && <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" /> Above avg</Badge>}
                    {b.performance === 'on_par' && <Badge variant="secondary">On par</Badge>}
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
