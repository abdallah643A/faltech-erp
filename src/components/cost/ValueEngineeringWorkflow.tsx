import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Lightbulb, Plus, CheckCircle, XCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { toast } from '@/hooks/use-toast';

interface VEProposal {
  id: string; title: string; description: string; category: string; status: string;
  originalCost: number; proposedCost: number; savings: number; savingsPct: number;
  functionalityImpact: string; lifecycleCostDiff: number;
  submittedBy: string; submittedDate: string; reviewedBy: string | null; reviewDate: string | null;
  implementedDate: string | null; actualSavings: number | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ValueEngineeringWorkflow() {
  const [proposals, setProposals] = useState<VEProposal[]>([
    { id: '1', title: 'Replace copper piping with PEX', description: 'Use PEX piping for non-critical water lines', category: 'Materials', status: 'approved', originalCost: 85000, proposedCost: 52000, savings: 33000, savingsPct: 38.8, functionalityImpact: 'Minimal - equivalent performance for residential', lifecycleCostDiff: -5000, submittedBy: 'Ahmad K.', submittedDate: '2026-02-15', reviewedBy: 'Mohammed S.', reviewDate: '2026-02-20', implementedDate: '2026-03-01', actualSavings: 31500 },
    { id: '2', title: 'Precast vs cast-in-place walls', description: 'Switch to precast for boundary walls', category: 'Structural', status: 'approved', originalCost: 120000, proposedCost: 95000, savings: 25000, savingsPct: 20.8, functionalityImpact: 'None - meets all structural requirements', lifecycleCostDiff: -2000, submittedBy: 'Khalid R.', submittedDate: '2026-01-20', reviewedBy: 'Omar A.', reviewDate: '2026-01-28', implementedDate: '2026-02-10', actualSavings: 24200 },
    { id: '3', title: 'LED lighting standardization', description: 'Replace specified fixtures with standardized LED panels', category: 'Electrical', status: 'pending_review', originalCost: 45000, proposedCost: 28000, savings: 17000, savingsPct: 37.8, functionalityImpact: 'Improved - better energy efficiency and lumens', lifecycleCostDiff: -15000, submittedBy: 'Faisal H.', submittedDate: '2026-03-10', reviewedBy: null, reviewDate: null, implementedDate: null, actualSavings: null },
    { id: '4', title: 'Aggregate substitution for non-structural concrete', description: 'Use recycled aggregate for landscaping concrete', category: 'Materials', status: 'rejected', originalCost: 30000, proposedCost: 22000, savings: 8000, savingsPct: 26.7, functionalityImpact: 'Reduced durability for decorative elements', lifecycleCostDiff: 5000, submittedBy: 'Nasser M.', submittedDate: '2026-02-05', reviewedBy: 'Omar A.', reviewDate: '2026-02-12', implementedDate: null, actualSavings: null },
    { id: '5', title: 'Modular HVAC units', description: 'Replace central chiller with modular packaged units', category: 'MEP', status: 'pending_review', originalCost: 200000, proposedCost: 165000, savings: 35000, savingsPct: 17.5, functionalityImpact: 'Equivalent cooling capacity, easier maintenance', lifecycleCostDiff: -8000, submittedBy: 'Ahmad K.', submittedDate: '2026-03-12', reviewedBy: null, reviewDate: null, implementedDate: null, actualSavings: null },
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Materials', originalCost: '', proposedCost: '', functionalityImpact: '' });

  const stats = useMemo(() => ({
    total: proposals.length,
    pending: proposals.filter(p => p.status === 'pending_review').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    totalSavings: proposals.filter(p => p.status === 'approved').reduce((s, p) => s + p.savings, 0),
    actualSavings: proposals.filter(p => p.actualSavings).reduce((s, p) => s + (p.actualSavings || 0), 0),
    avgROI: proposals.filter(p => p.status === 'approved').length > 0
      ? proposals.filter(p => p.status === 'approved').reduce((s, p) => s + p.savingsPct, 0) / proposals.filter(p => p.status === 'approved').length : 0,
  }), [proposals]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    proposals.filter(p => p.status === 'approved').forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.savings; });
    return Object.entries(cats).map(([name, value]) => ({ name, value: Math.round(value / 1000) }));
  }, [proposals]);

  const realizationData = useMemo(() => {
    return proposals.filter(p => p.status === 'approved').map(p => ({
      name: p.title.substring(0, 15), projected: Math.round(p.savings / 1000), actual: Math.round((p.actualSavings || 0) / 1000),
    }));
  }, [proposals]);

  const handleSubmit = () => {
    const orig = parseFloat(form.originalCost) || 0;
    const prop = parseFloat(form.proposedCost) || 0;
    const savings = orig - prop;
    const newP: VEProposal = {
      id: crypto.randomUUID(), title: form.title, description: form.description, category: form.category,
      status: 'pending_review', originalCost: orig, proposedCost: prop, savings, savingsPct: orig > 0 ? Math.round((savings / orig) * 1000) / 10 : 0,
      functionalityImpact: form.functionalityImpact, lifecycleCostDiff: 0,
      submittedBy: 'Current User', submittedDate: new Date().toISOString().split('T')[0],
      reviewedBy: null, reviewDate: null, implementedDate: null, actualSavings: null,
    };
    setProposals(prev => [newP, ...prev]);
    setShowDialog(false);
    setForm({ title: '', description: '', category: 'Materials', originalCost: '', proposedCost: '', functionalityImpact: '' });
    toast({ title: 'VE Proposal submitted' });
  };

  const updateStatus = (id: string, status: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status, reviewedBy: 'Current User', reviewDate: new Date().toISOString().split('T')[0] } : p));
    toast({ title: `Proposal ${status}` });
  };

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;
  const statusIcon = (s: string) => s === 'approved' ? <CheckCircle className="h-4 w-4 text-chart-2" /> : s === 'rejected' ? <XCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-chart-4" />;
  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' => s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Value Engineering</h2>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" />New VE Proposal</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Proposals</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pending Review</div>
          <div className="text-2xl font-bold text-chart-4">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Projected Savings</div>
          <div className="text-2xl font-bold text-chart-2">{fmt(stats.totalSavings)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Realized Savings</div>
          <div className="text-2xl font-bold text-primary">{fmt(stats.actualSavings)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg ROI</div>
          <div className="text-2xl font-bold text-foreground">{stats.avgROI.toFixed(1)}%</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings by Category */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Savings by Category ($K)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}K`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Realization Tracking */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Savings Realization ($K)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={realizationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="projected" name="Projected" fill="hsl(var(--primary))" barSize={16} radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-2))" barSize={16} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">VE Proposals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Proposed</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.submittedBy} · {p.submittedDate}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{fmt(p.originalCost)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(p.proposedCost)}</TableCell>
                  <TableCell className="font-mono text-xs text-chart-2 font-bold">{fmt(p.savings)} ({p.savingsPct}%)</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{p.functionalityImpact}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statusIcon(p.status)}
                      <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.status === 'pending_review' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-chart-2" onClick={() => updateStatus(p.id, 'approved')}>✓</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => updateStatus(p.id, 'rejected')}>✗</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Proposal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New VE Proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Replace copper with PEX" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Materials', 'Structural', 'Electrical', 'MEP', 'Finishing', 'Process'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Original Cost</Label><Input type="number" value={form.originalCost} onChange={e => setForm(p => ({ ...p, originalCost: e.target.value }))} /></div>
              <div><Label>Proposed Cost</Label><Input type="number" value={form.proposedCost} onChange={e => setForm(p => ({ ...p, proposedCost: e.target.value }))} /></div>
            </div>
            <div><Label>Functionality Impact</Label><Textarea value={form.functionalityImpact} onChange={e => setForm(p => ({ ...p, functionalityImpact: e.target.value }))} placeholder="Describe impact on quality/function" /></div>
          </div>
          <DialogFooter><Button onClick={handleSubmit} disabled={!form.title || !form.originalCost}>Submit Proposal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
