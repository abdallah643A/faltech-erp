import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line, ComposedChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, FileText, Plus, ArrowLeft } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface BudgetLine {
  id: string;
  category: string;
  subcategory: string;
  budget: number;
  actual: number;
  committed: number;
  forecast: number;
  notes: string;
  month: string;
}

const CATEGORIES = ['Labor', 'Materials', 'Equipment', 'Subcontractors', 'Overhead', 'Contingency'];

export function BudgetVarianceDashboard({ projects }: { projects: any[] }) {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ id: string; note: string } | null>(null);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ category: '', amount: '', reason: '', approver: '' });

  // Generate simulated budget data per category per month
  const budgetLines = useMemo<BudgetLine[]>(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lines: BudgetLine[] = [];
    const baseBudget = projects.reduce((s, p) => s + (p.budget || 100000), 0);

    CATEGORIES.forEach(cat => {
      const catPct = cat === 'Labor' ? 0.4 : cat === 'Materials' ? 0.25 : cat === 'Equipment' ? 0.1 : cat === 'Subcontractors' ? 0.12 : cat === 'Overhead' ? 0.08 : 0.05;
      months.forEach((m, i) => {
        const monthBudget = (baseBudget * catPct) / 12;
        const variance = (Math.random() - 0.45) * 0.3;
        const actual = i <= new Date().getMonth() ? monthBudget * (1 + variance) : 0;
        lines.push({
          id: `${cat}-${m}`,
          category: cat,
          subcategory: `${cat} - General`,
          budget: Math.round(monthBudget),
          actual: Math.round(actual),
          committed: Math.round(actual * 0.15),
          forecast: Math.round(monthBudget * (1 + variance * 0.5)),
          notes: '',
          month: m,
        });
      });
    });
    return lines;
  }, [projects]);

  // Aggregate by category
  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const items = budgetLines.filter(l => l.category === cat);
      const budget = items.reduce((s, l) => s + l.budget, 0);
      const actual = items.reduce((s, l) => s + l.actual, 0);
      const committed = items.reduce((s, l) => s + l.committed, 0);
      const forecast = items.reduce((s, l) => s + l.forecast, 0);
      const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
      const etc = forecast - actual;
      return { category: cat, budget, actual, committed, forecast, variance: Math.round(variance * 10) / 10, etc: Math.round(etc), status: variance > 5 ? 'over' : variance < -5 ? 'under' : 'on_track' };
    });
  }, [budgetLines]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(m => {
      const items = budgetLines.filter(l => l.month === m);
      return {
        month: m,
        budget: items.reduce((s, l) => s + l.budget, 0),
        actual: items.reduce((s, l) => s + l.actual, 0),
        forecast: items.reduce((s, l) => s + l.forecast, 0),
      };
    });
  }, [budgetLines]);

  const totalBudget = categoryData.reduce((s, c) => s + c.budget, 0);
  const totalActual = categoryData.reduce((s, c) => s + c.actual, 0);
  const totalForecast = categoryData.reduce((s, c) => s + c.forecast, 0);
  const overallVariance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget * 100) : 0;
  const etc = totalForecast - totalActual;
  const eac = totalActual + etc;

  const getStatusColor = (v: number) => v > 5 ? 'text-destructive' : v < -5 ? 'text-emerald-600' : 'text-foreground';
  const getStatusBadge = (s: string) => s === 'over' ? 'destructive' : s === 'under' ? 'default' : 'secondary';

  const exportColumns = [
    { key: 'category', header: 'Category' }, { key: 'budget', header: 'Budget' },
    { key: 'actual', header: 'Actual' }, { key: 'committed', header: 'Committed' },
    { key: 'forecast', header: 'Forecast' }, { key: 'variance', header: 'Variance %' },
  ];

  if (drillCategory) {
    const items = budgetLines.filter(l => l.category === drillCategory && l.actual > 0);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setDrillCategory(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Summary
        </Button>
        <h3 className="text-lg font-semibold">{drillCategory} — Monthly Breakdown</h3>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead>
              <TableHead>Variance</TableHead><TableHead>Variance %</TableHead><TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map(l => {
                const v = l.budget > 0 ? ((l.actual - l.budget) / l.budget * 100) : 0;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.month}</TableCell>
                    <TableCell>{l.budget.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">{l.actual.toLocaleString()}</TableCell>
                    <TableCell className={v > 0 ? 'text-destructive font-bold' : 'text-emerald-600 font-bold'}>{(l.actual - l.budget).toLocaleString()}</TableCell>
                    <TableCell className={getStatusColor(v)}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setNoteDialog({ id: l.id, note: l.notes })}>
                        <FileText className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Budget vs. Actual Variance</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdjustDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Budget Adjustment
          </Button>
          <ExportImportButtons data={categoryData} columns={exportColumns} filename="BudgetVariance" title="Budget Variance" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-xl font-bold">{(totalBudget / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Actual</p>
          <p className="text-xl font-bold">{(totalActual / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card className={overallVariance > 5 ? 'border-destructive/50' : overallVariance < -5 ? 'border-emerald-500/50' : ''}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className={`text-xl font-bold ${getStatusColor(overallVariance)}`}>
              {overallVariance > 0 ? '+' : ''}{overallVariance.toFixed(1)}%
              {overallVariance > 5 ? <TrendingUp className="h-4 w-4 inline ml-1" /> : overallVariance < -5 ? <TrendingDown className="h-4 w-4 inline ml-1" /> : null}
            </p>
          </CardContent>
        </Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">ETC</p>
          <p className="text-xl font-bold">{(etc / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">EAC</p>
          <p className="text-xl font-bold">{(eac / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Over Budget</p>
          <p className="text-xl font-bold text-destructive">{categoryData.filter(c => c.status === 'over').length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trend">Monthly Trend</TabsTrigger>
          <TabsTrigger value="details">Line Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Variance Chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Budget vs Actual by Category (K SAR)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} SAR`} />
                    <Legend />
                    <Bar dataKey="budget" fill="hsl(var(--muted-foreground))" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="forecast" fill="hsl(var(--chart-2))" name="Forecast" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Status */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Category Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {categoryData.map(c => {
                  const pct = c.budget > 0 ? Math.min((c.actual / c.budget) * 100, 150) : 0;
                  return (
                    <div key={c.category} className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors" onClick={() => setDrillCategory(c.category)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.category}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadge(c.status) as any}>{c.variance > 0 ? '+' : ''}{c.variance}%</Badge>
                          {c.status === 'over' && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        </div>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-2" />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Actual: {c.actual.toLocaleString()}</span>
                        <span>Budget: {c.budget.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Cost Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} SAR`} />
                  <Legend />
                  <Area dataKey="budget" fill="hsl(var(--muted-foreground) / 0.15)" stroke="hsl(var(--muted-foreground))" name="Budget" />
                  <Line dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} name="Actual" dot={{ r: 3 }} />
                  <Line dataKey="forecast" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" name="Forecast" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead>
                <TableHead>Committed</TableHead><TableHead>Forecast</TableHead><TableHead>Variance</TableHead>
                <TableHead>ETC</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {categoryData.map(c => (
                  <TableRow key={c.category} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrillCategory(c.category)}>
                    <TableCell className="font-medium">{c.category}</TableCell>
                    <TableCell>{c.budget.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">{c.actual.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{c.committed.toLocaleString()}</TableCell>
                    <TableCell>{c.forecast.toLocaleString()}</TableCell>
                    <TableCell className={`font-bold ${getStatusColor(c.variance)}`}>{c.variance > 0 ? '+' : ''}{c.variance}%</TableCell>
                    <TableCell>{c.etc.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={getStatusBadge(c.status) as any}>{c.status === 'over' ? 'Over Budget' : c.status === 'under' ? 'Under Budget' : 'On Track'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Budget Adjustment Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Budget Adjustment Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={adjustForm.category} onValueChange={v => setAdjustForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Adjustment Amount (SAR)</Label><Input type="number" value={adjustForm.amount} onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Reason</Label><Textarea value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} placeholder="Justification for budget adjustment..." /></div>
            <div><Label>Approver</Label><Input value={adjustForm.approver} onChange={e => setAdjustForm(f => ({ ...f, approver: e.target.value }))} placeholder="Manager name" /></div>
          </div>
          <DialogFooter><Button onClick={() => setAdjustDialog(false)}>Submit for Approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variance Note Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Variance Explanation</DialogTitle></DialogHeader>
          <Textarea placeholder="Enter explanation for this variance..." value={noteDialog?.note || ''} onChange={e => noteDialog && setNoteDialog({ ...noteDialog, note: e.target.value })} rows={4} />
          <DialogFooter><Button onClick={() => setNoteDialog(null)}>Save Note</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
