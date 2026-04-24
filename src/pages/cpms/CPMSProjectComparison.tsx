import { useState, useEffect } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, GitCompare, Plus, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSProjectComparison() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects, fetchTable } = useCPMS();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [evmData, setEvmData] = useState<any[]>([]);

  useEffect(() => {
    fetchTable('cpms_evm_snapshots', {}, 'snapshot_date').then(setEvmData);
  }, []);

  const selectedProjects = projects.filter(p => selectedIds.includes(p.id!));

  const addProject = (id: string) => {
    if (!selectedIds.includes(id) && selectedIds.length < 5) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeProject = (id: string) => setSelectedIds(selectedIds.filter(i => i !== id));

  const getProjectMetrics = (projectId: string) => {
    const p = projects.find(pr => pr.id === projectId);
    if (!p) return null;
    const snapshots = evmData.filter((e: any) => e.project_id === projectId);
    const latest = snapshots[0] || {};
    const start = p.start_date ? new Date(p.start_date).getTime() : Date.now();
    const end = p.end_date ? new Date(p.end_date).getTime() : Date.now();
    const timeProgress = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
    return {
      name: p.name,
      code: p.code,
      status: p.status,
      contractValue: p.contract_value || 0,
      revisedValue: p.revised_contract_value || p.contract_value || 0,
      timeProgress: Math.round(timeProgress),
      spi: latest.spi || 1,
      cpi: latest.cpi || 1,
      costVariance: latest.cost_variance || 0,
      scheduleVariance: latest.schedule_variance || 0,
      city: p.city || '-',
      type: p.type,
    };
  };

  const radarData = selectedProjects.map(p => {
    const m = getProjectMetrics(p.id!);
    return m;
  }).filter(Boolean);

  const radarChartData = [
    { metric: 'SPI', ...Object.fromEntries(radarData.map((d: any) => [d.code, Math.min(2, d.spi) * 50])) },
    { metric: 'CPI', ...Object.fromEntries(radarData.map((d: any) => [d.code, Math.min(2, d.cpi) * 50])) },
    { metric: 'Time %', ...Object.fromEntries(radarData.map((d: any) => [d.code, d.timeProgress])) },
    { metric: 'Budget Use', ...Object.fromEntries(radarData.map((d: any) => [d.code, d.contractValue > 0 ? Math.min(100, (d.revisedValue / d.contractValue) * 100) : 0])) },
  ];

  const barData = radarData.map((d: any) => ({
    name: d.code,
    'Contract Value': d.contractValue / 1000000,
    'Revised Value': d.revisedValue / 1000000,
  }));

  const colors = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(217, 91%, 60%)'];

  const renderTrend = (val: number, baseline = 1) => {
    if (val > baseline) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    if (val < baseline) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><GitCompare className="h-6 w-6 text-primary" /> Project Comparison</h1>
          <p className="text-sm text-muted-foreground">مقارنة المشاريع – Compare up to 5 projects side-by-side</p>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select onValueChange={addProject}>
              <SelectTrigger className="w-[250px]"><SelectValue placeholder="Add project to compare..." /></SelectTrigger>
              <SelectContent>
                {projects.filter(p => !selectedIds.includes(p.id!)).map(p => (
                  <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjects.map((p, i) => (
              <Badge key={p.id} variant="secondary" className="gap-1 text-sm py-1 px-3" style={{ borderLeft: `3px solid ${colors[i]}` }}>
                {p.code}
                <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => removeProject(p.id!)} />
              </Badge>
            ))}
            {selectedIds.length === 0 && <p className="text-sm text-muted-foreground">Select projects to compare</p>}
          </div>
        </CardContent>
      </Card>

      {selectedIds.length >= 2 && (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Key Metrics Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Metric</TableHead>
                      {radarData.map((d: any, i: number) => (
                        <TableHead key={d.code} className="min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
                            {d.code}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{t('common.status')}</TableCell>
                      {radarData.map((d: any) => <TableCell key={d.code}><Badge variant="outline" className="capitalize">{d.status}</Badge></TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Contract Value</TableCell>
                      {radarData.map((d: any) => <TableCell key={d.code}>{(d.contractValue / 1000000).toFixed(1)}M SAR</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Time Progress</TableCell>
                      {radarData.map((d: any) => (
                        <TableCell key={d.code}>
                          <div className="flex items-center gap-2"><Progress value={d.timeProgress} className="h-2 w-16" /><span className="text-xs">{d.timeProgress}%</span></div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SPI</TableCell>
                      {radarData.map((d: any) => (
                        <TableCell key={d.code}><div className="flex items-center gap-1">{d.spi.toFixed(2)} {renderTrend(d.spi)}</div></TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">CPI</TableCell>
                      {radarData.map((d: any) => (
                        <TableCell key={d.code}><div className="flex items-center gap-1">{d.cpi.toFixed(2)} {renderTrend(d.cpi)}</div></TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Location</TableCell>
                      {radarData.map((d: any) => <TableCell key={d.code}>{d.city}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{t('common.type')}</TableCell>
                      {radarData.map((d: any) => <TableCell key={d.code} className="capitalize">{d.type}</TableCell>)}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                    {radarData.map((d: any, i: number) => (
                      <Radar key={d.code} name={d.code} dataKey={d.code} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Contract Value Comparison (SAR M)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Contract Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Revised Value" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedIds.length < 2 && selectedIds.length > 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select at least 2 projects to compare</CardContent></Card>
      )}
    </div>
  );
}
