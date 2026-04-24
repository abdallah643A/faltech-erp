import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import {
  Plus, RefreshCw, Pencil, Trash2, Users, Wrench, Package, Search,
  HardHat, Truck, Box,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Resource {
  id: string;
  name: string;
  type: string;
  category?: string;
  unit?: string;
  unit_cost: number;
  quantity_available: number;
  status: string;
  notes?: string;
}

interface Allocation {
  id: string;
  resource_id: string;
  project_id: string;
  quantity_allocated: number;
  start_date?: string;
  end_date?: string;
  actual_usage: number;
  notes?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  labor: Users, equipment: Wrench, material: Package,
};

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-100 text-gray-800',
};

export default function CPMSResources() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState<any>({ name: '', type: 'labor', category: '', unit: '', unit_cost: 0, quantity_available: 0, status: 'available', notes: '' });
  const [allocForm, setAllocForm] = useState<any>({ resource_id: '', project_id: '', quantity_allocated: 0, start_date: '', end_date: '', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    const [resR, allocR, projR, empR, assetR] = await Promise.all([
      supabase.from('cpms_resources' as any).select('*').order('name'),
      supabase.from('cpms_resource_allocations' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('cpms_projects' as any).select('id, code, name'),
      supabase.from('employees').select('id, employee_code, first_name, last_name, basic_salary, department:departments!employees_department_id_fkey(name), position:positions!employees_position_id_fkey(title)').eq('employment_status', 'active').order('first_name'),
      supabase.from('assets').select('id, asset_code, name, category_id, status, condition, serial_number').order('name'),
    ]);
    setResources((resR.data || []) as any);
    setAllocations((allocR.data || []) as any);
    setProjects((projR.data || []) as any);
    setEmployees((empR.data || []) as any);
    setAssets((assetR.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name) return;
    if (editResource?.id) {
      const { error } = await supabase.from('cpms_resources' as any).update(form).eq('id', editResource.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Resource updated' });
    } else {
      const { error } = await supabase.from('cpms_resources' as any).insert(form);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Resource created' });
    }
    setShowForm(false);
    setEditResource(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    await supabase.from('cpms_resources' as any).delete().eq('id', id);
    toast({ title: 'Resource deleted' });
    fetchData();
  };

  const handleAllocSave = async () => {
    if (!allocForm.resource_id || !allocForm.project_id) return;
    const { error } = await supabase.from('cpms_resource_allocations' as any).insert(allocForm);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Resource allocated' });
    setShowAllocForm(false);
    fetchData();
  };

  const filtered = resources.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    labor: resources.filter(r => r.type === 'labor').length,
    equipment: resources.filter(r => r.type === 'equipment').length,
    material: resources.filter(r => r.type === 'material').length,
    totalAllocations: allocations.length,
    totalAllocated: allocations.reduce((s, a) => s + (a.quantity_allocated || 0), 0),
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" /> Resource Management
          </h1>
          <p className="text-sm text-muted-foreground">إدارة الموارد – Labor, Equipment & Materials</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={filtered}
            columns={[
              { key: 'name', header: 'Name' }, { key: 'type', header: 'Type' },
              { key: 'category', header: 'Category' }, { key: 'unit', header: 'Unit' },
              { key: 'unit_cost', header: 'Unit Cost' }, { key: 'quantity_available', header: 'Qty Available' },
              { key: 'status', header: 'Status' }, { key: 'notes', header: 'Notes' },
            ]}
            filename="cpms-resources"
            title="CPMS Resources"
            onImport={async (rows) => {
              const mapped = rows.map((r: any) => ({
                name: r['Name'] || r.name || '',
                type: r['Type'] || r.type || 'labor',
                category: r['Category'] || r.category || null,
                unit: r['Unit'] || r.unit || null,
                unit_cost: parseFloat(r['Unit Cost'] || r.unit_cost) || 0,
                quantity_available: parseFloat(r['Qty Available'] || r.quantity_available) || 0,
                status: r['Status'] || r.status || 'available',
                notes: r['Notes'] || r.notes || null,
              })).filter((r: any) => r.name);
              if (mapped.length > 0) {
                const { error } = await supabase.from('cpms_resources' as any).insert(mapped);
                if (error) throw error;
              }
              fetchData();
            }}
          />
          <Button onClick={() => { setEditResource(null); setForm({ name: '', type: 'labor', category: '', unit: '', unit_cost: 0, quantity_available: 0, status: 'available' }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Resource
          </Button>
          <Button variant="outline" onClick={() => setShowAllocForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Allocate
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /><div><p className="text-xs text-muted-foreground">Labor</p><p className="text-2xl font-bold">{stats.labor}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><div className="flex items-center gap-2"><Truck className="h-5 w-5 text-orange-500" /><div><p className="text-xs text-muted-foreground">Equipment</p><p className="text-2xl font-bold">{stats.equipment}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><div className="flex items-center gap-2"><Box className="h-5 w-5 text-green-500" /><div><p className="text-xs text-muted-foreground">Materials</p><p className="text-2xl font-bold">{stats.material}</p></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-purple-500" /><div><p className="text-xs text-muted-foreground">Allocations</p><p className="text-2xl font-bold">{stats.totalAllocations}</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="material">Material</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({allocations.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="resources">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><RefreshCw className="animate-spin h-5 w-5 mx-auto" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No resources</TableCell></TableRow>
                  ) : filtered.map(r => {
                    const Icon = typeIcons[r.type] || Package;
                    return (
                      <TableRow key={r.id}>
                        <TableCell><div className="flex items-center gap-1"><Icon className="h-4 w-4 text-muted-foreground" /><span className="capitalize">{r.type}</span></div></TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.category || '-'}</TableCell>
                        <TableCell>{r.unit || '-'}</TableCell>
                        <TableCell className="text-right">{r.unit_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{r.quantity_available}</TableCell>
                        <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditResource(r); setForm(r); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="allocations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No allocations</TableCell></TableRow>
                  ) : allocations.map(a => {
                    const res = resources.find(r => r.id === a.resource_id);
                    const proj = projects.find(p => p.id === a.project_id);
                    const util = a.quantity_allocated > 0 ? (a.actual_usage / a.quantity_allocated) * 100 : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{res?.name || '-'}</TableCell>
                        <TableCell>{proj ? `${proj.code} - ${proj.name}` : '-'}</TableCell>
                        <TableCell className="text-right">{a.quantity_allocated}</TableCell>
                        <TableCell className="text-right">{a.actual_usage}</TableCell>
                        <TableCell><div className="flex items-center gap-2 min-w-[80px]"><Progress value={util} className="h-2 flex-1" /><span className="text-xs">{util.toFixed(0)}%</span></div></TableCell>
                        <TableCell className="text-xs">{a.start_date || '-'} → {a.end_date || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resource Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.type')}</Label>
              <Select value={form.type} onValueChange={v => setForm((f: any) => ({ ...f, type: v, name: '', category: '', unit_cost: 0 }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Labor → pick from HR employees */}
            {form.type === 'labor' ? (
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={form.name} onValueChange={v => {
                  const emp = employees.find((e: any) => `${e.first_name} ${e.last_name}` === v);
                  setForm((f: any) => ({
                    ...f,
                    name: v,
                    category: emp?.position?.title || emp?.department?.name || '',
                    unit: 'hours',
                    unit_cost: emp?.basic_salary ? Math.round(emp.basic_salary / 22 / 8) : 0,
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => {
                      const fullName = `${emp.first_name} ${emp.last_name}`;
                      const subtitle = [emp.employee_code, emp.position?.title, emp.department?.name].filter(Boolean).join(' • ');
                      return (
                        <SelectItem key={emp.id} value={fullName}>
                          <div className="flex flex-col">
                            <span>{fullName}</span>
                            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : form.type === 'equipment' ? (
              /* Equipment → pick from Assets */

              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select value={form.name} onValueChange={v => {
                  const asset = assets.find((a: any) => a.name === v);
                  setForm((f: any) => ({
                    ...f,
                    name: v,
                    category: asset?.serial_number || '',
                    unit: 'days',
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a: any) => (
                      <SelectItem key={a.id} value={a.name}>
                        <div className="flex flex-col">
                          <span>{a.name}</span>
                          <span className="text-xs text-muted-foreground">{[a.asset_code, a.serial_number, a.status].filter(Boolean).join(' • ')}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* Material → manual name */
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            )}

            <div className="space-y-2"><Label>Category</Label><Input value={form.category || ''} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unit</Label><Input value={form.unit || ''} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} placeholder="e.g. hours, pieces, m³" /></div>
            <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={e => setForm((f: any) => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>Qty Available</Label><Input type="number" value={form.quantity_available} onChange={e => setForm((f: any) => ({ ...f, quantity_available: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.name}>{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocation Form */}
      <Dialog open={showAllocForm} onOpenChange={setShowAllocForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Resource</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resource *</Label>
              <Select value={allocForm.resource_id} onValueChange={v => setAllocForm((f: any) => ({ ...f, resource_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={allocForm.project_id} onValueChange={v => setAllocForm((f: any) => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={allocForm.quantity_allocated} onChange={e => setAllocForm((f: any) => ({ ...f, quantity_allocated: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={allocForm.start_date} onChange={e => setAllocForm((f: any) => ({ ...f, start_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={allocForm.end_date} onChange={e => setAllocForm((f: any) => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAllocForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAllocSave} disabled={!allocForm.resource_id || !allocForm.project_id}>Allocate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
