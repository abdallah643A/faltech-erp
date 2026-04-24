import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Plus, Users, AlertTriangle, TrendingUp, Calendar, Download, Filter, HardHat, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import * as XLSX from 'xlsx';

const TRADES = ['Civil', 'Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'Steel', 'Painting', 'Carpentry', 'Welding', 'Safety', 'IT', 'Admin', 'Management', 'Other'];
const SKILLS = ['general', 'junior', 'mid', 'senior', 'lead', 'specialist', 'expert'];
const LABOR_SOURCES = ['internal', 'external', 'subcontractor'];
const STATUSES = ['planned', 'mobilizing', 'active', 'demobilizing', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(45 93% 47%)', 'hsl(0 72% 51%)', 'hsl(262 83% 58%)', 'hsl(199 89% 48%)'];

const statusColor: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800', mobilizing: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800', demobilizing: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-800',
};

const priorityColor: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-800',
};

const emptyForm = {
  role_title: '', trade: '', skill_category: 'general', department: '', business_unit: '',
  required_count: 1, actual_count: 0, labor_source: 'internal',
  mobilization_date: '', demobilization_date: '', daily_cost_rate: 0, monthly_cost_rate: 0,
  status: 'planned', priority: 'medium', notes: '', project_id: '',
};

export default function WorkforcePlanning() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { projects = [] } = useProjects();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [tab, setTab] = useState('overview');

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['workforce-demand', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('workforce_demand' as any).select('*').order('mobilization_date', { ascending: true }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createDemand = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const mobDate = form.mobilization_date || null;
      const demobDate = form.demobilization_date || null;
      const days = mobDate && demobDate ? Math.max(differenceInDays(new Date(demobDate), new Date(mobDate)), 1) : 30;
      const totalCost = form.monthly_cost_rate > 0
        ? form.monthly_cost_rate * form.required_count * (days / 30)
        : form.daily_cost_rate * form.required_count * days;
      const payload: any = {
        ...form,
        mobilization_date: mobDate,
        demobilization_date: demobDate,
        project_id: form.project_id || null,
        total_estimated_cost: totalCost,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      if (!payload.project_id) delete payload.project_id;
      const { error } = await (supabase.from('workforce_demand' as any).insert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workforce-demand'] });
      setShowAdd(false);
      setForm({ ...emptyForm });
      toast.success('Demand record created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filtered data
  const filtered = useMemo(() => {
    return demands.filter((d: any) => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterSource !== 'all' && d.labor_source !== filterSource) return false;
      return true;
    });
  }, [demands, filterStatus, filterSource]);

  // Metrics
  const totalRequired = demands.reduce((s: number, d: any) => s + (d.required_count || 0), 0);
  const totalActual = demands.reduce((s: number, d: any) => s + (d.actual_count || 0), 0);
  const totalGap = totalRequired - totalActual;
  const totalCost = demands.reduce((s: number, d: any) => s + Number(d.total_estimated_cost || 0), 0);
  const criticalShortages = demands.filter((d: any) => {
    const gap = (d.required_count || 0) - (d.actual_count || 0);
    return gap > 0 && d.status !== 'completed' && d.status !== 'cancelled';
  });
  const upcomingMob = demands.filter((d: any) => {
    if (!d.mobilization_date || d.status !== 'planned') return false;
    const mobDate = new Date(d.mobilization_date);
    return isBefore(mobDate, addDays(new Date(), 30)) && isAfter(mobDate, new Date());
  });

  // Chart data
  const byTrade = useMemo(() => {
    const map: Record<string, { required: number; actual: number }> = {};
    demands.forEach((d: any) => {
      const key = d.trade || 'Other';
      if (!map[key]) map[key] = { required: 0, actual: 0 };
      map[key].required += d.required_count || 0;
      map[key].actual += d.actual_count || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v, gap: v.required - v.actual }));
  }, [demands]);

  const bySource = useMemo(() => {
    const map: Record<string, number> = {};
    demands.forEach((d: any) => {
      const key = d.labor_source || 'internal';
      map[key] = (map[key] || 0) + (d.required_count || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [demands]);

  const byProject = useMemo(() => {
    const map: Record<string, { name: string; required: number; actual: number }> = {};
    demands.forEach((d: any) => {
      const proj = projects.find(p => p.id === d.project_id);
      const key = d.project_id || 'unassigned';
      const name = proj?.name || 'Unassigned';
      if (!map[key]) map[key] = { name, required: 0, actual: 0 };
      map[key].required += d.required_count || 0;
      map[key].actual += d.actual_count || 0;
    });
    return Object.values(map);
  }, [demands, projects]);

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  const exportExcel = () => {
    const rows = filtered.map((d: any) => {
      const proj = projects.find(p => p.id === d.project_id);
      return {
        'Role': d.role_title, 'Trade': d.trade, 'Skill': d.skill_category,
        'Department': d.department, 'Business Unit': d.business_unit,
        'Project': proj?.name || '', 'Required': d.required_count, 'Actual': d.actual_count,
        'Gap': (d.required_count || 0) - (d.actual_count || 0),
        'Labor Source': d.labor_source, 'Status': d.status, 'Priority': d.priority,
        'Mobilization': d.mobilization_date, 'Demobilization': d.demobilization_date,
        'Daily Rate': d.daily_cost_rate, 'Monthly Rate': d.monthly_cost_rate,
        'Est. Cost': d.total_estimated_cost,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Workforce Demand');
    XLSX.writeFile(wb, `workforce_planning_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" /> Workforce Planning
          </h1>
          <p className="text-muted-foreground">Plan headcount demand by role, trade, skill, project, and department</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Demand</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{totalRequired}</p>
          <p className="text-xs text-muted-foreground">Required HC</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold">{totalActual}</p>
          <p className="text-xs text-muted-foreground">Actual HC</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${totalGap > 0 ? 'text-destructive' : 'text-green-600'}`} />
          <p className={`text-2xl font-bold ${totalGap > 0 ? 'text-destructive' : 'text-green-600'}`}>{totalGap}</p>
          <p className="text-xs text-muted-foreground">Shortage</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Calendar className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{upcomingMob.length}</p>
          <p className="text-xs text-muted-foreground">Upcoming (30d)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{fmt(totalCost)}</p>
          <p className="text-xs text-muted-foreground">Est. Cost</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demand">Demand Register</TabsTrigger>
          <TabsTrigger value="shortages">Shortages ({criticalShortages.length})</TabsTrigger>
          <TabsTrigger value="byProject">By Project</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Headcount by Trade</CardTitle></CardHeader>
              <CardContent>
                {byTrade.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={byTrade}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Legend />
                      <Bar dataKey="required" fill="hsl(var(--primary))" name="Required" />
                      <Bar dataKey="actual" fill="hsl(142 76% 36%)" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">By Labor Source</CardTitle></CardHeader>
              <CardContent>
                {bySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                        {bySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming mobilizations */}
          {upcomingMob.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-500" />Upcoming Mobilizations (Next 30 Days)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Required</TableHead>
                    <TableHead>Mob. Date</TableHead><TableHead>Source</TableHead><TableHead>Priority</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {upcomingMob.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.role_title}</TableCell>
                        <TableCell>{d.trade || '—'}</TableCell>
                        <TableCell>{d.required_count}</TableCell>
                        <TableCell>{d.mobilization_date}</TableCell>
                        <TableCell><Badge variant="outline">{d.labor_source}</Badge></TableCell>
                        <TableCell><Badge className={priorityColor[d.priority] || ''}>{d.priority}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Demand Register */}
        <TabsContent value="demand" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {LABOR_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Skill</TableHead>
                  <TableHead>Dept / BU</TableHead><TableHead>Project</TableHead>
                  <TableHead>Required</TableHead><TableHead>Actual</TableHead><TableHead>Variance</TableHead>
                  <TableHead>Source</TableHead><TableHead>Mob</TableHead><TableHead>Demob</TableHead>
                  <TableHead>Cost</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No demand records</TableCell></TableRow>
                  ) : filtered.map((d: any) => {
                    const gap = (d.required_count || 0) - (d.actual_count || 0);
                    const proj = projects.find(p => p.id === d.project_id);
                    const fillPct = d.required_count > 0 ? Math.min(Math.round((d.actual_count / d.required_count) * 100), 100) : 0;
                    return (
                      <TableRow key={d.id} className={gap > 0 && d.status !== 'completed' ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{d.role_title}</TableCell>
                        <TableCell>{d.trade || '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{d.skill_category}</Badge></TableCell>
                        <TableCell className="text-xs">{[d.department, d.business_unit].filter(Boolean).join(' / ') || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{proj?.name || '—'}</TableCell>
                        <TableCell>{d.required_count}</TableCell>
                        <TableCell>{d.actual_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Progress value={fillPct} className="h-2 w-12" />
                            <span className={`text-xs font-medium ${gap > 0 ? 'text-destructive' : 'text-green-600'}`}>
                              {gap > 0 ? `-${gap}` : gap === 0 ? '✓' : `+${Math.abs(gap)}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{d.labor_source}</Badge></TableCell>
                        <TableCell className="text-xs">{d.mobilization_date || '—'}</TableCell>
                        <TableCell className="text-xs">{d.demobilization_date || '—'}</TableCell>
                        <TableCell className="text-xs">{fmt(Number(d.total_estimated_cost || 0))}</TableCell>
                        <TableCell><Badge className={`text-xs ${statusColor[d.status] || ''}`}>{d.status}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${priorityColor[d.priority] || ''}`}>{d.priority}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shortages Tab */}
        <TabsContent value="shortages" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Active Shortages
            </CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Project</TableHead>
                  <TableHead>Required</TableHead><TableHead>Actual</TableHead><TableHead>Shortage</TableHead>
                  <TableHead>Mob Date</TableHead><TableHead>Priority</TableHead><TableHead>Source</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {criticalShortages.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-green-600 py-8">No shortages — all positions filled</TableCell></TableRow>
                  ) : criticalShortages.sort((a: any, b: any) => {
                    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (pOrder[a.priority as keyof typeof pOrder] ?? 2) - (pOrder[b.priority as keyof typeof pOrder] ?? 2);
                  }).map((d: any) => {
                    const gap = (d.required_count || 0) - (d.actual_count || 0);
                    const proj = projects.find(p => p.id === d.project_id);
                    return (
                      <TableRow key={d.id} className="bg-destructive/5">
                        <TableCell className="font-medium">{d.role_title}</TableCell>
                        <TableCell>{d.trade || '—'}</TableCell>
                        <TableCell className="text-xs">{proj?.name || '—'}</TableCell>
                        <TableCell>{d.required_count}</TableCell>
                        <TableCell>{d.actual_count}</TableCell>
                        <TableCell className="text-destructive font-bold">-{gap}</TableCell>
                        <TableCell className="text-xs">{d.mobilization_date || '—'}</TableCell>
                        <TableCell><Badge className={`text-xs ${priorityColor[d.priority] || ''}`}>{d.priority}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{d.labor_source}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Project Tab */}
        <TabsContent value="byProject" className="space-y-4">
          {byProject.length > 0 ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Headcount by Project</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byProject} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} fontSize={11} /><Tooltip /><Legend />
                      <Bar dataKey="required" fill="hsl(var(--primary))" name="Required" />
                      <Bar dataKey="actual" fill="hsl(142 76% 36%)" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {byProject.map((p, i) => {
                  const gap = p.required - p.actual;
                  const pct = p.required > 0 ? Math.round((p.actual / p.required) * 100) : 0;
                  return (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <p className="font-medium text-sm truncate">{p.name}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                          <div><p className="font-bold text-lg">{p.required}</p><p className="text-muted-foreground">Required</p></div>
                          <div><p className="font-bold text-lg text-green-600">{p.actual}</p><p className="text-muted-foreground">Actual</p></div>
                          <div><p className={`font-bold text-lg ${gap > 0 ? 'text-destructive' : 'text-green-600'}`}>{gap > 0 ? `-${gap}` : '✓'}</p><p className="text-muted-foreground">Gap</p></div>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{pct}% staffed</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : <Card><CardContent className="py-8 text-center text-muted-foreground">No project data</CardContent></Card>}
        </TabsContent>
      </Tabs>

      {/* Add Demand Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Workforce Demand</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Role Title *</Label><Input value={form.role_title} onChange={e => setForm(p => ({ ...p, role_title: e.target.value }))} placeholder="e.g. Site Engineer" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Trade</Label>
                <Select value={form.trade} onValueChange={v => setForm(p => ({ ...p, trade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                  <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Skill Level</Label>
                <Select value={form.skill_category} onValueChange={v => setForm(p => ({ ...p, skill_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
              <div><Label>Business Unit</Label><Input value={form.business_unit} onChange={e => setForm(p => ({ ...p, business_unit: e.target.value }))} /></div>
            </div>
            <div><Label>Project</Label>
              <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Required HC *</Label><Input type="number" min={1} value={form.required_count} onChange={e => setForm(p => ({ ...p, required_count: Number(e.target.value) }))} /></div>
              <div><Label>Actual HC</Label><Input type="number" min={0} value={form.actual_count} onChange={e => setForm(p => ({ ...p, actual_count: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Labor Source</Label>
              <Select value={form.labor_source} onValueChange={v => setForm(p => ({ ...p, labor_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LABOR_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mobilization Date</Label><Input type="date" value={form.mobilization_date} onChange={e => setForm(p => ({ ...p, mobilization_date: e.target.value }))} /></div>
              <div><Label>Demobilization Date</Label><Input type="date" value={form.demobilization_date} onChange={e => setForm(p => ({ ...p, demobilization_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Daily Cost Rate</Label><Input type="number" min={0} value={form.daily_cost_rate} onChange={e => setForm(p => ({ ...p, daily_cost_rate: Number(e.target.value) }))} /></div>
              <div><Label>Monthly Cost Rate</Label><Input type="number" min={0} value={form.monthly_cost_rate} onChange={e => setForm(p => ({ ...p, monthly_cost_rate: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createDemand.mutate()} disabled={!form.role_title || form.required_count < 1}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
