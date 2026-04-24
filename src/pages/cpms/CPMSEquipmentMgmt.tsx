import { useState } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSEquipment, CPMSEquipment, EquipmentLog, MaintenanceRecord } from '@/hooks/useCPMSEquipment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Truck, Wrench, Clock, DollarSign, Plus, RefreshCw, QrCode,
  AlertTriangle, CheckCircle2, PauseCircle, BarChart3, Calendar, Fuel,
  Settings, TrendingDown, Pencil, Trash2, Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-100 text-gray-800',
  broken: 'bg-red-100 text-red-800',
};

const PIE_COLORS = ['hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(270, 60%, 60%)'];

export default function CPMSEquipmentManagement() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const {
    equipment, logs, maintenance, loading, fetchAll,
    createEquipment, updateEquipment, deleteEquipment,
    logUsage, createMaintenance, updateMaintenance,
    getUtilizationStats, calculateDepreciation, getFleetStats,
  } = useCPMSEquipment(selectedProjectId || undefined);

  const [showForm, setShowForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [editItem, setEditItem] = useState<CPMSEquipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');

  const [form, setForm] = useState<Partial<CPMSEquipment>>({
    code: '', name: '', category: 'heavy', type: 'owned', status: 'available', condition: 'good',
    purchase_cost: 0, useful_life_years: 10, hourly_rate: 0, daily_rate: 0,
  });
  const [logForm, setLogForm] = useState<Partial<EquipmentLog>>({
    log_date: new Date().toISOString().split('T')[0], hours_used: 0, hours_idle: 0,
  });
  const [maintForm, setMaintForm] = useState<Partial<MaintenanceRecord>>({
    title: '', maintenance_type: 'preventive', status: 'scheduled',
  });

  const stats = getFleetStats();

  const handleSave = async () => {
    if (!form.code || !form.name) return;
    if (editItem?.id) {
      await updateEquipment(editItem.id, form);
    } else {
      await createEquipment(form);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const handleLogUsage = async () => {
    if (!selectedEquipment) return;
    await logUsage({ ...logForm, equipment_id: selectedEquipment, project_id: selectedProjectId || undefined });
    setShowLogForm(false);
  };

  const handleCreateMaint = async () => {
    if (!selectedEquipment || !maintForm.title) return;
    await createMaintenance({ ...maintForm, equipment_id: selectedEquipment });
    setShowMaintForm(false);
  };

  const statusDistribution = equipment.reduce((acc: any[], e) => {
    const s = e.status || 'available';
    const ex = acc.find(a => a.name === s);
    if (ex) ex.value++; else acc.push({ name: s, value: 1 });
    return acc;
  }, []);

  const utilizationData = equipment.slice(0, 10).map(e => {
    const u = getUtilizationStats(e.id!);
    return { name: e.code, utilization: u.utilizationRate, hours: u.totalUsed };
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Equipment & Asset Management
          </h1>
          <p className="text-sm text-muted-foreground">إدارة المعدات – Inventory, Utilization & Maintenance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditItem(null); setForm({ code: '', name: '', category: 'heavy', type: 'owned', status: 'available', condition: 'good', purchase_cost: 0, useful_life_years: 10 }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Equipment
          </Button>
          <Button variant="outline" onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-1" />{t('common.refresh')}</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fleet</p>
            <p className="text-2xl font-bold mt-1">{stats.totalCount}</p>
            <p className="text-xs text-muted-foreground">{stats.ownedCount} owned · {stats.rentedCount} rented</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.available}</p>
            <p className="text-xs text-muted-foreground">{stats.inUse} in use</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Under Maintenance</p>
            <p className="text-2xl font-bold mt-1">{stats.underMaintenance}</p>
            <p className="text-xs text-muted-foreground">{stats.overdueMaint} overdue</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fleet Value</p>
            <p className="text-2xl font-bold mt-1">{(stats.totalValue / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">SAR</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Rental</p>
            <p className="text-2xl font-bold mt-1">{(stats.monthlyRentalCost / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">SAR/month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory"><Truck className="h-4 w-4 mr-1" />Inventory</TabsTrigger>
          <TabsTrigger value="utilization"><BarChart3 className="h-4 w-4 mr-1" />Utilization</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1" />Maintenance</TabsTrigger>
          <TabsTrigger value="costs"><DollarSign className="h-4 w-4 mr-1" />Costs & Depreciation</TabsTrigger>
        </TabsList>

        {/* Inventory */}
        <TabsContent value="inventory" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Engine Hours</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.code}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                    <TableCell>{e.type === 'rented' ? <Badge variant="secondary">Rented</Badge> : <Badge>Owned</Badge>}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[e.status || 'available']}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.location || '—'}</TableCell>
                    <TableCell>{(e.total_engine_hours || 0).toLocaleString()}h</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEquipment(e.id!); setShowLogForm(true); }}><Clock className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEquipment(e.id!); setShowMaintForm(true); }}><Wrench className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(e); setForm(e); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => e.id && deleteEquipment(e.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {equipment.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No equipment registered</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        {/* Utilization */}
        <TabsContent value="utilization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={3}>
                          {statusDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5">
                      {statusDistribution.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize">{s.name.replace('_', ' ')}</span>
                          <span className="font-bold ml-auto">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="text-center py-8 text-muted-foreground text-sm">No data</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Utilization Rate (%)</CardTitle></CardHeader>
              <CardContent>
                {utilizationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={utilizationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} fontSize={10} />
                      <YAxis type="category" dataKey="name" fontSize={10} width={70} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="utilization" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-muted-foreground text-sm">Log equipment usage to see utilization</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipment.map(e => {
              const u = getUtilizationStats(e.id!);
              return (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{e.code}</p>
                      </div>
                      <Badge className={STATUS_COLORS[e.status || 'available']}>{e.status}</Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs"><span>Utilization</span><span className="font-bold">{u.utilizationRate}%</span></div>
                      <Progress value={u.utilizationRate} className="h-2" />
                      <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-muted-foreground">
                        <div className="text-center"><p className="font-semibold text-foreground">{u.totalUsed}h</p>Used</div>
                        <div className="text-center"><p className="font-semibold text-foreground">{u.totalIdle}h</p>Idle</div>
                        <div className="text-center"><p className="font-semibold text-foreground">{u.totalFuel}L</p>Fuel</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-4">
          {stats.overdueMaint > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">{stats.overdueMaint} overdue maintenance tasks</span>
              </CardContent>
            </Card>
          )}
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map(m => {
                  const eq = equipment.find(e => e.id === m.equipment_id);
                  const isOverdue = m.status === 'scheduled' && m.scheduled_date && new Date(m.scheduled_date) < new Date();
                  return (
                    <TableRow key={m.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                      <TableCell className="font-mono text-xs">{eq?.code || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{m.maintenance_type}</Badge></TableCell>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>{m.scheduled_date || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'completed' ? 'default' : m.status === 'in_progress' ? 'secondary' : 'outline'}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.cost ? `${m.cost.toLocaleString()} SAR` : '—'}</TableCell>
                      <TableCell>
                        {m.status !== 'completed' && (
                          <Button variant="ghost" size="sm" onClick={() => updateMaintenance(m.id!, { status: 'completed', completed_date: new Date().toISOString().split('T')[0] })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {maintenance.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No maintenance records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        {/* Costs & Depreciation */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipment.filter(e => e.type === 'owned').map(e => {
              const dep = calculateDepreciation(e);
              const depPct = e.purchase_cost ? Math.round((dep.accumulatedDepreciation / e.purchase_cost) * 100) : 0;
              return (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.depreciation_method?.replace('_', ' ')}</p>
                      </div>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs"><span>Purchase Cost</span><span className="font-semibold">{(e.purchase_cost || 0).toLocaleString()} SAR</span></div>
                      <div className="flex justify-between text-xs"><span>Current Book Value</span><span className="font-semibold text-primary">{dep.currentValue.toLocaleString()} SAR</span></div>
                      <div className="flex justify-between text-xs"><span>Accumulated Depreciation</span><span className="text-red-600">{dep.accumulatedDepreciation.toLocaleString()} SAR</span></div>
                      <div className="flex justify-between text-xs"><span>Annual Depreciation</span><span>{dep.annualDepreciation.toLocaleString()} SAR/yr</span></div>
                      <Progress value={depPct} className="h-1.5 mt-1" />
                      <p className="text-[10px] text-muted-foreground text-right">{depPct}% depreciated</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {equipment.filter(e => e.type === 'rented').length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Rental Cost Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Daily Rate</TableHead>
                      <TableHead>Monthly Rate</TableHead>
                      <TableHead>Rental Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.filter(e => e.type === 'rented').map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.rental_vendor || '—'}</TableCell>
                        <TableCell>{e.daily_rate?.toLocaleString() || '—'} SAR</TableCell>
                        <TableCell>{e.monthly_rate?.toLocaleString() || '—'} SAR</TableCell>
                        <TableCell className="text-xs">{e.rental_start_date} → {e.rental_end_date || 'Ongoing'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-3 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="EQ-001" /></div>
                <div><Label>Name *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="CAT 320 Excavator" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Category</Label>
                  <Select value={form.category || 'heavy'} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heavy">Heavy</SelectItem><SelectItem value="light">Light</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="scaffolding">Scaffolding</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.type')}</Label>
                  <Select value={form.type || 'owned'} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="owned">Owned</SelectItem><SelectItem value="rented">Rented</SelectItem><SelectItem value="leased">Leased</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.status')}</Label>
                  <Select value={form.status || 'available'} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem><SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Make</Label><Input value={form.make || ''} onChange={e => setForm({ ...form, make: e.target.value })} /></div>
                <div><Label>Model</Label><Input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Serial Number</Label><Input value={form.serial_number || ''} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              {(form.type === 'owned' || !form.type) && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Purchase Cost</Label><Input type="number" value={form.purchase_cost || 0} onChange={e => setForm({ ...form, purchase_cost: +e.target.value })} /></div>
                    <div><Label>Salvage Value</Label><Input type="number" value={form.salvage_value || 0} onChange={e => setForm({ ...form, salvage_value: +e.target.value })} /></div>
                    <div><Label>Useful Life (yrs)</Label><Input type="number" value={form.useful_life_years || 10} onChange={e => setForm({ ...form, useful_life_years: +e.target.value })} /></div>
                  </div>
                  <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date || ''} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
                </>
              )}
              {form.type === 'rented' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Daily Rate</Label><Input type="number" value={form.daily_rate || 0} onChange={e => setForm({ ...form, daily_rate: +e.target.value })} /></div>
                  <div><Label>Monthly Rate</Label><Input type="number" value={form.monthly_rate || 0} onChange={e => setForm({ ...form, monthly_rate: +e.target.value })} /></div>
                  <div><Label>Vendor</Label><Input value={form.rental_vendor || ''} onChange={e => setForm({ ...form, rental_vendor: e.target.value })} /></div>
                  <div><Label>Rental End Date</Label><Input type="date" value={form.rental_end_date || ''} onChange={e => setForm({ ...form, rental_end_date: e.target.value })} /></div>
                </div>
              )}
              <div><Label>{t('common.notes')}</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleSave}>{editItem ? 'Update' : 'Add'} Equipment</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Log Usage Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Equipment Usage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.date')}</Label><Input type="date" value={logForm.log_date || ''} onChange={e => setLogForm({ ...logForm, log_date: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Hours Used</Label><Input type="number" value={logForm.hours_used || 0} onChange={e => setLogForm({ ...logForm, hours_used: +e.target.value })} /></div>
              <div><Label>Hours Idle</Label><Input type="number" value={logForm.hours_idle || 0} onChange={e => setLogForm({ ...logForm, hours_idle: +e.target.value })} /></div>
              <div><Label>Maintenance</Label><Input type="number" value={logForm.hours_maintenance || 0} onChange={e => setLogForm({ ...logForm, hours_maintenance: +e.target.value })} /></div>
            </div>
            <div><Label>Fuel Consumed (L)</Label><Input type="number" value={logForm.fuel_consumed || ''} onChange={e => setLogForm({ ...logForm, fuel_consumed: +e.target.value })} /></div>
            <div><Label>Operator</Label><Input value={logForm.operator_name || ''} onChange={e => setLogForm({ ...logForm, operator_name: e.target.value })} /></div>
            <div><Label>Work Description</Label><Textarea value={logForm.work_description || ''} onChange={e => setLogForm({ ...logForm, work_description: e.target.value })} /></div>
            <Button className="w-full" onClick={handleLogUsage}>Log Usage</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={showMaintForm} onOpenChange={setShowMaintForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Maintenance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={maintForm.title || ''} onChange={e => setMaintForm({ ...maintForm, title: e.target.value })} placeholder="Oil change, filter replacement..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.type')}</Label>
                <Select value={maintForm.maintenance_type || 'preventive'} onValueChange={v => setMaintForm({ ...maintForm, maintenance_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem><SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Scheduled Date</Label><Input type="date" value={maintForm.scheduled_date || ''} onChange={e => setMaintForm({ ...maintForm, scheduled_date: e.target.value })} /></div>
            </div>
            <div><Label>Estimated Cost</Label><Input type="number" value={maintForm.cost || 0} onChange={e => setMaintForm({ ...maintForm, cost: +e.target.value })} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={maintForm.description || ''} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} /></div>
            <Button className="w-full" onClick={handleCreateMaint}>Schedule Maintenance</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
