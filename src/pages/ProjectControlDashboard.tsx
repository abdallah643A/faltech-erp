import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { useEVM } from '@/hooks/useEVM';
import {
  useProjectControlAlerts, useThresholds, useVarianceExplanations,
  useProjectBaselines, calculateRAG,
} from '@/hooks/useProjectControl';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, TrendingDown,
  Shield, Target, Bell, Eye, FileText, Settings, BarChart3, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const ragColors = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
const ragBadge = { green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800' };

export default function ProjectControlDashboard() {
  const { t } = useLanguage();
  const { projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { snapshots } = useEVM(selectedProjectId);
  const { alerts } = useProjectControlAlerts(selectedProjectId);
  const { thresholds } = useThresholds(selectedProjectId);
  const { explanations, addExplanation } = useVarianceExplanations(selectedProjectId);
  const { baselines, createBaseline } = useProjectBaselines(selectedProjectId);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const snapshotData = snapshots.data || [];
  const alertsData = alerts.data || [];
  const baselinesData = baselines.data || [];
  const thresholdsData = thresholds.data || {};
  const latest = snapshotData[snapshotData.length - 1];

  // Portfolio RAG summary
  const portfolioRAG = useMemo(() => {
    if (!projects.length) return { green: 0, amber: 0, red: 0 };
    // Simple heuristic: use budget vs actual
    const result = { green: 0, amber: 0, red: 0 };
    projects.forEach(p => {
      const budgetUsed = p.budget > 0 ? (p.actual_cost / p.budget) * 100 : 0;
      const progressDelta = p.progress || 0;
      if (budgetUsed > 110 || progressDelta < 30) result.red++;
      else if (budgetUsed > 95 || progressDelta < 60) result.amber++;
      else result.green++;
    });
    return result;
  }, [projects]);

  const projectRAG = latest ? calculateRAG(latest.cpi, latest.spi, thresholdsData) : 'green';

  // S-Curve data
  const sCurveData = snapshotData.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM yy'),
    PV: s.pv, EV: s.ev, AC: s.ac,
  }));

  // Performance trend
  const perfTrend = snapshotData.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM yy'),
    SPI: Number(s.spi.toFixed(2)),
    CPI: Number(s.cpi.toFixed(2)),
    threshold: thresholdsData?.cpi_warning ?? 0.95,
  }));

  // Baseline comparison data
  const baselineComparison = baselinesData.map(b => ({
    name: b.baseline_name,
    budget: b.total_budget,
    duration: b.planned_duration_days || 0,
  }));
  if (latest) {
    baselineComparison.push({ name: 'Current', budget: latest.eac, duration: 0 });
  }

  const activeAlerts = alertsData.filter(a => a.status === 'active').length;
  const criticalAlerts = alertsData.filter(a => a.severity === 'critical' && a.status === 'active').length;

  const handleAddVariance = (e: React.FormEvent<HTMLFormElement>) => {
  const { t } = useLanguage();

    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addExplanation.mutate({
      project_id: selectedProjectId,
      variance_type: fd.get('variance_type'),
      period: fd.get('period'),
      variance_amount: Number(fd.get('variance_amount')) || 0,
      variance_percent: Number(fd.get('variance_percent')) || 0,
      explanation: fd.get('explanation'),
      corrective_action: fd.get('corrective_action'),
      expected_recovery_date: fd.get('expected_recovery_date') || null,
    });
    setShowVarianceDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Control Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time monitoring, RAG status & variance control</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Portfolio RAG Summary (always visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${ragColors.green}`} />
              <span className="text-xs text-muted-foreground">On Track</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{portfolioRAG.green}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${ragColors.amber}`} />
              <span className="text-xs text-muted-foreground">At Risk</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{portfolioRAG.amber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${ragColors.red}`} />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{portfolioRAG.red}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-3xl font-bold">{activeAlerts}</p>
            {criticalAlerts > 0 && <Badge variant="destructive" className="mt-1">{criticalAlerts} critical</Badge>}
          </CardContent>
        </Card>
      </div>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Select a Project</h3>
            <p className="text-muted-foreground">Choose a project for detailed control metrics and RAG analysis</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Project RAG Status Banner */}
          {latest && (
            <Card className={`border-l-4 ${projectRAG === 'red' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : projectRAG === 'amber' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ragColors[projectRAG]}`}>
                      {projectRAG === 'green' ? <CheckCircle className="h-5 w-5 text-white" /> :
                       projectRAG === 'amber' ? <AlertTriangle className="h-5 w-5 text-white" /> :
                       <XCircle className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        RAG Status: <span className="uppercase">{projectRAG}</span>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        CPI: {latest.cpi.toFixed(2)} | SPI: {latest.spi.toFixed(2)} | EAC: {(latest.eac / 1e3).toFixed(0)}K | Complete: {latest.percent_complete}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowVarianceDialog(true)}>
                      <FileText className="h-4 w-4 mr-1" /> Explain Variance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI Grid */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'BAC', value: `${(latest.bac / 1e3).toFixed(0)}K`, icon: Target },
                { label: 'EV', value: `${(latest.ev / 1e3).toFixed(0)}K`, icon: TrendingUp },
                { label: 'AC', value: `${(latest.ac / 1e3).toFixed(0)}K`, icon: Activity },
                { label: 'CPI', value: latest.cpi.toFixed(2), icon: latest.cpi >= 1 ? TrendingUp : TrendingDown, color: latest.cpi >= 1 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'SPI', value: latest.spi.toFixed(2), icon: latest.spi >= 1 ? TrendingUp : TrendingDown, color: latest.spi >= 1 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'CV', value: `${(latest.cv / 1e3).toFixed(0)}K`, icon: Activity, color: latest.cv >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'SV', value: `${(latest.sv / 1e3).toFixed(0)}K`, icon: Clock, color: latest.sv >= 0 ? 'text-emerald-600' : 'text-red-600' },
                { label: 'EAC', value: `${(latest.eac / 1e3).toFixed(0)}K`, icon: Target },
              ].map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="pt-3 pb-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <kpi.icon className="h-3 w-3" />{kpi.label}
                    </div>
                    <p className={`text-lg font-bold ${(kpi as any).color || ''}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">S-Curve & Trends</TabsTrigger>
              <TabsTrigger value="alerts">Alerts ({activeAlerts})</TabsTrigger>
              <TabsTrigger value="baselines">Baseline Comparison</TabsTrigger>
              <TabsTrigger value="variances">Variance Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* S-Curve */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">S-Curve (PV / EV / AC)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={sCurveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="PV" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeDasharray="5 5" />
                        <Area type="monotone" dataKey="EV" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="AC" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60%)" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Performance Trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">CPI / SPI Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={perfTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0.5, 1.5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="CPI" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="SPI" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="threshold" stroke="hsl(0 84% 60%)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active Control Alerts</CardTitle>
                  <CardDescription>Threshold breaches requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {alertsData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No alerts generated yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>{t('common.type')}</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                          <TableHead>{t('common.date')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alertsData.map(a => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Badge className={a.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                                {a.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{a.alert_type}</TableCell>
                            <TableCell className="font-medium text-sm">{a.title}</TableCell>
                            <TableCell>{a.metric_value?.toFixed(2)}</TableCell>
                            <TableCell>{a.threshold_value?.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={a.status === 'active' ? 'destructive' : a.status === 'acknowledged' ? 'secondary' : 'outline'}>
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="baselines" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Baseline Comparison</CardTitle>
                    <CardDescription>Original vs re-baselined vs current</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => createBaseline.mutate({
                    project_id: selectedProjectId,
                    baseline_number: (baselinesData.length || 0) + 1,
                    baseline_name: `Baseline ${(baselinesData.length || 0) + 1}`,
                    total_budget: latest?.bac || 0,
                    planned_duration_days: 0,
                  })}>
                    Create Baseline
                  </Button>
                </CardHeader>
                <CardContent>
                  {baselineComparison.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={baselineComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="budget" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No baselines created yet</p>
                  )}
                  
                  {baselinesData.length > 0 && (
                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{t('common.name')}</TableHead>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {baselinesData.map(b => (
                          <TableRow key={b.id}>
                            <TableCell>{b.baseline_number}</TableCell>
                            <TableCell className="font-medium">{b.baseline_name}</TableCell>
                            <TableCell>{format(new Date(b.baseline_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{b.total_budget?.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{b.reason_for_rebaseline || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variances" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Variance Explanations</CardTitle>
                    <CardDescription>Mandatory explanations for threshold breaches</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowVarianceDialog(true)}>Add Explanation</Button>
                </CardHeader>
                <CardContent>
                  {(explanations.data || []).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No variance explanations yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('common.type')}</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Variance %</TableHead>
                          <TableHead>Explanation</TableHead>
                          <TableHead>Corrective Action</TableHead>
                          <TableHead>Recovery Date</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(explanations.data || []).map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell><Badge variant="outline">{v.variance_type}</Badge></TableCell>
                            <TableCell>{v.period}</TableCell>
                            <TableCell className={v.variance_percent > 0 ? 'text-red-600' : 'text-emerald-600'}>
                              {v.variance_percent?.toFixed(1)}%
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{v.explanation}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{v.corrective_action || '-'}</TableCell>
                            <TableCell>{v.expected_recovery_date || '-'}</TableCell>
                            <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Variance Explanation Dialog */}
      <Dialog open={showVarianceDialog} onOpenChange={setShowVarianceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Variance Explanation</DialogTitle></DialogHeader>
          <form onSubmit={handleAddVariance} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select name="variance_type" defaultValue="cost">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="scope">Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period</Label>
                <Input name="period" placeholder="e.g. Mar 2025" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Variance Amount</Label>
                <Input name="variance_amount" type="number" step="0.01" />
              </div>
              <div>
                <Label>Variance %</Label>
                <Input name="variance_percent" type="number" step="0.01" />
              </div>
            </div>
            <div>
              <Label>Explanation *</Label>
              <Textarea name="explanation" required rows={3} placeholder="Describe the root cause..." />
            </div>
            <div>
              <Label>Corrective Action</Label>
              <Textarea name="corrective_action" rows={2} placeholder="Actions to bring back on track..." />
            </div>
            <div>
              <Label>Expected Recovery Date</Label>
              <Input name="expected_recovery_date" type="date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowVarianceDialog(false)}>{t('common.cancel')}</Button>
              <Button type="submit">{t('common.submit')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
