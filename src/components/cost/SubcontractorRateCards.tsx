import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import { Users, Plus, Star, FileText, Scale, AlertTriangle } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  region: string;
  contact: string;
  insurance_expiry: string;
  bonding_limit: number;
  performance_rating: number;
  quality_rating: number;
  safety_rating: number;
  schedule_rating: number;
  rates: { description: string; unit: string; rate: number; negotiated_rate: number }[];
  historical_rates: { period: string; avg_rate: number }[];
  notes: string;
}

const SAMPLE_SUBS: Subcontractor[] = [
  {
    id: '1', name: 'Gulf Electrical Services', trade: 'Electrical', region: 'Central', contact: '+966 50 123 4567',
    insurance_expiry: '2027-06-30', bonding_limit: 5000000, performance_rating: 4.2, quality_rating: 4.5, safety_rating: 4.0, schedule_rating: 3.8,
    rates: [
      { description: 'Electrical Installation', unit: 'sqm', rate: 120, negotiated_rate: 110 },
      { description: 'Panel Board Supply & Install', unit: 'each', rate: 8500, negotiated_rate: 7800 },
      { description: 'Cable Tray Installation', unit: 'lm', rate: 85, negotiated_rate: 80 },
    ],
    historical_rates: [{ period: 'Q1-25', avg_rate: 105 }, { period: 'Q2-25', avg_rate: 108 }, { period: 'Q3-25', avg_rate: 112 }, { period: 'Q4-25', avg_rate: 115 }, { period: 'Q1-26', avg_rate: 120 }],
    notes: 'Reliable for large-scale projects. Prefers projects >2M SAR.',
  },
  {
    id: '2', name: 'Al Rajhi Plumbing', trade: 'Plumbing', region: 'Central', contact: '+966 55 987 6543',
    insurance_expiry: '2026-12-31', bonding_limit: 2000000, performance_rating: 3.8, quality_rating: 4.0, safety_rating: 4.2, schedule_rating: 3.5,
    rates: [
      { description: 'Plumbing Rough-In', unit: 'point', rate: 350, negotiated_rate: 320 },
      { description: 'Drainage Installation', unit: 'lm', rate: 95, negotiated_rate: 90 },
    ],
    historical_rates: [{ period: 'Q1-25', avg_rate: 300 }, { period: 'Q2-25', avg_rate: 310 }, { period: 'Q3-25', avg_rate: 325 }, { period: 'Q4-25', avg_rate: 340 }, { period: 'Q1-26', avg_rate: 350 }],
    notes: 'Good quality but occasional schedule delays.',
  },
  {
    id: '3', name: 'Saudi Steel Fabricators', trade: 'Steel Work', region: 'Eastern', contact: '+966 53 456 7890',
    insurance_expiry: '2026-08-15', bonding_limit: 8000000, performance_rating: 4.5, quality_rating: 4.7, safety_rating: 4.3, schedule_rating: 4.4,
    rates: [
      { description: 'Structural Steel Fabrication', unit: 'ton', rate: 5500, negotiated_rate: 5200 },
      { description: 'Steel Erection', unit: 'ton', rate: 2800, negotiated_rate: 2600 },
      { description: 'Welding Inspection', unit: 'joint', rate: 150, negotiated_rate: 140 },
    ],
    historical_rates: [{ period: 'Q1-25', avg_rate: 5000 }, { period: 'Q2-25', avg_rate: 5100 }, { period: 'Q3-25', avg_rate: 5200 }, { period: 'Q4-25', avg_rate: 5350 }, { period: 'Q1-26', avg_rate: 5500 }],
    notes: 'Premium quality. Best for critical structural work.',
  },
];

const TRADES = ['Electrical', 'Plumbing', 'Steel Work', 'HVAC', 'Concrete', 'Finishing', 'Landscaping', 'Fire Protection'];

export function SubcontractorRateCards() {
  const [subs, setSubs] = useState<Subcontractor[]>(SAMPLE_SUBS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tradeFilter, setTradeFilter] = useState('all');
  const [addDialog, setAddDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [form, setForm] = useState({ name: '', trade: 'Electrical', region: 'Central', contact: '', insurance_expiry: '', bonding_limit: '', notes: '' });

  const selected = subs.find(s => s.id === selectedId);
  const filtered = tradeFilter === 'all' ? subs : subs.filter(s => s.trade === tradeFilter);

  // Bid comparison for same-trade subs
  const tradeSubs = selected ? subs.filter(s => s.trade === selected.trade) : [];
  const comparisonData = selected ? tradeSubs.map(s => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + '…' : s.name,
    performance: s.performance_rating,
    quality: s.quality_rating,
    safety: s.safety_rating,
    schedule: s.schedule_rating,
  })) : [];

  const radarData = selected ? [
    { metric: 'Performance', value: selected.performance_rating },
    { metric: 'Quality', value: selected.quality_rating },
    { metric: 'Safety', value: selected.safety_rating },
    { metric: 'Schedule', value: selected.schedule_rating },
  ] : [];

  const exportCols = [
    { key: 'name', header: 'Name' }, { key: 'trade', header: 'Trade' }, { key: 'region', header: 'Region' },
    { key: 'performance_rating', header: 'Performance' }, { key: 'bonding_limit', header: 'Bonding Limit' },
    { key: 'insurance_expiry', header: 'Insurance Expiry' },
  ];

  const handleAdd = () => {
    setSubs(prev => [...prev, {
      id: crypto.randomUUID(), ...form, bonding_limit: Number(form.bonding_limit),
      performance_rating: 0, quality_rating: 0, safety_rating: 0, schedule_rating: 0,
      rates: [], historical_rates: [],
    }]);
    setAddDialog(false);
  };

  // Insurance expiry warnings
  const expiringInsurance = subs.filter(s => {
    const exp = new Date(s.insurance_expiry);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 90 && diff > 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Subcontractor Rate Cards</h3>
        <div className="flex gap-2">
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <ExportImportButtons data={subs} columns={exportCols} filename="SubcontractorRateCards" title="Subcontractors" />
          <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Subcontractor</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Subcontractors</p>
          <p className="text-2xl font-bold">{subs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Trades Covered</p>
          <p className="text-2xl font-bold">{new Set(subs.map(s => s.trade)).size}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Rating</p>
          <p className="text-2xl font-bold">{subs.length > 0 ? (subs.reduce((s, sub) => s + sub.performance_rating, 0) / subs.length).toFixed(1) : 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Bonding</p>
          <p className="text-2xl font-bold">{(subs.reduce((s, sub) => s + sub.bonding_limit, 0) / 1000000).toFixed(1)}M</p>
        </CardContent></Card>
        <Card className={expiringInsurance.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Expiring Insurance</p>
            <p className="text-2xl font-bold text-destructive">{expiringInsurance.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sub List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Subcontractors</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[550px] overflow-y-auto">
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelectedId(s.id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedId === s.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{s.name}</p>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold">{s.performance_rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{s.trade}</Badge>
                  <span className="text-[10px] text-muted-foreground">{s.region}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.rates.length} rates · Bonding: {(s.bonding_limit / 1000000).toFixed(1)}M</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {selected.name}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selected.trade}</Badge>
                    <Badge>{selected.region}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance Radar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-2">Performance Scorecard</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Details</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{selected.contact}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Insurance Expiry</span><span>{selected.insurance_expiry}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Bonding Limit</span><span>{selected.bonding_limit.toLocaleString()} SAR</span></div>
                      {['Performance', 'Quality', 'Safety', 'Schedule'].map(metric => {
                        const val = metric === 'Performance' ? selected.performance_rating : metric === 'Quality' ? selected.quality_rating : metric === 'Safety' ? selected.safety_rating : selected.schedule_rating;
                        return (
                          <div key={metric} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{metric}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={val * 20} className="h-1.5 w-16" />
                              <span className="font-bold text-xs w-6">{val}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selected.notes && <p className="text-xs text-muted-foreground italic mt-2">{selected.notes}</p>}
                  </div>
                </div>

                {/* Rate Card */}
                <div>
                  <p className="text-xs font-medium mb-2">Rate Card</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Description</TableHead><TableHead>Unit</TableHead><TableHead>List Rate</TableHead>
                      <TableHead>Negotiated</TableHead><TableHead>Discount</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {selected.rates.map((r, i) => {
                        const disc = r.rate > 0 ? ((r.rate - r.negotiated_rate) / r.rate * 100) : 0;
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.description}</TableCell>
                            <TableCell>{r.unit}</TableCell>
                            <TableCell className="text-muted-foreground">{r.rate.toLocaleString()}</TableCell>
                            <TableCell className="font-bold text-emerald-600">{r.negotiated_rate.toLocaleString()}</TableCell>
                            <TableCell><Badge className="bg-emerald-500/10 text-emerald-600">{disc.toFixed(1)}% off</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Rate Trend */}
                {selected.historical_rates.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Historical Rate Trend</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={selected.historical_rates}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="avg_rate" fill="hsl(var(--primary))" name="Avg Rate" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Same-Trade Comparison */}
                {tradeSubs.length > 1 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Trade Comparison ({selected.trade})</p>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Subcontractor</TableHead><TableHead>Performance</TableHead><TableHead>Quality</TableHead>
                        <TableHead>Safety</TableHead><TableHead>Schedule</TableHead><TableHead>Overall</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {tradeSubs.sort((a, b) => b.performance_rating - a.performance_rating).map(s => {
                          const overall = ((s.performance_rating + s.quality_rating + s.safety_rating + s.schedule_rating) / 4).toFixed(1);
                          return (
                            <TableRow key={s.id} className={s.id === selected.id ? 'bg-primary/5' : ''}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.performance_rating}</TableCell>
                              <TableCell>{s.quality_rating}</TableCell>
                              <TableCell>{s.safety_rating}</TableCell>
                              <TableCell>{s.schedule_rating}</TableCell>
                              <TableCell className="font-bold">{overall}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a subcontractor to view rate cards, performance ratings, and comparison
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Subcontractor */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subcontractor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Trade</Label>
                <Select value={form.trade} onValueChange={v => setForm(f => ({ ...f, trade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Region</Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Central', 'Western', 'Eastern', 'Northern', 'Southern'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Contact</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div><Label>Insurance Expiry</Label><Input type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} /></div>
            </div>
            <div><Label>Bonding Limit (SAR)</Label><Input type="number" value={form.bonding_limit} onChange={e => setForm(f => ({ ...f, bonding_limit: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAdd} disabled={!form.name}>Add Subcontractor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
