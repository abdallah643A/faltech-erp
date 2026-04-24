import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Plus, AlertTriangle, CheckCircle, Clock, XCircle, Archive, BarChart2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'destructive' },
  { value: 'high', label: 'High', color: 'destructive' },
  { value: 'medium', label: 'Medium', color: 'secondary' },
  { value: 'low', label: 'Low', color: 'outline' },
] as const;

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'partial', label: 'Partially Fulfilled' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

const RELEASE_RULES = [
  { value: 'manual', label: 'Manual Release' },
  { value: 'on_production', label: 'On Production Start' },
  { value: 'on_delivery', label: 'On Delivery' },
  { value: 'on_date', label: 'On Specific Date' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ProjectStockReservation() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const [tab, setTab] = useState('reservations');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', project: 'all' });
  const [form, setForm] = useState({
    project_id: '', item_code: '', item_description: '', work_package: '',
    priority: 'medium', required_date: '', reserved_qty: 0, unit: 'EA',
    warehouse: '', release_rule: 'manual', auto_release_date: '', notes: '',
  });

  // Queries
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['stock-reservations', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('project_stock_reservations' as any)
        .select('*').order('required_date', { ascending: true }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ['stock-conflicts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('stock_reservation_conflicts' as any)
        .select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-simple', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('projects').select('id, name, status');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.order('name').limit(200);
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items-list-simple', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('id, item_code, description');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.order('item_code').limit(500);
      return data || [];
    },
  });

  // Mutations
  const createReservation = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await (supabase.from('project_stock_reservations' as any).insert(r) as any);
      if (error) throw error;
      // Check for conflicts after inserting
      await checkConflicts(r.item_code, r.reserved_qty);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-reservations'] });
      qc.invalidateQueries({ queryKey: ['stock-conflicts'] });
      toast({ title: 'Reservation created' });
      setShowCreate(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateReservation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('project_stock_reservations' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-reservations'] });
      toast({ title: 'Reservation updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const checkConflicts = async (itemCode: string, qty: number) => {
    // Get all active reservations for this item
    const { data: existing } = await (supabase.from('project_stock_reservations' as any)
      .select('*').eq('item_code', itemCode).in('status', ['active', 'partial']) as any);
    if (!existing || existing.length < 2) return;

    const totalDemand = existing.reduce((sum: number, r: any) => sum + Number(r.reserved_qty), 0);
    // Simple conflict detection: if total demand seems high, log a warning
    if (totalDemand > qty * 2) {
      await (supabase.from('stock_reservation_conflicts' as any).insert({
        company_id: activeCompanyId,
        reservation_id: existing[0].id,
        conflicting_reservation_id: existing[1]?.id,
        item_code: itemCode,
        item_description: existing[0].item_description,
        conflict_type: 'over_allocation',
        total_demand: totalDemand,
        available_stock: 0,
        shortage: totalDemand,
        severity: 'warning',
      }) as any);
    }
  };

  const handleRelease = (r: any) => {
    updateReservation.mutate({
      id: r.id, status: 'fulfilled',
      released_qty: r.reserved_qty, released_by: user?.id, released_at: new Date().toISOString(),
    });
  };

  const handlePartialRelease = (r: any) => {
    const releaseQty = Math.min(r.reserved_qty / 2, r.reserved_qty - r.released_qty);
    updateReservation.mutate({
      id: r.id, status: 'partial',
      released_qty: (r.released_qty || 0) + releaseQty,
    });
  };

  const handleCancel = (r: any) => updateReservation.mutate({ id: r.id, status: 'cancelled' });

  const handleCreate = () => {
    const item = items.find((i: any) => i.item_code === form.item_code);
    createReservation.mutate({
      company_id: activeCompanyId,
      project_id: form.project_id || null,
      item_id: item?.id || null,
      item_code: form.item_code,
      item_description: form.item_description || item?.description || form.item_code,
      work_package: form.work_package || null,
      priority: form.priority,
      required_date: form.required_date,
      reserved_qty: form.reserved_qty,
      unit: form.unit,
      warehouse: form.warehouse || null,
      release_rule: form.release_rule,
      auto_release_date: form.auto_release_date || null,
      notes: form.notes || null,
      reserved_by: user?.id,
    });
  };

  // Filtering
  const filtered = reservations.filter((r: any) => {
    if (filter.status !== 'all' && r.status !== filter.status) return false;
    if (filter.priority !== 'all' && r.priority !== filter.priority) return false;
    if (filter.project !== 'all' && r.project_id !== filter.project) return false;
    return true;
  });

  // Stats
  const active = reservations.filter((r: any) => r.status === 'active' || r.status === 'partial');
  const totalReserved = active.reduce((s: number, r: any) => s + Number(r.reserved_qty), 0);
  const totalReleased = reservations.reduce((s: number, r: any) => s + Number(r.released_qty || 0), 0);
  const totalShortage = active.reduce((s: number, r: any) => s + Number(r.shortage_qty || 0), 0);
  const unresolvedConflicts = conflicts.filter((c: any) => !c.resolved_at).length;

  // Chart data
  const priorityData = PRIORITIES.map(p => ({
    name: p.label,
    count: active.filter((r: any) => r.priority === p.value).length,
    qty: active.filter((r: any) => r.priority === p.value).reduce((s: number, r: any) => s + Number(r.reserved_qty), 0),
  }));

  const statusData = STATUSES.map(s => ({
    name: s.label,
    value: reservations.filter((r: any) => r.status === s.value).length,
  })).filter(d => d.value > 0);

  const projectData = projects.filter((p: any) => active.some((r: any) => r.project_id === p.id))
    .map((p: any) => ({
      name: p.name?.substring(0, 20) || 'Unknown',
      reserved: active.filter((r: any) => r.project_id === p.id).reduce((s: number, r: any) => s + Number(r.reserved_qty), 0),
    })).slice(0, 8);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((r: any) => ({
      Project: projects.find((p: any) => p.id === r.project_id)?.name || '',
      'Item Code': r.item_code, Description: r.item_description,
      'Work Package': r.work_package || '', Priority: r.priority,
      'Required Date': r.required_date, 'Reserved Qty': r.reserved_qty,
      'Committed': r.committed_qty, 'Released': r.released_qty, 'Shortage': r.shortage_qty,
      Unit: r.unit, Warehouse: r.warehouse || '', Status: r.status, 'Release Rule': r.release_rule,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
    XLSX.writeFile(wb, `stock-reservations-${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const getPriorityBadge = (p: string) => {
    const pr = PRIORITIES.find(x => x.value === p);
    return <Badge variant={pr?.color as any || 'outline'}>{pr?.label || p}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />{t('nav.stockReservation')}</h1>
          <p className="text-muted-foreground text-sm">Allocate inventory by project, work package, priority, and required date</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}><BarChart2 className="h-4 w-4 mr-1" />Export</Button>
          <Button onClick={() => {
            setForm({ project_id: '', item_code: '', item_description: '', work_package: '', priority: 'medium', required_date: format(new Date(), 'yyyy-MM-dd'), reserved_qty: 0, unit: 'EA', warehouse: '', release_rule: 'manual', auto_release_date: '', notes: '' });
            setShowCreate(true);
          }}><Plus className="h-4 w-4 mr-1" />Reserve Stock</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Active Reservations', value: active.length, icon: Package, color: 'text-primary' },
          { label: 'Total Reserved', value: totalReserved.toLocaleString(), icon: Archive, color: 'text-blue-500' },
          { label: 'Total Released', value: totalReleased.toLocaleString(), icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Shortages', value: totalShortage.toLocaleString(), icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Conflicts', value: unresolvedConflicts, icon: Shield, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reservations"><Package className="h-4 w-4 mr-1" />Reservations</TabsTrigger>
          <TabsTrigger value="conflicts"><AlertTriangle className="h-4 w-4 mr-1" />Conflicts {unresolvedConflicts > 0 && <Badge variant="destructive" className="ml-1 text-xs">{unresolvedConflicts}</Badge>}</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart2 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        {/* Reservations Tab */}
        <TabsContent value="reservations">
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Select value={filter.status} onValueChange={v => setFilter(f => ({ ...f, status: v }))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter.priority} onValueChange={v => setFilter(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter.project} onValueChange={v => setFilter(f => ({ ...f, project: v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Project</TableHead><TableHead>Work Pkg</TableHead>
                  <TableHead>Priority</TableHead><TableHead>Required</TableHead>
                  <TableHead className="text-right">Reserved</TableHead><TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Released</TableHead><TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Status</TableHead><TableHead>Release Rule</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r: any) => {
                    const pct = r.reserved_qty > 0 ? Math.round((r.released_qty / r.reserved_qty) * 100) : 0;
                    const projName = projects.find((p: any) => p.id === r.project_id)?.name || '—';
                    const isOverdue = new Date(r.required_date) < new Date() && r.status === 'active';
                    return (
                      <TableRow key={r.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.item_code}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{r.item_description}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">{projName}</TableCell>
                        <TableCell className="text-sm">{r.work_package || '—'}</TableCell>
                        <TableCell>{getPriorityBadge(r.priority)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(r.required_date), 'dd MMM')}
                          {isOverdue && <Badge variant="destructive" className="ml-1 text-[10px]">Overdue</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{Number(r.reserved_qty).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{Number(r.committed_qty).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{Number(r.released_qty).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {Number(r.shortage_qty) > 0 ? (
                            <span className="text-destructive font-mono font-semibold">{Number(r.shortage_qty).toLocaleString()}</span>
                          ) : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={r.status === 'fulfilled' ? 'default' : r.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs">{r.status}</Badge>
                            {r.status !== 'fulfilled' && r.status !== 'cancelled' && (
                              <Progress value={pct} className="h-1 w-16" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{RELEASE_RULES.find(rr => rr.value === r.release_rule)?.label || r.release_rule}</TableCell>
                        <TableCell>
                          {(r.status === 'active' || r.status === 'partial') && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-emerald-600 h-7 text-xs" onClick={() => handleRelease(r)}>Release</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handlePartialRelease(r)}>Partial</Button>
                              <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => handleCancel(r)}>Cancel</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No reservations found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Demand Conflicts & Alerts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Conflict Type</TableHead>
                  <TableHead className="text-right">Total Demand</TableHead><TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Shortage</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Resolution</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {conflicts.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{c.item_code}</div>
                        <div className="text-xs text-muted-foreground">{c.item_description}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.conflict_type?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{Number(c.total_demand).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{Number(c.available_stock).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{Number(c.shortage).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={c.severity === 'critical' ? 'destructive' : 'secondary'}>{c.severity}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {c.resolved_at ? <Badge variant="default">Resolved</Badge> : <Badge variant="outline">Open</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
                  {conflicts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No conflicts detected</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Reserved Qty by Priority</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}><CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Reservations by Project</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} /><YAxis dataKey="name" type="category" width={120} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="reserved" fill="hsl(var(--chart-2))" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reserve Stock</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Project</Label>
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Code</Label>
              <Select value={form.item_code} onValueChange={v => {
                const item = items.find((i: any) => i.item_code === v);
                setForm(f => ({ ...f, item_code: v, item_description: item?.description || v }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.item_code}>{i.item_code} — {i.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Item Description</Label><Input value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))} /></div>
            <div><Label>Work Package</Label><Input value={form.work_package} onChange={e => setForm(f => ({ ...f, work_package: e.target.value }))} placeholder="e.g. WP-001, Foundation, MEP" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Required Date</Label><Input type="date" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" min={0} value={form.reserved_qty} onChange={e => setForm(f => ({ ...f, reserved_qty: Number(e.target.value) }))} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div><Label>Warehouse</Label><Input value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))} placeholder="e.g. WH-01" /></div>
            <div>
              <Label>Release Rule</Label>
              <Select value={form.release_rule} onValueChange={v => setForm(f => ({ ...f, release_rule: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELEASE_RULES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.release_rule === 'on_date' && (
              <div><Label>Auto Release Date</Label><Input type="date" value={form.auto_release_date} onChange={e => setForm(f => ({ ...f, auto_release_date: e.target.value }))} /></div>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.item_code || !form.required_date || form.reserved_qty <= 0}>Reserve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
