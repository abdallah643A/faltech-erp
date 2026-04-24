import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { Star, Award, TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface Supplier {
  id: string; name: string; category: string;
  quality: number; cost: number; delivery: number; responsiveness: number; safety: number;
  overall: number; segment: string; trend: 'up' | 'down' | 'stable';
  projectsCompleted: number; onTimeDelivery: number; defectRate: number;
}

export function SupplierPerformanceScoring() {
  const [category, setCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const suppliers: Supplier[] = useMemo(() => {
    const names = [
      { name: 'Al-Rajhi Construction', category: 'Structural' },
      { name: 'Gulf Steel Industries', category: 'Materials' },
      { name: 'Saudi Readymix', category: 'Concrete' },
      { name: 'Arabian MEP Solutions', category: 'MEP' },
      { name: 'Desert Equipment Co', category: 'Equipment' },
      { name: 'Riyadh Electrical', category: 'Electrical' },
      { name: 'Jeddah Plumbing Works', category: 'Plumbing' },
      { name: 'National Paint Factory', category: 'Finishing' },
      { name: 'Eastern Cement Co', category: 'Materials' },
      { name: 'Dammam HVAC Systems', category: 'MEP' },
    ];
    return names.map((n, i) => {
      const quality = 60 + (i * 13 + 7) % 35;
      const cost = 55 + (i * 11 + 3) % 40;
      const delivery = 50 + (i * 17 + 5) % 45;
      const responsiveness = 55 + (i * 9 + 11) % 40;
      const safety = 65 + (i * 7 + 13) % 30;
      const overall = (quality * 0.25 + cost * 0.25 + delivery * 0.2 + responsiveness * 0.15 + safety * 0.15);
      const segment = overall >= 80 ? 'Preferred' : overall >= 60 ? 'Acceptable' : 'Monitor';
      const trend: 'up' | 'down' | 'stable' = overall > 75 ? 'up' : overall > 60 ? 'stable' : 'down';
      return {
        id: String(i), name: n.name, category: n.category,
        quality: Math.round(quality), cost: Math.round(cost), delivery: Math.round(delivery),
        responsiveness: Math.round(responsiveness), safety: Math.round(safety),
        overall: Math.round(overall * 10) / 10, segment, trend,
        projectsCompleted: Math.floor(5 + (i * 7) % 25),
        onTimeDelivery: Math.round(70 + (i * 4) % 28),
        defectRate: Math.round(((i * 3) % 80) / 10),
      };
    }).sort((a, b) => b.overall - a.overall);
  }, []);

  const filtered = category === 'all' ? suppliers : suppliers.filter(s => s.category === category);
  const categories = [...new Set(suppliers.map(s => s.category))];
  const preferred = suppliers.filter(s => s.segment === 'Preferred').length;
  const acceptable = suppliers.filter(s => s.segment === 'Acceptable').length;
  const monitor = suppliers.filter(s => s.segment === 'Monitor').length;

  const selected = suppliers.find(s => s.id === selectedSupplier);
  const radarData = selected ? [
    { metric: 'Quality', score: selected.quality },
    { metric: 'Cost', score: selected.cost },
    { metric: 'Delivery', score: selected.delivery },
    { metric: 'Responsiveness', score: selected.responsiveness },
    { metric: 'Safety', score: selected.safety },
  ] : [];

  // Performance trend (simulated 6 months)
  const trendData = useMemo(() => {
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    return months.map((m, i) => ({
      month: m,
      score: selected ? selected.overall - 5 + i * 1.2 + Math.sin(i * 0.9) * 1.5 : 0,
    }));
  }, [selected]);

  const segColor = (seg: string) => seg === 'Preferred' ? 'default' : seg === 'Acceptable' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Supplier Performance Scoring</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportImportButtons data={filtered} columns={[
            { key: 'name', header: 'Supplier', width: 20 },
            { key: 'category', header: 'Category', width: 12 },
            { key: 'quality', header: 'Quality', width: 8 },
            { key: 'cost', header: 'Cost', width: 8 },
            { key: 'delivery', header: 'Delivery', width: 8 },
            { key: 'overall', header: 'Overall', width: 8 },
            { key: 'segment', header: 'Segment', width: 10 },
          ]} filename="Supplier_Scores" title="Supplier Performance" />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Suppliers</div>
          <div className="text-2xl font-bold text-foreground">{suppliers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Preferred</div>
          <div className="text-2xl font-bold text-chart-2">{preferred}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Acceptable</div>
          <div className="text-2xl font-bold text-chart-4">{acceptable}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Monitor</div>
          <div className="text-2xl font-bold text-destructive">{monitor}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ranking Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3"><CardTitle className="text-sm">Supplier Rankings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={s.id} className={`cursor-pointer ${selectedSupplier === s.id ? 'bg-primary/5' : ''}`} onClick={() => setSelectedSupplier(s.id)}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                    <TableCell><Progress value={s.quality} className="h-2 w-12" /></TableCell>
                    <TableCell><Progress value={s.cost} className="h-2 w-12" /></TableCell>
                    <TableCell><Progress value={s.delivery} className="h-2 w-12" /></TableCell>
                    <TableCell className="font-mono font-bold">{s.overall}</TableCell>
                    <TableCell><Badge variant={segColor(s.segment)}>{s.segment}</Badge></TableCell>
                    <TableCell>
                      {s.trend === 'up' ? <TrendingUp className="h-4 w-4 text-chart-2" /> :
                       s.trend === 'down' ? <TrendingDown className="h-4 w-4 text-destructive" /> :
                       <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Selected Supplier Detail */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">{selected.name}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="metric" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                      <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Performance Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis domain={[50, 100]} className="text-xs" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Projects:</span> <span className="font-bold">{selected.projectsCompleted}</span></div>
                  <div><span className="text-muted-foreground">On-Time:</span> <span className="font-bold">{selected.onTimeDelivery}%</span></div>
                  <div><span className="text-muted-foreground">Defect Rate:</span> <span className="font-bold">{selected.defectRate}%</span></div>
                  <div><span className="text-muted-foreground">Overall:</span> <span className="font-bold">{selected.overall}/100</span></div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Click a supplier to view detailed scorecard
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
