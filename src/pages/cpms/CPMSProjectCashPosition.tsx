import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign, Plus, TrendingUp, TrendingDown, AlertTriangle, Download, BarChart3,
  ArrowUpDown, XCircle, Calendar, Wallet, CreditCard, Users, Truck, Settings, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart,
} from 'recharts';
import * as XLSX from 'xlsx';
import { format, addMonths, startOfMonth, parseISO } from 'date-fns';

const CASH_IN_CATEGORIES = [
  { value: 'billing', label: 'Billing / Invoicing', icon: FileText },
  { value: 'retention_release', label: 'Retention Release', icon: Wallet },
  { value: 'collections', label: 'Collections Forecast', icon: CreditCard },
  { value: 'variation_income', label: 'Variation / CO Income', icon: TrendingUp },
  { value: 'other_income', label: 'Other Income', icon: DollarSign },
];

const CASH_OUT_CATEGORIES = [
  { value: 'purchase_commitments', label: 'Purchase Commitments', icon: CreditCard },
  { value: 'subcontractor', label: 'Subcontractor Claims', icon: Users },
  { value: 'payroll', label: 'Payroll / Labor', icon: Users },
  { value: 'equipment', label: 'Equipment Cost', icon: Truck },
  { value: 'overhead', label: 'Overhead Allocations', icon: Settings },
  { value: 'retention_held', label: 'Retention Held', icon: Wallet },
  { value: 'other_expense', label: 'Other Expense', icon: DollarSign },
];

const ALL_CATEGORIES = [...CASH_IN_CATEGORIES, ...CASH_OUT_CATEGORIES];
const CONFIDENCE_OPTIONS = ['high', 'medium', 'low'];

const emptyForm = {
  entry_type: 'cash_in',
  category: 'billing',
  description: '',
  forecast_month: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  forecast_amount: 0,
  actual_amount: 0,
  confidence: 'medium',
  source_ref: '',
  notes: '',
  is_recurring: false,
  recurring_months: 0,
  project_id: '',
};

export default function CPMSProjectCashPosition() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [filterProject, setFilterProject] = useState('all');
  const [forecastMonths, setForecastMonths] = useState(12);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [entRes, projRes] = await Promise.all([
        supabase.from('cpms_cash_flow_entries').select('*').order('forecast_month'),
        supabase.from('cpms_projects').select('id, name, code, contract_value, status').order('name'),
      ]);
      setEntries(entRes.data || []);
      setProjects(projRes.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || '-';

  // Filtered entries
  const filtered = useMemo(() => {
    if (filterProject === 'all') return entries;
    return entries.filter(e => e.project_id === filterProject);
  }, [entries, filterProject]);

  // Monthly aggregation for chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; cashIn: number; cashOut: number; actualIn: number; actualOut: number }> = {};
    const now = startOfMonth(new Date());
    for (let i = 0; i < forecastMonths; i++) {
      const m = format(addMonths(now, i), 'yyyy-MM');
      map[m] = { month: m, cashIn: 0, cashOut: 0, actualIn: 0, actualOut: 0 };
    }
    filtered.forEach(e => {
      const m = e.forecast_month?.substring(0, 7);
      if (!map[m]) return;
      if (e.entry_type === 'cash_in') {
        map[m].cashIn += e.forecast_amount || 0;
        map[m].actualIn += e.actual_amount || 0;
      } else {
        map[m].cashOut += e.forecast_amount || 0;
        map[m].actualOut += e.actual_amount || 0;
      }
    });
    let cumulative = 0;
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(d => {
      const net = d.cashIn - d.cashOut;
      cumulative += net;
      return {
        ...d,
        net,
        cumulative,
        label: format(parseISO(d.month + '-01'), 'MMM yyyy'),
        fundingRisk: cumulative < 0,
      };
    });
  }, [filtered, forecastMonths]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { category: string; type: string; total: number }> = {};
    filtered.forEach(e => {
      const key = e.category;
      if (!map[key]) map[key] = { category: key, type: e.entry_type, total: 0 };
      map[key].total += e.forecast_amount || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // KPIs
  const kpis = useMemo(() => {
    const totalIn = filtered.filter(e => e.entry_type === 'cash_in').reduce((s, e) => s + (e.forecast_amount || 0), 0);
    const totalOut = filtered.filter(e => e.entry_type === 'cash_out').reduce((s, e) => s + (e.forecast_amount || 0), 0);
    const netPosition = totalIn - totalOut;
    const actualIn = filtered.filter(e => e.entry_type === 'cash_in').reduce((s, e) => s + (e.actual_amount || 0), 0);
    const actualOut = filtered.filter(e => e.entry_type === 'cash_out').reduce((s, e) => s + (e.actual_amount || 0), 0);
    const riskMonths = monthlyData.filter(m => m.fundingRisk).length;
    const lowestPosition = Math.min(...monthlyData.map(m => m.cumulative), 0);
    return { totalIn, totalOut, netPosition, actualIn, actualOut, riskMonths, lowestPosition };
  }, [filtered, monthlyData]);

  // Project summary
  const projectSummary = useMemo(() => {
    const map: Record<string, { id: string; name: string; contract: number; cashIn: number; cashOut: number; net: number }> = {};
    entries.forEach(e => {
      if (!map[e.project_id]) {
        const p = projects.find(pr => pr.id === e.project_id);
        map[e.project_id] = { id: e.project_id, name: p?.name || '-', contract: p?.contract_value || 0, cashIn: 0, cashOut: 0, net: 0 };
      }
      if (e.entry_type === 'cash_in') map[e.project_id].cashIn += e.forecast_amount || 0;
      else map[e.project_id].cashOut += e.forecast_amount || 0;
    });
    return Object.values(map).map(p => ({ ...p, net: p.cashIn - p.cashOut })).sort((a, b) => a.net - b.net);
  }, [entries, projects]);

  // CRUD
  const openNew = () => { setEditing(null); setForm({ ...emptyForm, project_id: filterProject !== 'all' ? filterProject : '' }); setShowDialog(true); };
  const openEdit = (e: any) => { setEditing(e); setForm({ ...e }); setShowDialog(true); };

  const save = async () => {
    try {
      const payload: any = { ...form, created_by: user?.id };
      if (activeCompanyId) payload.company_id = activeCompanyId;
      delete payload.variance;

      if (editing) {
        delete payload.created_at; delete payload.updated_at;
        const { error } = await supabase.from('cpms_cash_flow_entries').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        // Handle recurring
        if (payload.is_recurring && payload.recurring_months > 0) {
          const rows = [];
          for (let i = 0; i < payload.recurring_months; i++) {
            rows.push({
              ...payload,
              forecast_month: format(addMonths(parseISO(payload.forecast_month), i), 'yyyy-MM-dd'),
              is_recurring: i === 0,
            });
          }
          const { error } = await supabase.from('cpms_cash_flow_entries').insert(rows);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('cpms_cash_flow_entries').insert(payload);
          if (error) throw error;
        }
      }
      toast({ title: editing ? 'Entry updated' : 'Entry created' });
      setShowDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('cpms_cash_flow_entries').delete().eq('id', id);
    fetchAll();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(e => ({
      Project: getProjectName(e.project_id),
      Type: e.entry_type,
      Category: ALL_CATEGORIES.find(c => c.value === e.category)?.label || e.category,
      Description: e.description,
      Month: e.forecast_month,
      'Forecast Amount': e.forecast_amount,
      'Actual Amount': e.actual_amount,
      Variance: e.variance,
      Confidence: e.confidence,
      Source: e.source_ref,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, 'project_cash_position.xlsx');
  };

  const getCategoryLabel = (val: string) => ALL_CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.cpmsProjectCashPosition') || 'Project Cash Position'}</h1>
          <p className="text-muted-foreground text-sm">Cash-in vs cash-out forecasting with funding risk analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-foreground">{(kpis.totalIn / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Total Cash In</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
          <div className="text-lg font-bold text-foreground">{(kpis.totalOut / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Total Cash Out</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <div className={`text-lg font-bold ${kpis.netPosition >= 0 ? 'text-green-600' : 'text-destructive'}`}>{(kpis.netPosition / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Net Position</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-foreground">{(kpis.actualIn / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Actual In</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
          <div className="text-lg font-bold text-foreground">{(kpis.actualOut / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Actual Out</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${kpis.riskMonths > 0 ? 'text-destructive' : 'text-green-500'}`} />
          <div className={`text-lg font-bold ${kpis.riskMonths > 0 ? 'text-destructive' : 'text-green-600'}`}>{kpis.riskMonths}</div>
          <div className="text-xs text-muted-foreground">Risk Months</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Wallet className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <div className={`text-lg font-bold ${kpis.lowestPosition < 0 ? 'text-destructive' : 'text-foreground'}`}>{(kpis.lowestPosition / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground">Lowest Position</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={forecastMonths.toString()} onValueChange={v => setForecastMonths(+v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 Months</SelectItem>
            <SelectItem value="12">12 Months</SelectItem>
            <SelectItem value="18">18 Months</SelectItem>
            <SelectItem value="24">24 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Cash Flow Chart</TabsTrigger>
          <TabsTrigger value="entries">Entries ({filtered.length})</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
        </TabsList>

        {/* Overview Chart */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Cash Flow & Cumulative Position</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="bar" orientation="left" tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis yAxisId="line" orientation="right" tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Legend />
                    <ReferenceLine yAxisId="line" y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <Bar yAxisId="bar" dataKey="cashIn" fill="#10b981" name="Cash In" stackId="a" />
                    <Bar yAxisId="bar" dataKey="cashOut" fill="#ef4444" name="Cash Out" stackId="b" />
                    <Line yAxisId="line" type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={3} name="Cumulative Position" dot={{ r: 4 }} />
                    <Line yAxisId="line" type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Monthly Net" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Funding risk timeline */}
            {monthlyData.some(m => m.fundingRisk) && (
              <Card className="border-destructive">
                <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Funding Risk Alert</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {monthlyData.filter(m => m.fundingRisk).map(m => (
                      <div key={m.month} className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                        <div className="text-sm font-medium text-foreground">{m.label}</div>
                        <div className="text-destructive font-bold">{(m.cumulative / 1000).toFixed(1)}K</div>
                        <div className="text-xs text-muted-foreground">Shortfall</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Entries Table */}
        <TabsContent value="entries">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Forecast</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No entries found. Add cash flow forecasts to get started.</TableCell></TableRow>
                    ) : filtered.map(e => (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(e)}>
                        <TableCell className="text-xs">{getProjectName(e.project_id)}</TableCell>
                        <TableCell>
                          <Badge variant={e.entry_type === 'cash_in' ? 'default' : 'destructive'} className="text-xs">
                            {e.entry_type === 'cash_in' ? '↑ In' : '↓ Out'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{getCategoryLabel(e.category)}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{e.description || '-'}</TableCell>
                        <TableCell className="text-xs">{e.forecast_month ? format(parseISO(e.forecast_month), 'MMM yyyy') : '-'}</TableCell>
                        <TableCell className="text-right font-medium">{(e.forecast_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(e.actual_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-medium ${(e.variance || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {(e.variance || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${e.confidence === 'high' ? 'border-green-500 text-green-600' : e.confidence === 'low' ? 'border-destructive text-destructive' : ''}`}>
                            {e.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Project */}
        <TabsContent value="projects">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectSummary.map(p => {
              const ratio = p.contract > 0 ? ((p.cashIn / p.contract) * 100) : 0;
              return (
                <Card key={p.id} className={p.net < 0 ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {p.name}
                      {p.net < 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">Contract: {p.contract.toLocaleString()}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-green-600 font-bold text-sm">{(p.cashIn / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-muted-foreground">Cash In</div>
                      </div>
                      <div>
                        <div className="text-destructive font-bold text-sm">{(p.cashOut / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-muted-foreground">Cash Out</div>
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${p.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>{(p.net / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-muted-foreground">Net</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Billing vs Contract</span>
                        <span className="text-foreground">{ratio.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(ratio, 100)} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {projectSummary.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">No project data available</div>
            )}
          </div>
        </TabsContent>

        {/* Category Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base text-green-600">Cash In by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBreakdown.filter(c => c.type === 'cash_in')} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={130} tickFormatter={v => getCategoryLabel(v)} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive">Cash Out by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBreakdown.filter(c => c.type === 'cash_out')} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={130} tickFormatter={v => getCategoryLabel(v)} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cash Flow Entry' : 'New Cash Flow Entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v, category: v === 'cash_in' ? 'billing' : 'purchase_commitments' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_in">Cash In ↑</SelectItem>
                  <SelectItem value="cash_out">Cash Out ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.entry_type === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES).map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forecast Month *</Label>
              <Input type="date" value={form.forecast_month || ''} onChange={e => setForm({ ...form, forecast_month: e.target.value })} />
            </div>
            <div>
              <Label>Forecast Amount *</Label>
              <Input type="number" value={form.forecast_amount} onChange={e => setForm({ ...form, forecast_amount: +e.target.value })} />
            </div>
            <div>
              <Label>Actual Amount</Label>
              <Input type="number" value={form.actual_amount} onChange={e => setForm({ ...form, actual_amount: +e.target.value })} />
            </div>
            <div>
              <Label>Confidence</Label>
              <Select value={form.confidence} onValueChange={v => setForm({ ...form, confidence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONFIDENCE_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source Reference</Label>
              <Input value={form.source_ref || ''} onChange={e => setForm({ ...form, source_ref: e.target.value })} placeholder="e.g. PO-1234, IPC-003" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {!editing && (
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
                  <Label>Recurring</Label>
                </div>
                {form.is_recurring && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">For</Label>
                    <Input type="number" className="w-20" value={form.recurring_months} onChange={e => setForm({ ...form, recurring_months: +e.target.value })} min={1} max={24} />
                    <Label className="text-xs">months</Label>
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.project_id || !form.forecast_amount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
