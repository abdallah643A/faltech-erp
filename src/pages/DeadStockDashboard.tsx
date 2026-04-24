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
import { Package, AlertTriangle, TrendingDown, DollarSign, ArrowRightLeft, Trash2, Tag, BarChart2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import * as XLSX from 'xlsx';

const AGING_CATEGORIES = [
  { value: 'active', label: 'Active', color: 'default' },
  { value: 'slow_moving', label: 'Slow Moving', color: 'secondary' },
  { value: 'dead_stock', label: 'Dead Stock', color: 'destructive' },
  { value: 'obsolete', label: 'Obsolete', color: 'destructive' },
];

const SUGGESTED_ACTIONS = [
  { value: 'keep', label: 'Keep', icon: Package },
  { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { value: 'promote', label: 'Promote/Discount', icon: Tag },
  { value: 'liquidate', label: 'Liquidate', icon: DollarSign },
  { value: 'dispose', label: 'Dispose', icon: Trash2 },
];

const ACTION_TYPES = [
  { value: 'transfer', label: 'Inter-Warehouse Transfer' },
  { value: 'liquidate', label: 'Liquidate / Sell at Discount' },
  { value: 'promote', label: 'Promotional Campaign' },
  { value: 'dispose', label: 'Dispose / Scrap' },
  { value: 'write_off', label: 'Write Off' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function DeadStockDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState({ category: 'all', action: 'all', warehouse: 'all' });
  const [showAction, setShowAction] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionForm, setActionForm] = useState({
    action_type: 'transfer', to_warehouse: '', quantity: 0, discount_percent: 0, target_price: 0, reason: '',
  });

  // Queries
  const { data: agingItems = [] } = useQuery({
    queryKey: ['aging-analysis', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('inventory_aging_analysis' as any).select('*').order('days_since_movement', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['dead-stock-actions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('dead_stock_actions' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Mutations
  const createAction = useMutation({
    mutationFn: async (a: any) => {
      const { error } = await (supabase.from('dead_stock_actions' as any).insert(a) as any);
      if (error) throw error;
      // Update aging item status
      if (a.aging_analysis_id) {
        await (supabase.from('inventory_aging_analysis' as any).update({ action_status: 'in_progress' }).eq('id', a.aging_analysis_id) as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dead-stock-actions'] });
      qc.invalidateQueries({ queryKey: ['aging-analysis'] });
      toast({ title: 'Action created' });
      setShowAction(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('dead_stock_actions' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dead-stock-actions'] });
      toast({ title: 'Action updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Computed
  const slowMoving = agingItems.filter((i: any) => i.aging_category === 'slow_moving');
  const deadStock = agingItems.filter((i: any) => i.aging_category === 'dead_stock');
  const obsolete = agingItems.filter((i: any) => i.aging_category === 'obsolete');
  const totalCarryingCost = agingItems.reduce((s: number, i: any) => s + Number(i.carrying_cost || 0), 0);
  const deadStockValue = [...deadStock, ...obsolete].reduce((s: number, i: any) => s + Number(i.current_qty || 0) * Number(i.unit_cost || 0), 0);
  const excessValue = agingItems.reduce((s: number, i: any) => s + Number(i.excess_qty || 0) * Number(i.unit_cost || 0), 0);

  const filtered = agingItems.filter((i: any) => {
    if (filter.category !== 'all' && i.aging_category !== filter.category) return false;
    if (filter.action !== 'all' && i.suggested_action !== filter.action) return false;
    if (filter.warehouse !== 'all' && i.warehouse !== filter.warehouse) return false;
    return true;
  });

  const warehouses = [...new Set(agingItems.map((i: any) => i.warehouse).filter(Boolean))];

  // Chart data
  const categoryData = AGING_CATEGORIES.map(c => ({
    name: c.label,
    count: agingItems.filter((i: any) => i.aging_category === c.value).length,
    value: agingItems.filter((i: any) => i.aging_category === c.value).reduce((s: number, i: any) => s + Number(i.current_qty || 0) * Number(i.unit_cost || 0), 0),
  }));

  const agingBuckets = [
    { name: '0-30d', min: 0, max: 30 },
    { name: '31-60d', min: 31, max: 60 },
    { name: '61-90d', min: 61, max: 90 },
    { name: '91-180d', min: 91, max: 180 },
    { name: '181-365d', min: 181, max: 365 },
    { name: '365d+', min: 366, max: 99999 },
  ].map(b => ({
    name: b.name,
    items: agingItems.filter((i: any) => (i.days_since_movement || 0) >= b.min && (i.days_since_movement || 0) <= b.max).length,
    value: agingItems.filter((i: any) => (i.days_since_movement || 0) >= b.min && (i.days_since_movement || 0) <= b.max)
      .reduce((s: number, i: any) => s + Number(i.current_qty || 0) * Number(i.unit_cost || 0), 0),
  }));

  const actionSummary = SUGGESTED_ACTIONS.map(a => ({
    name: a.label,
    value: agingItems.filter((i: any) => i.suggested_action === a.value).length,
  })).filter(d => d.value > 0);

  const handleCreateAction = () => {
    if (!selectedItem) return;
    createAction.mutate({
      company_id: activeCompanyId,
      aging_analysis_id: selectedItem.id,
      item_code: selectedItem.item_code,
      item_description: selectedItem.item_description,
      action_type: actionForm.action_type,
      from_warehouse: selectedItem.warehouse,
      to_warehouse: actionForm.to_warehouse || null,
      quantity: actionForm.quantity || selectedItem.current_qty,
      unit_cost: selectedItem.unit_cost,
      total_value: (actionForm.quantity || selectedItem.current_qty) * (selectedItem.unit_cost || 0),
      discount_percent: actionForm.discount_percent,
      target_price: actionForm.target_price,
      reason: actionForm.reason,
      status: 'draft',
      created_by: user?.id,
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((i: any) => ({
      'Item Code': i.item_code, Description: i.item_description, Warehouse: i.warehouse || '',
      'Current Qty': i.current_qty, 'Unit Cost': i.unit_cost, 'Stock Value': Number(i.current_qty) * Number(i.unit_cost || 0),
      'Last Movement': i.last_movement_date || '', 'Days Idle': i.days_since_movement,
      Category: i.aging_category, 'Excess Qty': i.excess_qty, 'Carrying Cost': i.carrying_cost,
      'Projected Demand/Mo': i.projected_monthly_demand, 'Months Supply': i.months_of_supply,
      'Suggested Action': i.suggested_action, 'Action Status': i.action_status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aging Analysis');
    XLSX.writeFile(wb, `dead-stock-analysis-${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtCur = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6" />{t('nav.deadStock')}</h1>
          <p className="text-muted-foreground text-sm">Inventory aging, excess stock, carrying costs, and liquidation workflows</p>
        </div>
        <Button variant="outline" onClick={exportExcel}><BarChart2 className="h-4 w-4 mr-1" />Export</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Items', value: fmt(agingItems.length), icon: Package, color: 'text-primary' },
          { label: 'Slow Moving', value: fmt(slowMoving.length), icon: Clock, color: 'text-amber-500' },
          { label: 'Dead Stock', value: fmt(deadStock.length), icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Obsolete', value: fmt(obsolete.length), icon: XCircle, color: 'text-destructive' },
          { label: 'Dead Stock Value', value: fmtCur(deadStockValue), icon: DollarSign, color: 'text-destructive' },
          { label: 'Carrying Cost', value: fmtCur(totalCarryingCost), icon: TrendingDown, color: 'text-amber-500' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-2">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div><div className="text-lg font-bold">{s.value}</div><div className="text-[10px] text-muted-foreground">{s.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"><BarChart2 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="aging"><Package className="h-4 w-4 mr-1" />Aging Analysis</TabsTrigger>
          <TabsTrigger value="actions"><ArrowRightLeft className="h-4 w-4 mr-1" />Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Stock Value by Category</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => value > 0 ? `${name}` : ''}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtCur(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Distribution (Items)</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBuckets}><CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="items" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Items" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Value Distribution</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={agingBuckets}><CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
                    <Tooltip formatter={(v: number) => fmtCur(v)} />
                    <Area type="monotone" dataKey="value" fill="hsl(var(--chart-3))" stroke="hsl(var(--chart-3))" fillOpacity={0.3} name="Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Suggested Actions</CardTitle></CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={actionSummary} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {actionSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aging Analysis Tab */}
        <TabsContent value="aging">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Select value={filter.category} onValueChange={v => setFilter(f => ({ ...f, category: v }))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {AGING_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter.action} onValueChange={v => setFilter(f => ({ ...f, action: v }))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {SUGGESTED_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter.warehouse} onValueChange={v => setFilter(f => ({ ...f, warehouse: v }))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((w: string) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Warehouse</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Value</TableHead>
                  <TableHead>Last Movement</TableHead><TableHead className="text-right">Days Idle</TableHead>
                  <TableHead>Category</TableHead><TableHead className="text-right">Excess</TableHead>
                  <TableHead className="text-right">Carrying Cost</TableHead><TableHead className="text-right">Demand/Mo</TableHead>
                  <TableHead className="text-right">Months Supply</TableHead><TableHead>Suggested</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((item: any) => {
                    const value = Number(item.current_qty) * Number(item.unit_cost || 0);
                    const cat = AGING_CATEGORIES.find(c => c.value === item.aging_category);
                    const act = SUGGESTED_ACTIONS.find(a => a.value === item.suggested_action);
                    return (
                      <TableRow key={item.id} className={item.aging_category === 'dead_stock' || item.aging_category === 'obsolete' ? 'bg-destructive/5' : item.aging_category === 'slow_moving' ? 'bg-amber-500/5' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{item.item_code}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[140px]">{item.item_description}</div>
                        </TableCell>
                        <TableCell className="text-sm">{item.warehouse || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(Number(item.current_qty))}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCur(Number(item.unit_cost || 0))}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCur(value)}</TableCell>
                        <TableCell className="text-sm">{item.last_movement_date ? format(new Date(item.last_movement_date), 'dd MMM yy') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono font-semibold ${(item.days_since_movement || 0) > 180 ? 'text-destructive' : (item.days_since_movement || 0) > 90 ? 'text-amber-500' : ''}`}>
                            {item.days_since_movement || 0}
                          </span>
                        </TableCell>
                        <TableCell><Badge variant={cat?.color as any || 'outline'} className="text-xs">{cat?.label || item.aging_category}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{Number(item.excess_qty) > 0 ? <span className="text-amber-600">{fmt(Number(item.excess_qty))}</span> : '0'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtCur(Number(item.carrying_cost || 0))}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{Number(item.projected_monthly_demand || 0).toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(item.months_of_supply) > 24 ? <span className="text-destructive">{Number(item.months_of_supply).toFixed(0)}</span> : Number(item.months_of_supply).toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{act?.label || item.suggested_action}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.action_status !== 'completed' && item.suggested_action !== 'keep' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                              setSelectedItem(item);
                              setActionForm({ action_type: item.suggested_action === 'promote' ? 'promote' : item.suggested_action === 'dispose' ? 'dispose' : 'transfer', to_warehouse: '', quantity: Number(item.current_qty), discount_percent: 0, target_price: Number(item.unit_cost || 0), reason: '' });
                              setShowAction(true);
                            }}>
                              <Plus className="h-3 w-3 mr-1" />Act
                            </Button>
                          )}
                          {item.action_status === 'completed' && <Badge variant="default" className="text-xs">Done</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No items in aging analysis. Run inventory aging to populate.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader><CardTitle className="text-sm">Disposal / Transfer / Promotion Actions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead>Action</TableHead><TableHead>From</TableHead><TableHead>To</TableHead>
                  <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Discount</TableHead><TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {actions.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{a.item_code}</div>
                        <div className="text-xs text-muted-foreground">{a.item_description}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{ACTION_TYPES.find(at => at.value === a.action_type)?.label || a.action_type}</Badge></TableCell>
                      <TableCell className="text-sm">{a.from_warehouse || '—'}</TableCell>
                      <TableCell className="text-sm">{a.to_warehouse || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(a.quantity))}</TableCell>
                      <TableCell className="text-right font-mono">{fmtCur(Number(a.total_value || 0))}</TableCell>
                      <TableCell className="text-right">{Number(a.discount_percent) > 0 ? `${a.discount_percent}%` : '—'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{a.reason || '—'}</TableCell>
                      <TableCell><Badge variant={a.status === 'executed' ? 'default' : a.status === 'approved' ? 'secondary' : a.status === 'rejected' ? 'destructive' : 'outline'} className="text-xs">{a.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {a.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateAction.mutate({ id: a.id, status: 'pending_approval' })}>Submit</Button>
                          )}
                          {a.status === 'pending_approval' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => updateAction.mutate({ id: a.id, status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })}><CheckCircle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateAction.mutate({ id: a.id, status: 'rejected' })}><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                          {a.status === 'approved' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateAction.mutate({ id: a.id, status: 'executed', executed_by: user?.id, executed_at: new Date().toISOString() })}>Execute</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {actions.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No actions created yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Action Dialog */}
      <Dialog open={showAction} onOpenChange={setShowAction}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Action — {selectedItem?.item_code}</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded text-sm">
                <div><strong>{selectedItem.item_description}</strong></div>
                <div className="text-muted-foreground">Qty: {fmt(Number(selectedItem.current_qty))} | Value: {fmtCur(Number(selectedItem.current_qty) * Number(selectedItem.unit_cost || 0))} | Idle: {selectedItem.days_since_movement} days</div>
              </div>
              <div>
                <Label>Action Type</Label>
                <Select value={actionForm.action_type} onValueChange={v => setActionForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {actionForm.action_type === 'transfer' && (
                <div><Label>To Warehouse</Label><Input value={actionForm.to_warehouse} onChange={e => setActionForm(f => ({ ...f, to_warehouse: e.target.value }))} placeholder="e.g. WH-02" /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" value={actionForm.quantity} onChange={e => setActionForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
                {(actionForm.action_type === 'liquidate' || actionForm.action_type === 'promote') && (
                  <div><Label>Discount %</Label><Input type="number" value={actionForm.discount_percent} onChange={e => setActionForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} /></div>
                )}
              </div>
              {(actionForm.action_type === 'liquidate' || actionForm.action_type === 'promote') && (
                <div><Label>Target Price</Label><Input type="number" value={actionForm.target_price} onChange={e => setActionForm(f => ({ ...f, target_price: Number(e.target.value) }))} /></div>
              )}
              <div><Label>Reason / Notes</Label><Textarea value={actionForm.reason} onChange={e => setActionForm(f => ({ ...f, reason: e.target.value }))} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAction(false)}>Cancel</Button>
            <Button onClick={handleCreateAction} disabled={actionForm.quantity <= 0}>Create Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
