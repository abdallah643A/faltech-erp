import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMaintenanceWorkOrders } from '@/hooks/useMaintenanceWorkOrders';
import { useAssets } from '@/hooks/useAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Wrench, ClipboardList, AlertTriangle, Clock, TrendingUp, DollarSign,
  Plus, CheckCircle2, ShieldCheck, Calendar, Activity, BarChart3,
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-muted text-muted-foreground',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-700',
  assigned: 'bg-purple-500/20 text-purple-700',
  in_progress: 'bg-yellow-500/20 text-yellow-700',
  on_hold: 'bg-muted text-muted-foreground',
  completed: 'bg-green-500/20 text-green-700',
  cancelled: 'bg-destructive/20 text-destructive',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AssetMaintenanceHub() {
  const { t } = useLanguage();
  const { workOrders, pmSchedules, overduePMs, upcomingPMs, slaConfigs, costForecasts,
    createWorkOrder, updateWorkOrder, createPMSchedule, createSLAConfig, createCostForecast,
    getPredictiveInsights, getSLAMetrics, getCostAnalysis } = useMaintenanceWorkOrders();
  const { assets, maintenanceRecords } = useAssets();

  const [woDialog, setWoDialog] = useState(false);
  const [pmDialog, setPmDialog] = useState(false);
  const [slaDialog, setSlaDialog] = useState(false);
  const [woForm, setWoForm] = useState<Record<string, any>>({});
  const [pmForm, setPmForm] = useState<Record<string, any>>({});
  const [slaForm, setSlaForm] = useState<Record<string, any>>({});

  const slaMetrics = getSLAMetrics();
  const costAnalysis = getCostAnalysis();
  const predictiveInsights = getPredictiveInsights(assets, maintenanceRecords);

  // Chart data
  const woByType = ['corrective', 'preventive', 'predictive', 'emergency'].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: workOrders.filter(w => w.work_order_type === t).length,
  }));

  const woByStatus = ['open', 'assigned', 'in_progress', 'completed'].map(s => ({
    name: s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: workOrders.filter(w => w.status === s).length,
  }));

  const costTrendData = costForecasts.slice(0, 8).reverse().map(f => ({
    period: f.forecast_period,
    budgeted: f.budgeted_amount,
    actual: f.actual_amount,
  }));

  const handleCreateWO = () => {
    createWorkOrder.mutate(woForm);
    setWoDialog(false);
    setWoForm({});
  };

  const handleCreatePM = () => {
    createPMSchedule.mutate(pmForm);
    setPmDialog(false);
    setPmForm({});
  };

  const handleCreateSLA = () => {
    createSLAConfig.mutate(slaForm);
    setSlaDialog(false);
    setSlaForm({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.maintenanceHub')}</h1>
          <p className="text-sm text-muted-foreground">Work orders, preventive maintenance, SLA tracking & cost forecasting</p>
        </div>
        <Dialog open={woDialog} onOpenChange={setWoDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Work Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Asset</Label>
                <Select onValueChange={v => setWoForm({ ...woForm, asset_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={woForm.title || ''} onChange={e => setWoForm({ ...woForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select onValueChange={v => setWoForm({ ...woForm, work_order_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="predictive">Predictive</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select onValueChange={v => setWoForm({ ...woForm, priority: v })}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Assigned To</Label>
                  <Input value={woForm.assigned_to_name || ''} onChange={e => setWoForm({ ...woForm, assigned_to_name: e.target.value })} />
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <Input type="number" value={woForm.estimated_hours || ''} onChange={e => setWoForm({ ...woForm, estimated_hours: +e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estimated Cost</Label>
                  <Input type="number" value={woForm.estimated_cost || ''} onChange={e => setWoForm({ ...woForm, estimated_cost: +e.target.value })} />
                </div>
                <div>
                  <Label>Scheduled Start</Label>
                  <Input type="date" value={woForm.scheduled_start || ''} onChange={e => setWoForm({ ...woForm, scheduled_start: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={woForm.description || ''} onChange={e => setWoForm({ ...woForm, description: e.target.value })} />
              </div>
              <Button onClick={handleCreateWO} disabled={!woForm.asset_id || !woForm.title}>Create Work Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Open WOs</span></div>
            <p className="text-2xl font-bold mt-1">{workOrders.filter(w => w.status !== 'completed' && w.status !== 'cancelled').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Completed</span></div>
            <p className="text-2xl font-bold mt-1">{workOrders.filter(w => w.status === 'completed').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">SLA Compliance</span></div>
            <p className="text-2xl font-bold mt-1">{slaMetrics.complianceRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">SLA Breached</span></div>
            <p className="text-2xl font-bold mt-1">{slaMetrics.breached}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Overdue PMs</span></div>
            <p className="text-2xl font-bold mt-1">{overduePMs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Total WO Cost</span></div>
            <p className="text-2xl font-bold mt-1">{costAnalysis.woTotalCost.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">WO by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={woByType.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {woByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">WO by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={woByStatus.filter(d => d.value > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Budget vs Actual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={costTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="budgeted" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Budget" />
                <Area type="monotone" dataKey="actual" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} name="Actual" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="work-orders">
        <TabsList>
          <TabsTrigger value="work-orders"><Wrench className="h-3 w-3 mr-1" /> Work Orders</TabsTrigger>
          <TabsTrigger value="pm-schedules"><Calendar className="h-3 w-3 mr-1" /> PM Schedules</TabsTrigger>
          <TabsTrigger value="predictive"><Activity className="h-3 w-3 mr-1" /> Predictive</TabsTrigger>
          <TabsTrigger value="sla"><ShieldCheck className="h-3 w-3 mr-1" /> SLA Tracking</TabsTrigger>
          <TabsTrigger value="cost"><BarChart3 className="h-3 w-3 mr-1" /> Cost Forecast</TabsTrigger>
        </TabsList>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No work orders yet</TableCell></TableRow>
                  )}
                  {workOrders.map(wo => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-xs">{wo.work_order_code}</TableCell>
                      <TableCell className="text-xs">{wo.assets?.asset_code} - {wo.assets?.name}</TableCell>
                      <TableCell>{wo.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{wo.work_order_type}</Badge></TableCell>
                      <TableCell><Badge className={PRIORITY_COLORS[wo.priority]}>{wo.priority}</Badge></TableCell>
                      <TableCell><Badge className={STATUS_COLORS[wo.status]}>{wo.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{wo.assigned_to_name || '-'}</TableCell>
                      <TableCell>
                        {wo.sla_breached ? (
                          <Badge className="bg-destructive text-destructive-foreground">Breached</Badge>
                        ) : wo.sla_due_date ? (
                          <span className="text-xs text-muted-foreground">{new Date(wo.sla_due_date).toLocaleDateString()}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {wo.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => updateWorkOrder.mutate({ id: wo.id, status: 'in_progress' })}>Start</Button>
                          )}
                          {wo.status === 'in_progress' && (
                            <Button size="sm" variant="outline" onClick={() => updateWorkOrder.mutate({ id: wo.id, status: 'completed' })}>Complete</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PM Schedules Tab */}
        <TabsContent value="pm-schedules">
          <div className="flex justify-end mb-3">
            <Dialog open={pmDialog} onOpenChange={setPmDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add PM Schedule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create PM Schedule</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div>
                    <Label>Asset</Label>
                    <Select onValueChange={v => setPmForm({ ...pmForm, asset_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>
                        {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_code} - {a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={pmForm.title || ''} onChange={e => setPmForm({ ...pmForm, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Frequency (days)</Label>
                      <Input type="number" value={pmForm.frequency_days || ''} onChange={e => setPmForm({ ...pmForm, frequency_days: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Estimated Cost</Label>
                      <Input type="number" value={pmForm.estimated_cost || ''} onChange={e => setPmForm({ ...pmForm, estimated_cost: +e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Input value={pmForm.assigned_to_name || ''} onChange={e => setPmForm({ ...pmForm, assigned_to_name: e.target.value })} />
                  </div>
                  <Button onClick={handleCreatePM} disabled={!pmForm.asset_id || !pmForm.title}>Create Schedule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {overduePMs.length > 0 && (
            <Card className="mb-4 border-destructive/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Overdue Maintenance ({overduePMs.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overduePMs.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded">
                      <div>
                        <span className="font-medium text-sm">{pm.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">{pm.assets?.asset_code}</span>
                      </div>
                      <Badge className="bg-destructive text-destructive-foreground">Due: {pm.next_due_date}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pmSchedules.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No PM schedules</TableCell></TableRow>
                  )}
                  {pmSchedules.map(pm => {
                    const isOverdue = pm.next_due_date && new Date(pm.next_due_date) < new Date();
                    return (
                      <TableRow key={pm.id}>
                        <TableCell className="font-mono text-xs">{pm.schedule_code}</TableCell>
                        <TableCell className="text-xs">{pm.assets?.asset_code} - {pm.assets?.name}</TableCell>
                        <TableCell>{pm.title}</TableCell>
                        <TableCell className="text-xs">Every {pm.frequency_days || pm.frequency_hours || '-'} {pm.frequency_days ? 'days' : 'hours'}</TableCell>
                        <TableCell>
                          <Badge className={isOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}>
                            {pm.next_due_date || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{pm.estimated_cost?.toLocaleString()} SAR</TableCell>
                        <TableCell className="text-xs">{pm.assigned_to_name || '-'}</TableCell>
                        <TableCell><Badge variant={pm.is_active ? 'default' : 'secondary'}>{pm.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictive Insights Tab */}
        <TabsContent value="predictive">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Predictive Maintenance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Maintenance Count</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Avg Interval</TableHead>
                    <TableHead>Days Since Last</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Next Suggested</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictiveInsights.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No assets to analyze</TableCell></TableRow>
                  )}
                  {predictiveInsights.slice(0, 20).map(insight => (
                    <TableRow key={insight.assetId}>
                      <TableCell className="text-xs font-medium">{insight.assetCode} - {insight.assetName}</TableCell>
                      <TableCell>{insight.maintenanceCount}</TableCell>
                      <TableCell>{insight.totalCost.toLocaleString()} SAR</TableCell>
                      <TableCell>{insight.avgIntervalDays} days</TableCell>
                      <TableCell>{insight.daysSinceLast === 999 ? 'Never' : `${insight.daysSinceLast} days`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${insight.riskScore > 80 ? 'bg-destructive' : insight.riskScore > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${insight.riskScore}%` }}
                            />
                          </div>
                          <span className="text-xs">{insight.riskScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{insight.nextSuggested}</TableCell>
                      <TableCell>
                        <Badge className={insight.riskScore > 80 ? 'bg-destructive text-destructive-foreground' : insight.riskScore > 50 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}>
                          {insight.recommendation}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Tracking Tab */}
        <TabsContent value="sla">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">SLA Compliance by Priority</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slaMetrics.byPriority.map(p => (
                    <div key={p.priority} className="flex items-center justify-between">
                      <Badge className={PRIORITY_COLORS[p.priority]}>{p.priority}</Badge>
                      <div className="flex-1 mx-3">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.compliance}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{p.compliance.toFixed(0)}% ({p.total - p.breached}/{p.total})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">SLA Configuration</CardTitle>
                <Dialog open={slaDialog} onOpenChange={setSlaDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add SLA Config</DialogTitle></DialogHeader>
                    <div className="grid gap-3">
                      <div><Label>Name</Label><Input value={slaForm.name || ''} onChange={e => setSlaForm({ ...slaForm, name: e.target.value })} /></div>
                      <div>
                        <Label>Priority</Label>
                        <Select onValueChange={v => setSlaForm({ ...slaForm, priority: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Response (hrs)</Label><Input type="number" value={slaForm.response_hours || ''} onChange={e => setSlaForm({ ...slaForm, response_hours: +e.target.value })} /></div>
                        <div><Label>Resolution (hrs)</Label><Input type="number" value={slaForm.resolution_hours || ''} onChange={e => setSlaForm({ ...slaForm, resolution_hours: +e.target.value })} /></div>
                      </div>
                      <Button onClick={handleCreateSLA} disabled={!slaForm.name || !slaForm.priority}>Save Config</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {slaConfigs.length === 0 && <p className="text-xs text-muted-foreground">No SLA configs yet</p>}
                  {slaConfigs.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                      <div><Badge className={PRIORITY_COLORS[s.priority]} >{s.priority}</Badge> <span className="ml-2">{s.name}</span></div>
                      <div className="text-muted-foreground">Response: {s.response_hours}h | Resolution: {s.resolution_hours}h</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Resolution: {slaMetrics.avgResolutionHours}h</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={slaMetrics.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="breached" fill="hsl(var(--destructive))" name="Breached" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Forecast Tab */}
        <TabsContent value="cost">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Budgeted</p>
                <p className="text-xl font-bold">{costAnalysis.totalBudgeted.toLocaleString()} SAR</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Actual</p>
                <p className="text-xl font-bold">{costAnalysis.totalActual.toLocaleString()} SAR</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className={`text-xl font-bold ${costAnalysis.totalVariance >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {costAnalysis.totalVariance >= 0 ? '+' : ''}{costAnalysis.totalVariance.toLocaleString()} SAR
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Budgeted</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costForecasts.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No forecasts</TableCell></TableRow>
                  )}
                  {costForecasts.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{f.assets?.asset_code} - {f.assets?.name}</TableCell>
                      <TableCell>{f.forecast_period}</TableCell>
                      <TableCell>{f.budgeted_amount.toLocaleString()}</TableCell>
                      <TableCell>{f.actual_amount.toLocaleString()}</TableCell>
                      <TableCell className={f.variance >= 0 ? 'text-green-500' : 'text-destructive'}>
                        {f.variance >= 0 ? '+' : ''}{f.variance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
