import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEVM, useSubcontractorQuotes } from '@/hooks/useEVM';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Clock, Activity, Target, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  identified: 'bg-muted text-muted-foreground',
  assessed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  implemented: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const payAppStatusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  certified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function EVMDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { snapshots, createSnapshot, changes, createChange, paymentApps, createPaymentApp } = useEVM(selectedProjectId);
  const [showAddSnapshot, setShowAddSnapshot] = useState(false);
  const [showAddChange, setShowAddChange] = useState(false);
  const [showAddPayApp, setShowAddPayApp] = useState(false);

  const snapshotData = snapshots.data || [];
  const changesData = changes.data || [];
  const payAppsData = paymentApps.data || [];
  const latest = snapshotData[snapshotData.length - 1];

  const spiStatus = (spi: number) => spi >= 1 ? 'text-green-600' : spi >= 0.9 ? 'text-yellow-600' : 'text-red-600';
  const cpiStatus = (cpi: number) => cpi >= 1 ? 'text-green-600' : cpi >= 0.9 ? 'text-yellow-600' : 'text-red-600';

  // S-Curve data
  const sCurveData = snapshotData.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM yy'),
    PV: s.pv,
    EV: s.ev,
    AC: s.ac,
  }));

  // Performance trend
  const perfTrend = snapshotData.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM yy'),
    SPI: Number(s.spi.toFixed(2)),
    CPI: Number(s.cpi.toFixed(2)),
  }));

  const totalChangeImpact = changesData.filter(c => c.status === 'approved').reduce((s, c) => s + (c.impact_cost || 0), 0);
  const totalPayAppValue = payAppsData.reduce((s, p) => s + (p.net_payment || 0), 0);

  const handleAddSnapshot = async (fd: FormData) => {
    if (!selectedProjectId) return;
    await createSnapshot.mutateAsync({
      project_id: selectedProjectId,
      snapshot_date: fd.get('snapshot_date') as string,
      reporting_period: fd.get('reporting_period') as string,
      bac: Number(fd.get('bac')) || 0,
      pv: Number(fd.get('pv')) || 0,
      ev: Number(fd.get('ev')) || 0,
      ac: Number(fd.get('ac')) || 0,
      percent_complete: Number(fd.get('percent_complete')) || 0,
      notes: fd.get('notes') as string,
      created_by: user?.id,
    } as any);
    setShowAddSnapshot(false);
  };

  const handleAddChange = async (fd: FormData) => {
    if (!selectedProjectId) return;
    await createChange.mutateAsync({
      project_id: selectedProjectId,
      change_number: `CHG-${Date.now().toString().slice(-6)}`,
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      change_type: fd.get('change_type') as string || 'scope',
      impact_cost: Number(fd.get('impact_cost')) || 0,
      impact_days: Number(fd.get('impact_days')) || 0,
      priority: fd.get('priority') as string || 'medium',
      raised_by: fd.get('raised_by') as string,
      contract_clause: fd.get('contract_clause') as string,
      created_by: user?.id,
    } as any);
    setShowAddChange(false);
  };

  const handleAddPayApp = async (fd: FormData) => {
    if (!selectedProjectId) return;
    await createPaymentApp.mutateAsync({
      project_id: selectedProjectId,
      application_number: `IPA-${Date.now().toString().slice(-6)}`,
      application_date: fd.get('application_date') as string,
      period_from: fd.get('period_from') as string,
      period_to: fd.get('period_to') as string,
      contract_sum: Number(fd.get('contract_sum')) || 0,
      previous_certified: Number(fd.get('previous_certified')) || 0,
      this_period_gross: Number(fd.get('this_period_gross')) || 0,
      cumulative_gross: Number(fd.get('cumulative_gross')) || 0,
      retention_percent: Number(fd.get('retention_percent')) || 5,
      materials_on_site: Number(fd.get('materials_on_site')) || 0,
      deductions: Number(fd.get('deductions')) || 0,
      notes: fd.get('notes') as string,
      created_by: user?.id,
    } as any);
    setShowAddPayApp(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Controls & EVM</h1>
          <p className="text-muted-foreground">Earned Value Management, Change Register & Payment Applications</p>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={v => setSelectedProjectId(v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>
            {(projects || []).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="py-16 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Select a Project</h3>
          <p className="text-muted-foreground">Choose a project to view EVM metrics and controls</p>
        </CardContent></Card>
      ) : (
        <>
          {/* KPI Cards */}
          {latest ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">BAC</div>
                <p className="text-lg font-bold">{(latest.bac / 1e3).toFixed(0)}K</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">% Complete</div>
                <p className="text-lg font-bold">{latest.percent_complete}%</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />SPI</div>
                <p className={`text-lg font-bold ${spiStatus(latest.spi)}`}>{latest.spi.toFixed(2)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />CPI</div>
                <p className={`text-lg font-bold ${cpiStatus(latest.cpi)}`}>{latest.cpi.toFixed(2)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">SV</div>
                <p className={`text-lg font-bold ${latest.sv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(latest.sv / 1e3).toFixed(0)}K</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">CV</div>
                <p className={`text-lg font-bold ${latest.cv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(latest.cv / 1e3).toFixed(0)}K</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">EAC</div>
                <p className="text-lg font-bold">{(latest.eac / 1e3).toFixed(0)}K</p>
              </CardContent></Card>
              <Card><CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">VAC</div>
                <p className={`text-lg font-bold ${latest.vac >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(latest.vac / 1e3).toFixed(0)}K</p>
              </CardContent></Card>
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No EVM snapshots yet. Record your first data point.</CardContent></Card>
          )}

          <Tabs defaultValue="scurve" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="scurve">S-Curve</TabsTrigger>
              <TabsTrigger value="performance">Performance Trend</TabsTrigger>
              <TabsTrigger value="snapshots">Data Points</TabsTrigger>
              <TabsTrigger value="changes">Change Register ({changesData.length})</TabsTrigger>
              <TabsTrigger value="payapps">Payment Applications ({payAppsData.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="scurve">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">S-Curve (PV / EV / AC)</CardTitle>
                    <Button size="sm" onClick={() => setShowAddSnapshot(true)}><Plus className="h-4 w-4 mr-1" />Record Snapshot</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sCurveData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={sCurveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="PV" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} name="Planned Value" />
                        <Area type="monotone" dataKey="EV" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Earned Value" />
                        <Area type="monotone" dataKey="AC" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Actual Cost" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">No data points to display</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader><CardTitle className="text-sm">SPI / CPI Trend</CardTitle></CardHeader>
                <CardContent>
                  {perfTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={perfTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 2]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="SPI" stroke="#8884d8" strokeWidth={2} name="Schedule Performance" />
                        <Line type="monotone" dataKey="CPI" stroke="#22c55e" strokeWidth={2} name="Cost Performance" />
                        <Line type="monotone" dataKey={() => 1} stroke="#94a3b8" strokeDasharray="5 5" name="Baseline (1.0)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No performance data</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="snapshots">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">EVM Data Points</CardTitle>
                    <Button size="sm" onClick={() => setShowAddSnapshot(true)}><Plus className="h-4 w-4 mr-1" />Record</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">BAC</TableHead>
                        <TableHead className="text-right">PV</TableHead>
                        <TableHead className="text-right">EV</TableHead>
                        <TableHead className="text-right">AC</TableHead>
                        <TableHead className="text-right">SPI</TableHead>
                        <TableHead className="text-right">CPI</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshotData.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{format(new Date(s.snapshot_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{s.reporting_period || '-'}</TableCell>
                          <TableCell className="text-right">{s.bac.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{s.pv.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{s.ev.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{s.ac.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-medium ${spiStatus(s.spi)}`}>{s.spi.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-medium ${cpiStatus(s.cpi)}`}>{s.cpi.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{s.percent_complete}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="changes">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Change Register (Impact: {totalChangeImpact.toLocaleString()} SAR)</CardTitle>
                    <Button size="sm" onClick={() => setShowAddChange(true)}><Plus className="h-4 w-4 mr-1" />Register Change</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Change #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>{t('common.type')}</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Cost Impact</TableHead>
                        <TableHead className="text-right">Days Impact</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>Raised</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changesData.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No changes registered</TableCell></TableRow>
                      ) : changesData.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.change_number}</TableCell>
                          <TableCell className="font-medium">{c.title}</TableCell>
                          <TableCell><Badge variant="outline">{c.change_type}</Badge></TableCell>
                          <TableCell><Badge variant={c.priority === 'critical' ? 'destructive' : 'outline'}>{c.priority}</Badge></TableCell>
                          <TableCell className={`text-right font-medium ${c.impact_cost > 0 ? 'text-red-600' : ''}`}>
                            {c.impact_cost > 0 ? `+${c.impact_cost.toLocaleString()}` : c.impact_cost.toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right ${c.impact_days > 0 ? 'text-red-600' : ''}`}>
                            {c.impact_days > 0 ? `+${c.impact_days}d` : `${c.impact_days}d`}
                          </TableCell>
                          <TableCell><Badge className={statusColors[c.status]}>{c.status}</Badge></TableCell>
                          <TableCell>{format(new Date(c.raised_date), 'dd MMM')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payapps">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Interim Payment Applications (Total: {totalPayAppValue.toLocaleString()} SAR)</CardTitle>
                    <Button size="sm" onClick={() => setShowAddPayApp(true)}><Plus className="h-4 w-4 mr-1" />New Application</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>App #</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">This Period</TableHead>
                        <TableHead className="text-right">Retention</TableHead>
                        <TableHead className="text-right">Net Payment</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payAppsData.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payment applications</TableCell></TableRow>
                      ) : payAppsData.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.application_number}</TableCell>
                          <TableCell>{format(new Date(p.application_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{p.period_from && p.period_to ? `${format(new Date(p.period_from), 'dd MMM')} - ${format(new Date(p.period_to), 'dd MMM')}` : '-'}</TableCell>
                          <TableCell className="text-right">{p.this_period_gross.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-muted-foreground">-{p.retention_amount.toLocaleString()} ({p.retention_percent}%)</TableCell>
                          <TableCell className="text-right font-bold text-primary">{p.net_payment.toLocaleString()}</TableCell>
                          <TableCell><Badge className={payAppStatusColors[p.status]}>{p.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Snapshot Dialog */}
      <Dialog open={showAddSnapshot} onOpenChange={setShowAddSnapshot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record EVM Snapshot</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAddSnapshot(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Snapshot Date</Label><Input name="snapshot_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              <div className="space-y-2"><Label>Reporting Period</Label><Input name="reporting_period" placeholder="e.g. March 2026" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>BAC (Budget at Completion)</Label><Input name="bac" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>% Complete</Label><Input name="percent_complete" type="number" step="0.1" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>PV (Planned Value)</Label><Input name="pv" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>EV (Earned Value)</Label><Input name="ev" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>AC (Actual Cost)</Label><Input name="ac" type="number" step="0.01" required /></div>
            </div>
            <div className="space-y-2"><Label>{t('common.notes')}</Label><Input name="notes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddSnapshot(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createSnapshot.isPending}>Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Change Dialog */}
      <Dialog open={showAddChange} onOpenChange={setShowAddChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Change</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAddChange(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input name="title" required /></div>
            <div className="space-y-2"><Label>{t('common.description')}</Label><Input name="description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.type')}</Label>
                <select name="change_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="scope">Scope</option><option value="cost">Cost</option><option value="schedule">Schedule</option><option value="design">Design</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select name="priority" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cost Impact (SAR)</Label><Input name="impact_cost" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Days Impact</Label><Input name="impact_days" type="number" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Raised By</Label><Input name="raised_by" /></div>
              <div className="space-y-2"><Label>Contract Clause</Label><Input name="contract_clause" placeholder="e.g. NEC4 cl.60" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddChange(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createChange.isPending}>Register</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Application Dialog */}
      <Dialog open={showAddPayApp} onOpenChange={setShowAddPayApp}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Interim Payment Application</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAddPayApp(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>App Date</Label><Input name="application_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              <div className="space-y-2"><Label>Period From</Label><Input name="period_from" type="date" /></div>
              <div className="space-y-2"><Label>Period To</Label><Input name="period_to" type="date" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contract Sum</Label><Input name="contract_sum" type="number" step="0.01" /></div>
              <div className="space-y-2"><Label>Previous Certified</Label><Input name="previous_certified" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>This Period (Gross)</Label><Input name="this_period_gross" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>Cumulative Gross</Label><Input name="cumulative_gross" type="number" step="0.01" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Retention %</Label><Input name="retention_percent" type="number" step="0.1" defaultValue="5" /></div>
              <div className="space-y-2"><Label>Materials on Site</Label><Input name="materials_on_site" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Deductions</Label><Input name="deductions" type="number" step="0.01" defaultValue="0" /></div>
            </div>
            <div className="space-y-2"><Label>{t('common.notes')}</Label><Input name="notes" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddPayApp(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createPaymentApp.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
