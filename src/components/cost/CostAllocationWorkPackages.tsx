import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { Layers, Plus, GitBranch, DollarSign, Edit2, Trash2, Upload } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface WorkPackage {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  phase: string;
  allocation_method: 'percentage' | 'fixed';
  allocation_value: number;
  budget: number;
  actual: number;
  unit: string;
  quantity: number;
  cost_per_unit: number;
}

const PHASES = ['Design', 'Procurement', 'Construction', 'Commissioning', 'Closeout'];

export function CostAllocationWorkPackages({ projects }: { projects: any[] }) {
  const [packages, setPackages] = useState<WorkPackage[]>([
    { id: '1', code: 'WP-001', name: 'Site Preparation', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 15, budget: 150000, actual: 142000, unit: 'sqm', quantity: 5000, cost_per_unit: 30 },
    { id: '2', code: 'WP-002', name: 'Foundation Work', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 25, budget: 250000, actual: 268000, unit: 'sqm', quantity: 3000, cost_per_unit: 83 },
    { id: '3', code: 'WP-003', name: 'Structural Steel', parent_id: null, phase: 'Construction', allocation_method: 'fixed', allocation_value: 180000, budget: 180000, actual: 175000, unit: 'ton', quantity: 120, cost_per_unit: 1500 },
    { id: '4', code: 'WP-004', name: 'MEP Systems', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 20, budget: 200000, actual: 95000, unit: 'lot', quantity: 1, cost_per_unit: 200000 },
    { id: '5', code: 'WP-005', name: 'Finishing & Fitout', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 15, budget: 150000, actual: 0, unit: 'sqm', quantity: 8000, cost_per_unit: 19 },
    { id: '1-1', code: 'WP-001.1', name: 'Excavation', parent_id: '1', phase: 'Construction', allocation_method: 'fixed', allocation_value: 80000, budget: 80000, actual: 78000, unit: 'cum', quantity: 2000, cost_per_unit: 40 },
    { id: '1-2', code: 'WP-001.2', name: 'Grading & Leveling', parent_id: '1', phase: 'Construction', allocation_method: 'fixed', allocation_value: 70000, budget: 70000, actual: 64000, unit: 'sqm', quantity: 5000, cost_per_unit: 14 },
  ]);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<WorkPackage>>({ code: '', name: '', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 0, budget: 0, unit: 'sqm', quantity: 0 });
  const [auditLog] = useState([
    { date: '2026-03-15', user: 'Ahmed K.', action: 'Changed WP-002 allocation from 20% to 25%', old: '20%', new: '25%' },
    { date: '2026-03-10', user: 'Sara M.', action: 'Added WP-005 Finishing & Fitout', old: '-', new: '15%' },
  ]);

  const totalBudget = packages.filter(p => !p.parent_id).reduce((s, p) => s + p.budget, 0);
  const totalActual = packages.filter(p => !p.parent_id).reduce((s, p) => s + p.actual, 0);
  const totalAllocation = packages.filter(p => !p.parent_id && p.allocation_method === 'percentage').reduce((s, p) => s + p.allocation_value, 0);

  const rootPackages = packages.filter(p => !p.parent_id);
  const getChildren = (id: string) => packages.filter(p => p.parent_id === id);

  const treemapData = rootPackages.map(p => ({
    name: p.code + ' ' + p.name,
    size: p.budget,
    actual: p.actual,
    fill: p.actual > p.budget ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
  }));

  const handleSave = () => {
    if (editId) {
      setPackages(prev => prev.map(p => p.id === editId ? { ...p, ...form } as WorkPackage : p));
    } else {
      setPackages(prev => [...prev, { id: crypto.randomUUID(), ...form, actual: 0, cost_per_unit: form.budget && form.quantity ? Math.round((form.budget as number) / (form.quantity as number)) : 0 } as WorkPackage]);
    }
    setDialog(false);
    setEditId(null);
  };

  const exportCols = [
    { key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'phase', header: 'Phase' },
    { key: 'allocation_method', header: 'Method' }, { key: 'allocation_value', header: 'Allocation' },
    { key: 'budget', header: 'Budget' }, { key: 'actual', header: 'Actual' },
    { key: 'unit', header: 'Unit' }, { key: 'quantity', header: 'Qty' }, { key: 'cost_per_unit', header: 'Cost/Unit' },
  ];

  const renderPackageRow = (pkg: WorkPackage, depth = 0) => {
    const variance = pkg.budget > 0 ? ((pkg.actual - pkg.budget) / pkg.budget * 100) : 0;
    const children = getChildren(pkg.id);
    return (
      <>
        <TableRow key={pkg.id}>
          <TableCell style={{ paddingLeft: `${depth * 24 + 16}px` }} className="font-mono text-xs">
            {children.length > 0 ? '📁 ' : '📄 '}{pkg.code}
          </TableCell>
          <TableCell className="font-medium">{pkg.name}</TableCell>
          <TableCell><Badge variant="outline">{pkg.phase}</Badge></TableCell>
          <TableCell>{pkg.allocation_method === 'percentage' ? `${pkg.allocation_value}%` : `${pkg.allocation_value.toLocaleString()} SAR`}</TableCell>
          <TableCell>{pkg.budget.toLocaleString()}</TableCell>
          <TableCell className="font-bold">{pkg.actual.toLocaleString()}</TableCell>
          <TableCell className={variance > 5 ? 'text-destructive font-bold' : variance < -5 ? 'text-emerald-600 font-bold' : ''}>
            {variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%` : '-'}
          </TableCell>
          <TableCell className="text-muted-foreground">{pkg.cost_per_unit.toLocaleString()} /{pkg.unit}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setForm(pkg); setEditId(pkg.id); setDialog(true);
              }}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPackages(p => p.filter(x => x.id !== pkg.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {children.map(c => renderPackageRow(c, depth + 1))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Cost Allocation by Work Packages</h3>
        <div className="flex gap-2">
          <ExportImportButtons data={packages} columns={exportCols} filename="WorkPackageAllocation" title="Work Packages" onImport={async (rows) => {
            rows.forEach(r => setPackages(prev => [...prev, { id: crypto.randomUUID(), code: r.Code, name: r.Name, parent_id: null, phase: r.Phase || 'Construction', allocation_method: 'fixed', allocation_value: Number(r.Allocation) || 0, budget: Number(r.Budget) || 0, actual: Number(r.Actual) || 0, unit: r.Unit || 'lot', quantity: Number(r.Qty) || 1, cost_per_unit: Number(r['Cost/Unit']) || 0 }]));
          }} />
          <Button size="sm" onClick={() => { setForm({ code: '', name: '', parent_id: null, phase: 'Construction', allocation_method: 'percentage', allocation_value: 0, budget: 0, unit: 'sqm', quantity: 0 }); setEditId(null); setDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Package
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Work Packages</p>
          <p className="text-2xl font-bold">{packages.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold">{(totalBudget / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Actual</p>
          <p className="text-2xl font-bold">{(totalActual / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Allocation %</p>
          <p className={`text-2xl font-bold ${totalAllocation > 100 ? 'text-destructive' : ''}`}>{totalAllocation}%</p>
          <Progress value={Math.min(totalAllocation, 100)} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Cost/sqm</p>
          <p className="text-2xl font-bold">{packages.filter(p => p.unit === 'sqm').length > 0 ? Math.round(packages.filter(p => p.unit === 'sqm').reduce((s, p) => s + p.cost_per_unit, 0) / packages.filter(p => p.unit === 'sqm').length) : 0}</p>
        </CardContent></Card>
      </div>

      {/* WBS Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Phase</TableHead>
              <TableHead>Allocation</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead>
              <TableHead>Variance</TableHead><TableHead>Cost/Unit</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rootPackages.map(p => renderPackageRow(p))}
              {rootPackages.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No work packages defined</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Allocation Change Log</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {auditLog.map((log, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
              <Badge variant="outline" className="text-[10px] shrink-0">{log.date}</Badge>
              <span className="text-muted-foreground">{log.user}:</span>
              <span>{log.action}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Work Package</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code</Label><Input value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WP-006" /></div>
              <div><Label>Name</Label><Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Phase</Label>
                <Select value={form.phase || 'Construction'} onValueChange={v => setForm(f => ({ ...f, phase: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parent Package</Label>
                <Select value={form.parent_id || 'none'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root)</SelectItem>
                    {rootPackages.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Method</Label>
                <Select value={form.allocation_method || 'percentage'} onValueChange={v => setForm(f => ({ ...f, allocation_method: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{form.allocation_method === 'percentage' ? 'Allocation %' : 'Amount'}</Label><Input type="number" value={form.allocation_value || ''} onChange={e => setForm(f => ({ ...f, allocation_value: Number(e.target.value) }))} /></div>
              <div><Label>Budget</Label><Input type="number" value={form.budget || ''} onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Unit</Label><Input value={form.unit || ''} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="sqm, ton, lot" /></div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
