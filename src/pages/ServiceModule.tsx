import { useState, useMemo } from 'react';
import { useServiceEquipment, useServiceContracts, useServiceOrders, useServiceOrderLines, usePMPlans, useWarrantyClaims } from '@/hooks/useServiceModule';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Trash2, Save, Wrench, FileText, Shield, Calendar, BarChart3, Settings, AlertTriangle, CheckCircle, Clock, Star, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useLanguage } from '@/contexts/LanguageContext';

const ORDER_TYPES = ['corrective', 'preventive', 'inspection', 'warranty', 'goodwill'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const ORDER_STATUSES = ['open', 'assigned', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled'];
const CONTRACT_TYPES = ['full_maintenance', 'labor_only', 'preventive', 'time_material', 'extended_warranty', 'remote_monitoring'];
const EQUIPMENT_STATUSES = ['active', 'inactive', 'in_repair', 'decommissioned'];
const BILLING_TYPES = ['time_material', 'fixed_price', 'warranty', 'goodwill', 'contract'];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ServiceModule() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('dashboard');
  const { user } = useAuth();
  const equipment = useServiceEquipment();
  const contracts = useServiceContracts();
  const orders = useServiceOrders();
  const pmPlans = usePMPlans();
  const warrantyClaims = useWarrantyClaims();

  // Dialog states
  const [orderDialog, setOrderDialog] = useState(false);
  const [equipDialog, setEquipDialog] = useState(false);
  const [contractDialog, setContractDialog] = useState(false);
  const [pmDialog, setPmDialog] = useState(false);
  const [warrantyDialog, setWarrantyDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Forms
  const [orderForm, setOrderForm] = useState<any>({});
  const [equipForm, setEquipForm] = useState<any>({});
  const [contractForm, setContractForm] = useState<any>({});
  const [pmForm, setPmForm] = useState<any>({});
  const [warrantyForm, setWarrantyForm] = useState<any>({});

  // Search
  const [search, setSearch] = useState('');

  // Dashboard KPIs
  const kpis = useMemo(() => {
    const allOrders = orders.data || [];
    const open = allOrders.filter((o: any) => !['closed', 'cancelled', 'completed'].includes(o.status));
    const completed = allOrders.filter((o: any) => o.status === 'completed' || o.status === 'closed');
    const slaMet = completed.filter((o: any) => o.sla_met);
    const totalCost = allOrders.reduce((s: number, o: any) => s + (o.total_cost || 0), 0);
    const totalBilled = allOrders.reduce((s: number, o: any) => s + (o.billed_amount || 0), 0);
    const activeContracts = (contracts.data || []).filter((c: any) => c.status === 'active');
    const activeEquip = (equipment.data || []).filter((e: any) => e.status === 'active');
    
    return {
      totalOrders: allOrders.length,
      openOrders: open.length,
      completedOrders: completed.length,
      slaRate: completed.length ? (slaMet.length / completed.length * 100) : 0,
      totalCost,
      totalBilled,
      margin: totalBilled > 0 ? ((totalBilled - totalCost) / totalBilled * 100) : 0,
      activeContracts: activeContracts.length,
      activeEquipment: activeEquip.length,
      pendingWarranty: (warrantyClaims.data || []).filter((w: any) => w.status === 'submitted').length,
      activePM: (pmPlans.data || []).filter((p: any) => p.is_active).length,
    };
  }, [orders.data, contracts.data, equipment.data, warrantyClaims.data, pmPlans.data]);

  // Charts
  const ordersByType = useMemo(() => {
    const map: Record<string, number> = {};
    (orders.data || []).forEach((o: any) => { map[o.order_type] = (map[o.order_type] || 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [orders.data]);

  const ordersByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    (orders.data || []).forEach((o: any) => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [orders.data]);

  const handleSaveOrder = () => {
    const payload = { ...orderForm, created_by: user?.id };
    if (!payload.order_number) payload.order_number = 'SO-' + Date.now().toString().slice(-8);
    if (editId) orders.update.mutate({ id: editId, ...payload });
    else orders.create.mutate(payload);
    setOrderDialog(false); setEditId(null);
  };

  const handleSaveEquip = () => {
    const payload = { ...equipForm, created_by: user?.id };
    if (!payload.equipment_number) payload.equipment_number = 'EQ-' + Date.now().toString().slice(-8);
    if (editId) equipment.update.mutate({ id: editId, ...payload });
    else equipment.create.mutate(payload);
    setEquipDialog(false); setEditId(null);
  };

  const handleSaveContract = () => {
    const payload = { ...contractForm, created_by: user?.id };
    if (!payload.contract_number) payload.contract_number = 'SC-' + Date.now().toString().slice(-8);
    if (editId) contracts.update.mutate({ id: editId, ...payload });
    else contracts.create.mutate(payload);
    setContractDialog(false); setEditId(null);
  };

  const handleSavePM = () => {
    const payload = { ...pmForm, created_by: user?.id };
    if (!payload.plan_number) payload.plan_number = 'PM-' + Date.now().toString().slice(-8);
    if (editId) pmPlans.update.mutate({ id: editId, ...payload });
    else pmPlans.create.mutate(payload);
    setPmDialog(false); setEditId(null);
  };

  const handleSaveWarranty = () => {
    const payload = { ...warrantyForm, created_by: user?.id };
    if (!payload.claim_number) payload.claim_number = 'WC-' + Date.now().toString().slice(-8);
    if (editId) warrantyClaims.update.mutate({ id: editId, ...payload });
    else warrantyClaims.create.mutate(payload);
    setWarrantyDialog(false); setEditId(null);
  };

  const priorityColor = (p: string) => {
    switch (p) { case 'critical': return 'destructive'; case 'high': return 'default'; case 'medium': return 'secondary'; default: return 'outline'; }
  };

  const statusColor = (s: string) => {
    switch (s) { case 'open': return 'outline'; case 'assigned': return 'secondary'; case 'in_progress': return 'default'; case 'completed': case 'closed': return 'default'; case 'on_hold': return 'secondary'; default: return 'outline'; }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />Service Management</h1>
          <p className="text-sm text-muted-foreground">SAP B1 Service Module — Full Lifecycle Management</p>
        </div>
        <SAPSyncButton entity="service_order" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="orders"><FileText className="h-4 w-4 mr-1" />Service Orders</TabsTrigger>
          <TabsTrigger value="contracts"><Shield className="h-4 w-4 mr-1" />Contracts</TabsTrigger>
          <TabsTrigger value="equipment"><Settings className="h-4 w-4 mr-1" />Equipment</TabsTrigger>
          <TabsTrigger value="pm"><Calendar className="h-4 w-4 mr-1" />PM Plans</TabsTrigger>
          <TabsTrigger value="warranty"><AlertTriangle className="h-4 w-4 mr-1" />Warranty</TabsTrigger>
          <TabsTrigger value="billing"><Star className="h-4 w-4 mr-1" />Billing</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Open Orders</div><div className="text-2xl font-bold text-primary">{kpis.openOrders}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-bold text-foreground">{kpis.completedOrders}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">SLA Compliance</div><div className="text-2xl font-bold text-primary">{kpis.slaRate.toFixed(1)}%</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Active Contracts</div><div className="text-2xl font-bold">{kpis.activeContracts}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Equipment</div><div className="text-2xl font-bold">{kpis.activeEquipment}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Service Margin</div><div className="text-2xl font-bold text-primary">{kpis.margin.toFixed(1)}%</div></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Orders by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ordersByType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--chart-1))" /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                      {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Card className="p-4"><div className="text-sm font-medium mb-2">Financial Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Cost</span><span className="font-mono">{fmt(kpis.totalCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Billed</span><span className="font-mono">{fmt(kpis.totalBilled)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Margin</span><span className="font-mono text-primary">{fmt(kpis.totalBilled - kpis.totalCost)}</span></div>
              </div>
            </Card>
            <Card className="p-4"><div className="text-sm font-medium mb-2">Pending Actions</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Warranty Claims</span><Badge>{kpis.pendingWarranty}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active PM Plans</span><Badge variant="secondary">{kpis.activePM}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Open Orders</span><Badge variant="outline">{kpis.openOrders}</Badge></div>
              </div>
            </Card>
            <Card className="p-4"><div className="text-sm font-medium mb-2">Quick Stats</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Orders</span><span className="font-bold">{kpis.totalOrders}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active Equipment</span><span className="font-bold">{kpis.activeEquipment}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active Contracts</span><span className="font-bold">{kpis.activeContracts}</span></div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* SERVICE ORDERS */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Service Orders</CardTitle>
              <div className="flex gap-2">
                <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder={t('common.searchPlaceholder')} className="h-8 w-48 pl-7 text-xs" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <Button size="sm" onClick={() => { setOrderForm({ order_type: 'corrective', priority: 'medium', status: 'open', billing_type: 'time_material', customer_name: '' }); setEditId(null); setOrderDialog(true); }}><Plus className="h-4 w-4 mr-1" />New Order</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order #</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Customer</TableHead><TableHead>Equipment</TableHead><TableHead>Priority</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Technician</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="w-16">Act.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(orders.data || []).filter((o: any) => !search || o.order_number?.includes(search) || o.customer_name?.toLowerCase().includes(search.toLowerCase())).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-medium">{o.order_number}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{o.order_type}</Badge></TableCell>
                      <TableCell className="text-sm">{o.customer_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.equipment_number || '-'}</TableCell>
                      <TableCell><Badge variant={priorityColor(o.priority)} className="text-xs capitalize">{o.priority}</Badge></TableCell>
                      <TableCell><Badge variant={statusColor(o.status)} className="text-xs capitalize">{o.status?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{o.assigned_technician_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(o.total_cost)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOrderForm(o); setEditId(o.id); setOrderDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => orders.remove.mutate(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!orders.data || orders.data.length === 0) && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No service orders yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTRACTS */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Service Contracts</CardTitle>
              <Button size="sm" onClick={() => { setContractForm({ contract_type: 'full_maintenance', status: 'active', billing_frequency: 'monthly', customer_name: '', start_date: new Date().toISOString().split('T')[0], end_date: '' }); setEditId(null); setContractDialog(true); }}><Plus className="h-4 w-4 mr-1" />New Contract</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Contract #</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Customer</TableHead><TableHead>Period</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Response SLA</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="w-16">Act.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(contracts.data || []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-medium">{c.contract_number}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{c.contract_type?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{c.customer_name}</TableCell>
                      <TableCell className="text-xs">{c.start_date} → {c.end_date}</TableCell>
                      <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs">{c.response_time_hours}h / {c.resolution_time_hours}h</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(c.contract_value)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setContractForm(c); setEditId(c.id); setContractDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => contracts.remove.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!contracts.data || contracts.data.length === 0) && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contracts yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EQUIPMENT */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Equipment / Installed Base</CardTitle>
              <Button size="sm" onClick={() => { setEquipForm({ status: 'active', condition: 'good' }); setEditId(null); setEquipDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Equipment</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Equip #</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Serial</TableHead><TableHead>Customer</TableHead><TableHead>Model</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Warranty</TableHead><TableHead>Last Service</TableHead><TableHead className="w-16">Act.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(equipment.data || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs font-medium">{e.equipment_number}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="font-mono text-xs">{e.serial_number || '-'}</TableCell>
                      <TableCell className="text-sm">{e.customer_name || '-'}</TableCell>
                      <TableCell className="text-xs">{e.model || '-'}</TableCell>
                      <TableCell><Badge variant={e.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{e.status}</Badge></TableCell>
                      <TableCell className="text-xs">{e.warranty_end ? (new Date(e.warranty_end) > new Date() ? <Badge variant="default" className="text-xs">{t('common.active')}</Badge> : <Badge variant="destructive" className="text-xs">Expired</Badge>) : '-'}</TableCell>
                      <TableCell className="text-xs">{e.last_service_date || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEquipForm(e); setEditId(e.id); setEquipDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => equipment.remove.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!equipment.data || equipment.data.length === 0) && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No equipment registered</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PM PLANS */}
        <TabsContent value="pm">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Preventive Maintenance Plans</CardTitle>
              <Button size="sm" onClick={() => { setPmForm({ cycle_type: 'time', cycle_value: 90, cycle_unit: 'days', is_active: true, auto_create_order: true, name: '' }); setEditId(null); setPmDialog(true); }}><Plus className="h-4 w-4 mr-1" />New Plan</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Plan #</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Cycle</TableHead><TableHead>Last Exec</TableHead><TableHead>Next Exec</TableHead><TableHead>Auto Create</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-16">Act.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(pmPlans.data || []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-medium">{p.plan_number}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-xs">{p.cycle_value} {p.cycle_unit} ({p.cycle_type})</TableCell>
                      <TableCell className="text-xs">{p.last_execution_date || '-'}</TableCell>
                      <TableCell className="text-xs">{p.next_execution_date ? <Badge variant={new Date(p.next_execution_date) <= new Date() ? 'destructive' : 'outline'} className="text-xs">{p.next_execution_date}</Badge> : '-'}</TableCell>
                      <TableCell>{p.auto_create_order ? <CheckCircle className="h-4 w-4 text-primary" /> : '-'}</TableCell>
                      <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'} className="text-xs">{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPmForm(p); setEditId(p.id); setPmDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => pmPlans.remove.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!pmPlans.data || pmPlans.data.length === 0) && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No PM plans configured</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WARRANTY */}
        <TabsContent value="warranty">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Warranty Claims</CardTitle>
              <Button size="sm" onClick={() => { setWarrantyForm({ status: 'submitted', claim_type: 'standard', claim_date: new Date().toISOString().split('T')[0] }); setEditId(null); setWarrantyDialog(true); }}><Plus className="h-4 w-4 mr-1" />New Claim</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Claim #</TableHead><TableHead>Customer</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead className="text-right">Parts</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">{t('common.total')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-16">Act.</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(warrantyClaims.data || []).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs font-medium">{w.claim_number}</TableCell>
                      <TableCell>{w.customer_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{w.claim_type}</Badge></TableCell>
                      <TableCell className="text-xs">{w.claim_date}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(w.parts_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(w.labor_cost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{fmt(w.total_claim)}</TableCell>
                      <TableCell><Badge variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs capitalize">{w.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWarrantyForm(w); setEditId(w.id); setWarrantyDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!warrantyClaims.data || warrantyClaims.data.length === 0) && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No warranty claims</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Service Billing & Costing</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className="p-4 bg-muted/30"><div className="text-sm text-muted-foreground">T&M Orders</div><div className="text-2xl font-bold">{(orders.data || []).filter((o: any) => o.billing_type === 'time_material').length}</div></Card>
                <Card className="p-4 bg-muted/30"><div className="text-sm text-muted-foreground">Contract Orders</div><div className="text-2xl font-bold">{(orders.data || []).filter((o: any) => o.billing_type === 'contract' || o.billing_type === 'fixed_price').length}</div></Card>
                <Card className="p-4 bg-muted/30"><div className="text-sm text-muted-foreground">Warranty (No Bill)</div><div className="text-2xl font-bold">{(orders.data || []).filter((o: any) => o.billing_type === 'warranty' || o.billing_type === 'goodwill').length}</div></Card>
                <Card className="p-4 bg-primary/10"><div className="text-sm text-muted-foreground">Total Revenue</div><div className="text-2xl font-bold text-primary">{fmt(kpis.totalBilled)}</div></Card>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Billing Type</TableHead><TableHead className="text-right">Labor</TableHead><TableHead className="text-right">Parts</TableHead><TableHead className="text-right">Travel</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Billed</TableHead><TableHead className="text-right">Margin</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(orders.data || []).filter((o: any) => o.status === 'completed' || o.status === 'closed').map((o: any) => {
                    const margin = (o.billed_amount || 0) - (o.total_cost || 0);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="text-sm">{o.customer_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{o.billing_type?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(o.labor_cost)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(o.parts_cost)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(o.travel_cost)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(o.total_cost)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{fmt(o.billed_amount)}</TableCell>
                        <TableCell className={`text-right font-mono text-xs font-bold ${margin >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(margin)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SERVICE ORDER DIALOG */}
      <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Service Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customer Name *</Label><Input value={orderForm.customer_name || ''} onChange={e => setOrderForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Equipment #</Label><Input value={orderForm.equipment_number || ''} onChange={e => setOrderForm((p: any) => ({ ...p, equipment_number: e.target.value }))} /></div>
            <div><Label>Order Type</Label>
              <Select value={orderForm.order_type || 'corrective'} onValueChange={v => setOrderForm((p: any) => ({ ...p, order_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Priority</Label>
              <Select value={orderForm.priority || 'medium'} onValueChange={v => setOrderForm((p: any) => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('common.status')}</Label>
              <Select value={orderForm.status || 'open'} onValueChange={v => setOrderForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Billing Type</Label>
              <Select value={orderForm.billing_type || 'time_material'} onValueChange={v => setOrderForm((p: any) => ({ ...p, billing_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_TYPES.map(b => <SelectItem key={b} value={b} className="capitalize">{b.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Assigned Technician</Label><Input value={orderForm.assigned_technician_name || ''} onChange={e => setOrderForm((p: any) => ({ ...p, assigned_technician_name: e.target.value }))} /></div>
            <div><Label>Reported By</Label><Input value={orderForm.reported_by || ''} onChange={e => setOrderForm((p: any) => ({ ...p, reported_by: e.target.value }))} /></div>
            <div><Label>Scheduled Start</Label><Input type="datetime-local" value={orderForm.scheduled_start?.slice(0,16) || ''} onChange={e => setOrderForm((p: any) => ({ ...p, scheduled_start: e.target.value }))} /></div>
            <div><Label>Scheduled End</Label><Input type="datetime-local" value={orderForm.scheduled_end?.slice(0,16) || ''} onChange={e => setOrderForm((p: any) => ({ ...p, scheduled_end: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Problem Description</Label><Textarea value={orderForm.problem_description || ''} onChange={e => setOrderForm((p: any) => ({ ...p, problem_description: e.target.value }))} /></div>
            <div><Label>Labor Cost</Label><Input type="number" value={orderForm.labor_cost || ''} onChange={e => setOrderForm((p: any) => ({ ...p, labor_cost: Number(e.target.value), total_cost: Number(e.target.value) + (p.parts_cost || 0) + (p.travel_cost || 0) }))} /></div>
            <div><Label>Parts Cost</Label><Input type="number" value={orderForm.parts_cost || ''} onChange={e => setOrderForm((p: any) => ({ ...p, parts_cost: Number(e.target.value), total_cost: (p.labor_cost || 0) + Number(e.target.value) + (p.travel_cost || 0) }))} /></div>
            <div><Label>Travel Cost</Label><Input type="number" value={orderForm.travel_cost || ''} onChange={e => setOrderForm((p: any) => ({ ...p, travel_cost: Number(e.target.value), total_cost: (p.labor_cost || 0) + (p.parts_cost || 0) + Number(e.target.value) }))} /></div>
            <div><Label>Billed Amount</Label><Input type="number" value={orderForm.billed_amount || ''} onChange={e => setOrderForm((p: any) => ({ ...p, billed_amount: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>Resolution</Label><Textarea value={orderForm.resolution_description || ''} onChange={e => setOrderForm((p: any) => ({ ...p, resolution_description: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={orderForm.sla_met || false} onCheckedChange={v => setOrderForm((p: any) => ({ ...p, sla_met: !!v }))} /><Label>SLA Met</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={orderForm.warranty_claim || false} onCheckedChange={v => setOrderForm((p: any) => ({ ...p, warranty_claim: !!v }))} /><Label>Warranty Claim</Label></div>
          </div>
          <DialogFooter><Button onClick={handleSaveOrder}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EQUIPMENT DIALOG */}
      <Dialog open={equipDialog} onOpenChange={setEquipDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Equipment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={equipForm.name || ''} onChange={e => setEquipForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Serial Number</Label><Input value={equipForm.serial_number || ''} onChange={e => setEquipForm((p: any) => ({ ...p, serial_number: e.target.value }))} /></div>
            <div><Label>Model</Label><Input value={equipForm.model || ''} onChange={e => setEquipForm((p: any) => ({ ...p, model: e.target.value }))} /></div>
            <div><Label>Manufacturer</Label><Input value={equipForm.manufacturer || ''} onChange={e => setEquipForm((p: any) => ({ ...p, manufacturer: e.target.value }))} /></div>
            <div><Label>Customer</Label><Input value={equipForm.customer_name || ''} onChange={e => setEquipForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Location</Label><Input value={equipForm.functional_location || ''} onChange={e => setEquipForm((p: any) => ({ ...p, functional_location: e.target.value }))} /></div>
            <div><Label>Installation Date</Label><Input type="date" value={equipForm.installation_date || ''} onChange={e => setEquipForm((p: any) => ({ ...p, installation_date: e.target.value }))} /></div>
            <div><Label>{t('common.status')}</Label>
              <Select value={equipForm.status || 'active'} onValueChange={v => setEquipForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQUIPMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Warranty Start</Label><Input type="date" value={equipForm.warranty_start || ''} onChange={e => setEquipForm((p: any) => ({ ...p, warranty_start: e.target.value }))} /></div>
            <div><Label>Warranty End</Label><Input type="date" value={equipForm.warranty_end || ''} onChange={e => setEquipForm((p: any) => ({ ...p, warranty_end: e.target.value }))} /></div>
            <div><Label>Operating Hours</Label><Input type="number" value={equipForm.operating_hours || ''} onChange={e => setEquipForm((p: any) => ({ ...p, operating_hours: Number(e.target.value) }))} /></div>
            <div><Label>Purchase Price</Label><Input type="number" value={equipForm.purchase_price || ''} onChange={e => setEquipForm((p: any) => ({ ...p, purchase_price: Number(e.target.value) }))} /></div>
            <div className="col-span-2"><Label>{t('common.description')}</Label><Textarea value={equipForm.description || ''} onChange={e => setEquipForm((p: any) => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveEquip}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONTRACT DIALOG */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Service Contract</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customer Name *</Label><Input value={contractForm.customer_name || ''} onChange={e => setContractForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Contract Type</Label>
              <Select value={contractForm.contract_type || 'full_maintenance'} onValueChange={v => setContractForm((p: any) => ({ ...p, contract_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Start Date</Label><Input type="date" value={contractForm.start_date || ''} onChange={e => setContractForm((p: any) => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>End Date</Label><Input type="date" value={contractForm.end_date || ''} onChange={e => setContractForm((p: any) => ({ ...p, end_date: e.target.value }))} /></div>
            <div><Label>Contract Value</Label><Input type="number" value={contractForm.contract_value || ''} onChange={e => setContractForm((p: any) => ({ ...p, contract_value: Number(e.target.value) }))} /></div>
            <div><Label>Billing Frequency</Label>
              <Select value={contractForm.billing_frequency || 'monthly'} onValueChange={v => setContractForm((p: any) => ({ ...p, billing_frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annually">Annually</SelectItem></SelectContent></Select></div>
            <div><Label>Response Time (hours)</Label><Input type="number" value={contractForm.response_time_hours || ''} onChange={e => setContractForm((p: any) => ({ ...p, response_time_hours: Number(e.target.value) }))} /></div>
            <div><Label>Resolution Time (hours)</Label><Input type="number" value={contractForm.resolution_time_hours || ''} onChange={e => setContractForm((p: any) => ({ ...p, resolution_time_hours: Number(e.target.value) }))} /></div>
            <div><Label>Uptime Guarantee (%)</Label><Input type="number" value={contractForm.uptime_guarantee || ''} onChange={e => setContractForm((p: any) => ({ ...p, uptime_guarantee: Number(e.target.value) }))} /></div>
            <div><Label>{t('common.status')}</Label>
              <Select value={contractForm.status || 'active'} onValueChange={v => setContractForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">{t('common.active')}</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="pending">{t('common.pending')}</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label>{t('common.notes')}</Label><Textarea value={contractForm.notes || ''} onChange={e => setContractForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveContract}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PM PLAN DIALOG */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} PM Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={pmForm.name || ''} onChange={e => setPmForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Cycle Type</Label>
                <Select value={pmForm.cycle_type || 'time'} onValueChange={v => setPmForm((p: any) => ({ ...p, cycle_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="time">Time</SelectItem><SelectItem value="usage">Usage</SelectItem><SelectItem value="condition">Condition</SelectItem></SelectContent></Select></div>
              <div><Label>Value</Label><Input type="number" value={pmForm.cycle_value || ''} onChange={e => setPmForm((p: any) => ({ ...p, cycle_value: Number(e.target.value) }))} /></div>
              <div><Label>Unit</Label>
                <Select value={pmForm.cycle_unit || 'days'} onValueChange={v => setPmForm((p: any) => ({ ...p, cycle_unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem><SelectItem value="months">Months</SelectItem><SelectItem value="hours">Hours</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Call Horizon (days)</Label><Input type="number" value={pmForm.call_horizon_days || ''} onChange={e => setPmForm((p: any) => ({ ...p, call_horizon_days: Number(e.target.value) }))} /></div>
            <div><Label>Next Execution</Label><Input type="date" value={pmForm.next_execution_date || ''} onChange={e => setPmForm((p: any) => ({ ...p, next_execution_date: e.target.value }))} /></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Checkbox checked={pmForm.is_active || false} onCheckedChange={v => setPmForm((p: any) => ({ ...p, is_active: !!v }))} /><Label>{t('common.active')}</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={pmForm.auto_create_order || false} onCheckedChange={v => setPmForm((p: any) => ({ ...p, auto_create_order: !!v }))} /><Label>Auto Create Order</Label></div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={pmForm.description || ''} onChange={e => setPmForm((p: any) => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSavePM}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WARRANTY CLAIM DIALOG */}
      <Dialog open={warrantyDialog} onOpenChange={setWarrantyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Warranty Claim</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={warrantyForm.customer_name || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Claim Type</Label>
              <Select value={warrantyForm.claim_type || 'standard'} onValueChange={v => setWarrantyForm((p: any) => ({ ...p, claim_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="extended">Extended</SelectItem><SelectItem value="goodwill">Goodwill</SelectItem></SelectContent></Select></div>
            <div><Label>Claim Date</Label><Input type="date" value={warrantyForm.claim_date || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, claim_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Parts Cost</Label><Input type="number" value={warrantyForm.parts_cost || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, parts_cost: Number(e.target.value), total_claim: Number(e.target.value) + (p.labor_cost || 0) }))} /></div>
              <div><Label>Labor Cost</Label><Input type="number" value={warrantyForm.labor_cost || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, labor_cost: Number(e.target.value), total_claim: (p.parts_cost || 0) + Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Supplier</Label><Input value={warrantyForm.supplier_name || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, supplier_name: e.target.value }))} /></div>
            <div><Label>Supplier Recovery</Label><Input type="number" value={warrantyForm.supplier_recovery || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, supplier_recovery: Number(e.target.value) }))} /></div>
            <div><Label>{t('common.status')}</Label>
              <Select value={warrantyForm.status || 'submitted'} onValueChange={v => setWarrantyForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
            <div><Label>Failure Description</Label><Textarea value={warrantyForm.failure_description || ''} onChange={e => setWarrantyForm((p: any) => ({ ...p, failure_description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveWarranty}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
