import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Cog, Plus, Play, History, AlertTriangle, CheckCircle } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { toast } from '@/hooks/use-toast';

interface AllocationRule {
  id: string; name: string; method: string; sourcePool: string;
  targets: { name: string; pct: number }[];
  isActive: boolean; lastRun: string | null; schedule: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CostAllocationAutomation({ projects }: { projects: any[] }) {
  const [rules, setRules] = useState<AllocationRule[]>([
    {
      id: '1', name: 'IT Overhead Allocation', method: 'headcount', sourcePool: 'IT Department',
      targets: [{ name: 'Project A', pct: 40 }, { name: 'Project B', pct: 35 }, { name: 'Project C', pct: 25 }],
      isActive: true, lastRun: '2026-03-15T10:00:00', schedule: 'monthly',
    },
    {
      id: '2', name: 'Shared Equipment Pool', method: 'usage_hours', sourcePool: 'Equipment Pool',
      targets: [{ name: 'Site Alpha', pct: 55 }, { name: 'Site Beta', pct: 30 }, { name: 'Site Gamma', pct: 15 }],
      isActive: true, lastRun: '2026-03-10T08:00:00', schedule: 'weekly',
    },
    {
      id: '3', name: 'Admin Overhead', method: 'revenue_pct', sourcePool: 'Administration',
      targets: [{ name: 'Division 1', pct: 60 }, { name: 'Division 2', pct: 40 }],
      isActive: false, lastRun: null, schedule: 'monthly',
    },
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [editRule, setEditRule] = useState<AllocationRule | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Audit trail
  const auditLog = useMemo(() => [
    { date: '2026-03-15 10:00', rule: 'IT Overhead Allocation', action: 'Auto-run', amount: 45000, status: 'Completed', user: 'System' },
    { date: '2026-03-15 10:01', rule: 'IT Overhead Allocation', action: 'JE Generated', amount: 45000, status: 'Posted', user: 'System' },
    { date: '2026-03-10 08:00', rule: 'Shared Equipment Pool', action: 'Auto-run', amount: 28000, status: 'Completed', user: 'System' },
    { date: '2026-03-05 14:30', rule: 'Admin Overhead', action: 'Manual Override', amount: 12000, status: 'Approved', user: 'Ahmed K.' },
    { date: '2026-03-01 09:00', rule: 'IT Overhead Allocation', action: 'Auto-run', amount: 43500, status: 'Completed', user: 'System' },
  ], []);

  // Summary data
  const allocationSummary = useMemo(() => {
    return rules.filter(r => r.isActive).flatMap(r =>
      r.targets.map(t => ({ pool: r.sourcePool, target: t.name, pct: t.pct, method: r.method }))
    );
  }, [rules]);

  const poolData = useMemo(() => {
    const pools: Record<string, number> = {};
    rules.forEach(r => { pools[r.sourcePool] = (pools[r.sourcePool] || 0) + 1; });
    return Object.entries(pools).map(([name, count]) => ({ name, value: count }));
  }, [rules]);

  const runRule = (rule: AllocationRule) => {
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, lastRun: new Date().toISOString() } : r));
    toast({ title: 'Allocation executed', description: `${rule.name} processed successfully. Journal entries generated.` });
  };

  const methodLabel = (m: string) => {
    const map: Record<string, string> = { headcount: 'Headcount %', revenue_pct: 'Revenue %', sqft: 'Sq. Footage', usage_hours: 'Usage Hours', fixed: 'Fixed Amount' };
    return map[m] || m;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cog className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Cost Allocation Automation</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAudit(true)}>
            <History className="h-4 w-4 mr-1" />Audit Trail
          </Button>
          <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" />New Rule
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Rules</div>
          <div className="text-2xl font-bold text-foreground">{rules.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Active Rules</div>
          <div className="text-2xl font-bold text-chart-2">{rules.filter(r => r.isActive).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Cost Pools</div>
          <div className="text-2xl font-bold text-primary">{poolData.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Last Batch</div>
          <div className="text-lg font-bold text-foreground">Mar 15</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rules List */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3"><CardTitle className="text-sm">Allocation Rules</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Source Pool</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{methodLabel(r.method)}</Badge></TableCell>
                    <TableCell className="text-sm">{r.sourcePool}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.targets.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{t.name}: {t.pct}%</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{r.schedule}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => runRule(r)} disabled={!r.isActive}>
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                          setRules(prev => prev.map(ru => ru.id === r.id ? { ...ru, isActive: !ru.isActive } : ru));
                        }}>
                          {r.isActive ? '⏸' : '▶'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pool Distribution */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Cost Pool Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={poolData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {poolData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>

            {/* Allocation Summary */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Active Allocations</div>
              {allocationSummary.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                  <span className="text-foreground">{a.pool} → {a.target}</span>
                  <Badge variant="outline">{a.pct}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Report */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Allocation Variance Report</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rules.filter(r => r.isActive).flatMap(r => r.targets.map(t => ({ rule: r.name, target: t.name, planned: t.pct, actual: t.pct + (Math.random() * 6 - 3) })))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="target" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="planned" name="Planned %" fill="hsl(var(--primary))" barSize={16} radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual %" fill="hsl(var(--chart-4))" barSize={16} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Audit Trail Dialog */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Allocation Audit Trail</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-mono">{a.date}</TableCell>
                  <TableCell className="text-sm">{a.rule}</TableCell>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="font-mono">{(a.amount / 1000).toFixed(1)}K</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'Completed' || a.status === 'Posted' ? 'default' : 'secondary'}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{a.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
