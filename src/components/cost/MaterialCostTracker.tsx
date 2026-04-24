import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Package, Plus, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface MaterialItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  current_cost: number;
  avg_cost_3m: number;
  avg_cost_6m: number;
  waste_factor: number;
  suppliers: { name: string; price: number; lead_days: number }[];
  cost_history: { month: string; price: number }[];
}

const SAMPLE_MATERIALS: MaterialItem[] = [
  {
    id: '1', code: 'MAT-001', name: 'Structural Steel (Grade 50)', category: 'Steel', unit: 'ton',
    current_cost: 4200, avg_cost_3m: 4050, avg_cost_6m: 3900, waste_factor: 5,
    suppliers: [
      { name: 'SABIC Steel', price: 4200, lead_days: 14 },
      { name: 'ArcelorMittal KSA', price: 4350, lead_days: 21 },
      { name: 'Rajhi Steel', price: 4100, lead_days: 18 },
    ],
    cost_history: [
      { month: 'Oct', price: 3850 }, { month: 'Nov', price: 3900 }, { month: 'Dec', price: 3950 },
      { month: 'Jan', price: 4000 }, { month: 'Feb', price: 4050 }, { month: 'Mar', price: 4200 },
    ],
  },
  {
    id: '2', code: 'MAT-002', name: 'Ready-Mix Concrete (C40)', category: 'Concrete', unit: 'cum',
    current_cost: 320, avg_cost_3m: 310, avg_cost_6m: 305, waste_factor: 8,
    suppliers: [
      { name: 'Saudi Readymix', price: 320, lead_days: 3 },
      { name: 'Beton Ready Mix', price: 315, lead_days: 5 },
    ],
    cost_history: [
      { month: 'Oct', price: 300 }, { month: 'Nov', price: 305 }, { month: 'Dec', price: 308 },
      { month: 'Jan', price: 310 }, { month: 'Feb', price: 315 }, { month: 'Mar', price: 320 },
    ],
  },
  {
    id: '3', code: 'MAT-003', name: 'Copper Cables (16mm)', category: 'Electrical', unit: 'meter',
    current_cost: 45, avg_cost_3m: 42, avg_cost_6m: 40, waste_factor: 3,
    suppliers: [
      { name: 'Riyadh Cables', price: 45, lead_days: 7 },
      { name: 'Saudi Cable Co', price: 43, lead_days: 10 },
      { name: 'Jeddah Wires', price: 47, lead_days: 5 },
    ],
    cost_history: [
      { month: 'Oct', price: 38 }, { month: 'Nov', price: 39 }, { month: 'Dec', price: 40 },
      { month: 'Jan', price: 41 }, { month: 'Feb', price: 43 }, { month: 'Mar', price: 45 },
    ],
  },
  {
    id: '4', code: 'MAT-004', name: 'Ceramic Tiles (600x600)', category: 'Finishing', unit: 'sqm',
    current_cost: 85, avg_cost_3m: 82, avg_cost_6m: 80, waste_factor: 10,
    suppliers: [
      { name: 'RAK Ceramics', price: 85, lead_days: 14 },
      { name: 'Saudi Ceramics', price: 80, lead_days: 10 },
    ],
    cost_history: [
      { month: 'Oct', price: 78 }, { month: 'Nov', price: 79 }, { month: 'Dec', price: 80 },
      { month: 'Jan', price: 82 }, { month: 'Feb', price: 83 }, { month: 'Mar', price: 85 },
    ],
  },
];

export function MaterialCostTracker() {
  const [materials, setMaterials] = useState<MaterialItem[]>(SAMPLE_MATERIALS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', category: 'Steel', unit: 'ton', current_cost: '', waste_factor: '5' });

  const selected = materials.find(m => m.id === selectedId);
  const categories = [...new Set(materials.map(m => m.category))];
  const filtered = filter === 'all' ? materials : materials.filter(m => m.category === filter);

  // Variance alerts
  const alerts = materials.filter(m => {
    const change = m.avg_cost_3m > 0 ? ((m.current_cost - m.avg_cost_3m) / m.avg_cost_3m) * 100 : 0;
    return change > 5;
  });

  const exportCols = [
    { key: 'code', header: 'Code' }, { key: 'name', header: 'Name' }, { key: 'category', header: 'Category' },
    { key: 'unit', header: 'Unit' }, { key: 'current_cost', header: 'Current Cost' },
    { key: 'avg_cost_3m', header: '3M Avg' }, { key: 'waste_factor', header: 'Waste %' },
  ];

  const handleAdd = () => {
    setMaterials(prev => [...prev, {
      id: crypto.randomUUID(), code: form.code, name: form.name, category: form.category, unit: form.unit,
      current_cost: Number(form.current_cost), avg_cost_3m: Number(form.current_cost), avg_cost_6m: Number(form.current_cost),
      waste_factor: Number(form.waste_factor), suppliers: [], cost_history: [{ month: 'Mar', price: Number(form.current_cost) }],
    }]);
    setAddDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Material Cost Tracking</h3>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportImportButtons data={materials} columns={exportCols} filename="MaterialCosts" title="Materials" />
          <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Material</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Materials Tracked</p>
          <p className="text-2xl font-bold">{materials.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{categories.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Suppliers</p>
          <p className="text-2xl font-bold">{new Set(materials.flatMap(m => m.suppliers.map(s => s.name))).size}</p>
        </CardContent></Card>
        <Card className={alerts.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Price Alerts</p>
            <p className="text-2xl font-bold text-destructive">{alerts.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Material List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Materials</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.map(m => {
              const change3m = m.avg_cost_3m > 0 ? ((m.current_cost - m.avg_cost_3m) / m.avg_cost_3m * 100) : 0;
              return (
                <div key={m.id} onClick={() => setSelectedId(m.id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedId === m.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{m.name}</p>
                    {change3m > 5 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{m.code} · {m.category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">{m.current_cost.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/{m.unit}</span>
                      {change3m > 0 ? <TrendingUp className="h-3 w-3 text-destructive" /> : <TrendingDown className="h-3 w-3 text-emerald-600" />}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Waste: {m.waste_factor}% · 3M change: {change3m > 0 ? '+' : ''}{change3m.toFixed(1)}%</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {selected.name}
                  <Badge variant="outline">{selected.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Trend */}
                <div>
                  <p className="text-xs font-medium mb-2">6-Month Price Trend ({selected.unit})</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={selected.cost_history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v} SAR`} />
                      <Line dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Supplier Comparison */}
                <div>
                  <p className="text-xs font-medium mb-2">Supplier Comparison</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Supplier</TableHead><TableHead>Price/{selected.unit}</TableHead><TableHead>Lead Time</TableHead><TableHead>vs Best</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {selected.suppliers.sort((a, b) => a.price - b.price).map((s, i) => {
                        const best = selected.suppliers.reduce((min, x) => x.price < min ? x.price : min, Infinity);
                        const diff = ((s.price - best) / best * 100);
                        return (
                          <TableRow key={s.name}>
                            <TableCell className="font-medium">{s.name} {i === 0 && <Badge className="ml-1 text-[9px]">Best</Badge>}</TableCell>
                            <TableCell className="font-bold">{s.price.toLocaleString()} SAR</TableCell>
                            <TableCell>{s.lead_days} days</TableCell>
                            <TableCell className={diff > 0 ? 'text-destructive' : 'text-emerald-600'}>{diff > 0 ? `+${diff.toFixed(1)}%` : 'Best'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Cost with Waste */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-muted/50"><CardContent className="pt-3 pb-2 px-3">
                    <p className="text-[10px] text-muted-foreground">Unit Cost</p>
                    <p className="text-lg font-bold">{selected.current_cost} SAR</p>
                  </CardContent></Card>
                  <Card className="bg-muted/50"><CardContent className="pt-3 pb-2 px-3">
                    <p className="text-[10px] text-muted-foreground">With Waste ({selected.waste_factor}%)</p>
                    <p className="text-lg font-bold">{Math.round(selected.current_cost * (1 + selected.waste_factor / 100))} SAR</p>
                  </CardContent></Card>
                  <Card className="bg-muted/50"><CardContent className="pt-3 pb-2 px-3">
                    <p className="text-[10px] text-muted-foreground">6M Escalation</p>
                    <p className="text-lg font-bold text-destructive">
                      +{selected.avg_cost_6m > 0 ? ((selected.current_cost - selected.avg_cost_6m) / selected.avg_cost_6m * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent></Card>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a material to view details, supplier comparison, and price trends
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Material */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAT-005" /></div>
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Steel', 'Concrete', 'Electrical', 'Finishing', 'Plumbing', 'HVAC', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <div><Label>Current Cost</Label><Input type="number" value={form.current_cost} onChange={e => setForm(f => ({ ...f, current_cost: e.target.value }))} /></div>
            </div>
            <div><Label>Waste Factor %</Label><Input type="number" value={form.waste_factor} onChange={e => setForm(f => ({ ...f, waste_factor: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAdd} disabled={!form.code || !form.name}>Add Material</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
