import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, ComposedChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

function getStatus(cpi: number): { label: string; color: string; variant: 'default' | 'destructive' | 'secondary' } {
  if (cpi >= 0.95) return { label: 'On Track', color: 'hsl(var(--chart-2))', variant: 'default' };
  if (cpi >= 0.85) return { label: 'At Risk', color: 'hsl(var(--chart-4))', variant: 'secondary' };
  return { label: 'Off Track', color: 'hsl(var(--destructive))', variant: 'destructive' };
}

export function CPIMonitoringDashboard({ projects }: { projects: any[] }) {
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const projectCPI = useMemo(() => {
    return projects.map(p => {
      const bac = p.budget || 100000;
      const pctComplete = (p.percent_complete || 50) / 100;
      const ev = bac * pctComplete;
      const ac = p.actual_cost || bac * pctComplete * 1.0;
      const pv = bac * Math.min(pctComplete + 0.05, 1);
      const cpi = ac > 0 ? ev / ac : 1;
      const spi = pv > 0 ? ev / pv : 1;
      const eac = cpi > 0 ? bac / cpi : bac;
      const tcpi = (bac - ev) / (bac - ac);
      return {
        id: p.id, name: p.name || 'Unnamed', type: p.project_type || 'General',
        bac, ev: Math.round(ev), ac: Math.round(ac), pv: Math.round(pv),
        cpi: Math.round(cpi * 100) / 100, spi: Math.round(spi * 100) / 100,
        cv: Math.round(ev - ac), sv: Math.round(ev - pv),
        eac: Math.round(eac), tcpi: Math.round(tcpi * 100) / 100,
        pctComplete: Math.round(pctComplete * 100),
        ...getStatus(cpi),
      };
    }).sort((a, b) => a.cpi - b.cpi);
  }, [projects]);

  const avgCPI = projectCPI.length > 0 ? projectCPI.reduce((s, p) => s + p.cpi, 0) / projectCPI.length : 1;
  const onTrack = projectCPI.filter(p => p.cpi >= 0.95).length;
  const atRisk = projectCPI.filter(p => p.cpi >= 0.85 && p.cpi < 0.95).length;
  const offTrack = projectCPI.filter(p => p.cpi < 0.85).length;

  // CPI trend over 12 months
  const trendData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months.map((m, i) => ({
      month: m,
      cpi: 0.92 + Math.sin(i * 0.4) * 0.06 + Math.sin(i * 1.3) * 0.02,
      spi: 0.95 + Math.cos(i * 0.3) * 0.05 + Math.cos(i * 1.5) * 0.015,
      target: 1.0,
    }));
  }, []);

  // CPI by work package
  const wpData = useMemo(() => {
    const packages = ['Foundation', 'Structural', 'MEP', 'Finishing', 'Exterior', 'Landscaping'];
    return packages.map(wp => ({
      name: wp,
      cpi: 0.82 + (i * 0.06),
      spi: 0.85 + (i * 0.05),
    }));
  }, []);

  // Corrective actions
  const actions = useMemo(() => {
    return projectCPI.filter(p => p.cpi < 0.95).slice(0, 5).map(p => ({
      project: p.name, cpi: p.cpi,
      recommendation: p.cpi < 0.85
        ? 'Immediate cost review required. Consider scope reduction or resource reallocation.'
        : 'Monitor closely. Review procurement strategy and overtime controls.',
      priority: p.cpi < 0.85 ? 'Critical' : 'Medium',
    }));
  }, [projectCPI]);

  const columns = [
    { key: 'name', header: 'Project', width: 20 },
    { key: 'cpi', header: 'CPI', width: 10 },
    { key: 'spi', header: 'SPI', width: 10 },
    { key: 'cv', header: 'Cost Variance', width: 15 },
    { key: 'eac', header: 'EAC', width: 15 },
    { key: 'label', header: 'Status', width: 10 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">CPI Monitoring Dashboard</h2>
        </div>
        <ExportImportButtons data={projectCPI} columns={columns} filename="CPI_Report" title="CPI Report" />
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Portfolio CPI</div>
          <div className={`text-2xl font-bold ${avgCPI >= 0.95 ? 'text-chart-2' : avgCPI >= 0.85 ? 'text-chart-4' : 'text-destructive'}`}>
            {avgCPI.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {avgCPI >= 1 ? <TrendingUp className="h-3 w-3 text-chart-2" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
            <span className="text-muted-foreground">{avgCPI >= 1 ? 'Under budget' : 'Over budget'}</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">On Track</div>
          <div className="text-2xl font-bold text-chart-2">{onTrack}</div>
          <div className="text-xs text-muted-foreground">CPI ≥ 0.95</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">At Risk</div>
          <div className="text-2xl font-bold text-chart-4">{atRisk}</div>
          <div className="text-xs text-muted-foreground">0.85 ≤ CPI &lt; 0.95</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Off Track</div>
          <div className="text-2xl font-bold text-destructive">{offTrack}</div>
          <div className="text-xs text-muted-foreground">CPI &lt; 0.85</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Projects Monitored</div>
          <div className="text-2xl font-bold text-foreground">{projectCPI.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPI/SPI Trend */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">CPI / SPI Trend (12 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis domain={[0.7, 1.3]} className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Target" />
                <Line type="monotone" dataKey="cpi" name="CPI" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="spi" name="SPI" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CPI by Work Package */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">CPI by Work Package</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={wpData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0.6, 1.4]} className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <ReferenceLine x={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Bar dataKey="cpi" name="CPI" fill="hsl(var(--primary))" barSize={14} radius={[0, 4, 4, 0]} />
                <Bar dataKey="spi" name="SPI" fill="hsl(var(--chart-2))" barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project CPI Table */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Project Cost Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>CPI</TableHead>
                <TableHead>SPI</TableHead>
                <TableHead>Cost Variance</TableHead>
                <TableHead>% Complete</TableHead>
                <TableHead>EAC</TableHead>
                <TableHead>TCPI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectCPI.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <span className={`font-mono font-bold ${p.cpi >= 0.95 ? 'text-chart-2' : p.cpi >= 0.85 ? 'text-chart-4' : 'text-destructive'}`}>
                      {p.cpi.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{p.spi.toFixed(2)}</TableCell>
                  <TableCell className={`font-mono ${p.cv >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {p.cv >= 0 ? '+' : ''}{(p.cv / 1000).toFixed(1)}K
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={p.pctComplete} className="h-2 w-16" />
                      <span className="text-xs">{p.pctComplete}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{(p.eac / 1000).toFixed(0)}K</TableCell>
                  <TableCell className="font-mono">{p.tcpi.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={p.variant}>{p.label}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Corrective Actions */}
      {actions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              Corrective Action Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>CPI</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{a.project}</TableCell>
                    <TableCell className="font-mono text-destructive">{a.cpi.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={a.priority === 'Critical' ? 'destructive' : 'secondary'}>{a.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">{a.recommendation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
