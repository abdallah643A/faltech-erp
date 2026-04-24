import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts';
import { Truck, Plus, Calculator, CheckCircle, XCircle, Scale } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  monthly_rental: number;
  daily_rental: number;
  maintenance_annual: number;
  operating_cost_monthly: number;
  useful_life_years: number;
  salvage_value: number;
  utilization_pct: number;
}

const SAMPLE_EQUIPMENT: Equipment[] = [
  { id: '1', name: 'Tower Crane (10T)', category: 'Cranes', purchase_price: 850000, monthly_rental: 35000, daily_rental: 1500, maintenance_annual: 25000, operating_cost_monthly: 8000, useful_life_years: 15, salvage_value: 120000, utilization_pct: 75 },
  { id: '2', name: 'Excavator CAT 320', category: 'Earthwork', purchase_price: 420000, monthly_rental: 18000, daily_rental: 800, maintenance_annual: 15000, operating_cost_monthly: 5000, useful_life_years: 10, salvage_value: 80000, utilization_pct: 65 },
  { id: '3', name: 'Concrete Pump (42m)', category: 'Concrete', purchase_price: 650000, monthly_rental: 28000, daily_rental: 1200, maintenance_annual: 20000, operating_cost_monthly: 7000, useful_life_years: 12, salvage_value: 90000, utilization_pct: 55 },
  { id: '4', name: 'Generator 500KVA', category: 'Power', purchase_price: 180000, monthly_rental: 8000, daily_rental: 350, maintenance_annual: 8000, operating_cost_monthly: 3000, useful_life_years: 10, salvage_value: 25000, utilization_pct: 80 },
];

export function EquipmentRentBuyAnalysis() {
  const [equipment, setEquipment] = useState<Equipment[]>(SAMPLE_EQUIPMENT);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [projectMonths, setProjectMonths] = useState(24);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Cranes', purchase_price: '', monthly_rental: '', daily_rental: '', maintenance_annual: '', operating_cost_monthly: '', useful_life_years: '10', salvage_value: '', utilization_pct: '70' });

  const selected = equipment.find(e => e.id === selectedId);

  // Break-even and TCO calculation for selected equipment
  const analysis = useMemo(() => {
    if (!selected) return null;
    const { purchase_price, monthly_rental, maintenance_annual, operating_cost_monthly, useful_life_years, salvage_value } = selected;

    // Monthly depreciation (straight-line)
    const monthlyDepreciation = (purchase_price - salvage_value) / (useful_life_years * 12);
    const monthlyMaintenance = maintenance_annual / 12;
    const monthlyOwnership = monthlyDepreciation + monthlyMaintenance + operating_cost_monthly;

    // Break-even months
    const breakEvenMonths = monthly_rental > monthlyOwnership
      ? Math.ceil(purchase_price / (monthly_rental - monthlyOwnership))
      : Infinity;

    // TCO comparison over project duration
    const rentalTotal = monthly_rental * projectMonths;
    const ownershipTotal = (monthlyOwnership * projectMonths) + purchase_price - (projectMonths >= useful_life_years * 12 ? salvage_value : salvage_value * (projectMonths / (useful_life_years * 12)));

    // Build comparison data
    const comparisonData = Array.from({ length: Math.min(projectMonths, 60) }, (_, i) => {
      const month = i + 1;
      const rentCost = monthly_rental * month;
      const buyCost = purchase_price + (monthlyMaintenance + operating_cost_monthly) * month;
      const adjustedBuyCost = buyCost - (salvage_value * (month / (useful_life_years * 12)));
      return { month, rent: Math.round(rentCost / 1000), buy: Math.round(adjustedBuyCost / 1000) };
    });

    const recommendation = rentalTotal < ownershipTotal ? 'rent' : 'buy';
    const savings = Math.abs(rentalTotal - ownershipTotal);

    return {
      monthlyOwnership: Math.round(monthlyOwnership),
      breakEvenMonths,
      rentalTotal: Math.round(rentalTotal),
      ownershipTotal: Math.round(ownershipTotal),
      recommendation,
      savings: Math.round(savings),
      comparisonData,
      monthlyDepreciation: Math.round(monthlyDepreciation),
    };
  }, [selected, projectMonths]);

  // Summary across all equipment
  const summaryData = equipment.map(e => {
    const rentTotal = e.monthly_rental * projectMonths;
    const monthlyOwn = ((e.purchase_price - e.salvage_value) / (e.useful_life_years * 12)) + (e.maintenance_annual / 12) + e.operating_cost_monthly;
    const buyTotal = e.purchase_price + (((e.maintenance_annual / 12) + e.operating_cost_monthly) * projectMonths) - (e.salvage_value * Math.min(1, projectMonths / (e.useful_life_years * 12)));
    return {
      name: e.name,
      rent: Math.round(rentTotal / 1000),
      buy: Math.round(buyTotal / 1000),
      recommendation: rentTotal < buyTotal ? 'Rent' : 'Buy',
      savings: Math.round(Math.abs(rentTotal - buyTotal) / 1000),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Equipment Rent vs. Buy Analysis</h3>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <Label className="text-xs whitespace-nowrap">Project Duration:</Label>
            <Input type="number" className="w-20 h-8" value={projectMonths} onChange={e => setProjectMonths(Number(e.target.value) || 12)} />
            <span className="text-xs text-muted-foreground">months</span>
          </div>
          <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Equipment</Button>
        </div>
      </div>

      {/* Equipment Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {equipment.map(e => {
          const rentT = e.monthly_rental * projectMonths;
          const buyT = e.purchase_price + (((e.maintenance_annual / 12) + e.operating_cost_monthly) * projectMonths);
          const rec = rentT < buyT ? 'rent' : 'buy';
          return (
            <Card key={e.id} className={`cursor-pointer transition-colors ${selectedId === e.id ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`} onClick={() => setSelectedId(e.id)}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={rec === 'rent' ? 'secondary' : 'default'} className="text-[9px]">{rec === 'rent' ? 'RENT' : 'BUY'}</Badge>
                </div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.category} · {e.utilization_pct}% util.</p>
                <div className="flex justify-between mt-2 text-xs">
                  <span>Rent: {e.monthly_rental.toLocaleString()}/mo</span>
                  <span>Buy: {(e.purchase_price / 1000).toFixed(0)}K</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analysis Detail */}
      {selected && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{selected.name} — Cost Comparison</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={analysis.comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: 'Months', fontSize: 10, position: 'bottom' }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
                  <Tooltip formatter={(v: number) => `${v}K SAR`} />
                  <Legend />
                  <Line dataKey="rent" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Rental Cost" dot={false} />
                  <Line dataKey="buy" stroke="hsl(var(--primary))" strokeWidth={2} name="Ownership Cost" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Decision Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className={`p-4 rounded-lg border-2 ${analysis.recommendation === 'buy' ? 'border-primary bg-primary/5' : 'border-chart-3 bg-chart-3/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {analysis.recommendation === 'buy' ? <CheckCircle className="h-5 w-5 text-primary" /> : <CheckCircle className="h-5 w-5 text-chart-3" />}
                  <span className="text-lg font-bold">Recommendation: {analysis.recommendation === 'buy' ? 'PURCHASE' : 'RENT'}</span>
                </div>
                <p className="text-sm text-muted-foreground">For {projectMonths} months, {analysis.recommendation === 'buy' ? 'purchasing' : 'renting'} saves <strong>{analysis.savings.toLocaleString()} SAR</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Rental Cost</p>
                  <p className="text-lg font-bold">{analysis.rentalTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Ownership Cost</p>
                  <p className="text-lg font-bold">{analysis.ownershipTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Break-Even Point</p>
                  <p className="text-lg font-bold">{analysis.breakEvenMonths === Infinity ? 'N/A' : `${analysis.breakEvenMonths} months`}</p>
                </div>
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground">Monthly Depreciation</p>
                  <p className="text-lg font-bold">{analysis.monthlyDepreciation.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Purchase: {selected.purchase_price.toLocaleString()} SAR · Salvage: {selected.salvage_value.toLocaleString()} SAR</p>
                <p>• Maintenance: {selected.maintenance_annual.toLocaleString()}/yr · Operating: {selected.operating_cost_monthly.toLocaleString()}/mo</p>
                <p>• Useful life: {selected.useful_life_years} years · Utilization: {selected.utilization_pct}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Portfolio Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Summary ({projectMonths} month horizon, K SAR)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summaryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
              <Tooltip formatter={(v: number) => `${v}K SAR`} />
              <Legend />
              <Bar dataKey="rent" fill="hsl(var(--chart-3))" name="Rent Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="buy" fill="hsl(var(--primary))" name="Buy Total" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Add Equipment Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Backhoe Loader" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cranes', 'Earthwork', 'Concrete', 'Power', 'Transport', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} /></div>
              <div><Label>Monthly Rental</Label><Input type="number" value={form.monthly_rental} onChange={e => setForm(f => ({ ...f, monthly_rental: e.target.value }))} /></div>
              <div><Label>Daily Rental</Label><Input type="number" value={form.daily_rental} onChange={e => setForm(f => ({ ...f, daily_rental: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Maintenance/yr</Label><Input type="number" value={form.maintenance_annual} onChange={e => setForm(f => ({ ...f, maintenance_annual: e.target.value }))} /></div>
              <div><Label>Operating/mo</Label><Input type="number" value={form.operating_cost_monthly} onChange={e => setForm(f => ({ ...f, operating_cost_monthly: e.target.value }))} /></div>
              <div><Label>Useful Life (yrs)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Salvage Value</Label><Input type="number" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: e.target.value }))} /></div>
              <div><Label>Utilization %</Label><Input type="number" value={form.utilization_pct} onChange={e => setForm(f => ({ ...f, utilization_pct: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => {
            setEquipment(prev => [...prev, {
              id: crypto.randomUUID(), name: form.name, category: form.category,
              purchase_price: Number(form.purchase_price), monthly_rental: Number(form.monthly_rental),
              daily_rental: Number(form.daily_rental), maintenance_annual: Number(form.maintenance_annual),
              operating_cost_monthly: Number(form.operating_cost_monthly), useful_life_years: Number(form.useful_life_years),
              salvage_value: Number(form.salvage_value), utilization_pct: Number(form.utilization_pct),
            }]);
            setAddDialog(false);
          }} disabled={!form.name}>Add Equipment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
