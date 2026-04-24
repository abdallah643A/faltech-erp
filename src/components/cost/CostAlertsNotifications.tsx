import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bell, AlertTriangle, CheckCircle, XCircle, Settings, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CostAlert {
  id: string; type: string; title: string; message: string;
  severity: 'critical' | 'warning' | 'info';
  project: string; category: string; value: number; threshold: number;
  createdAt: string; acknowledged: boolean; acknowledgedBy: string | null;
  escalated: boolean;
}

interface AlertRule {
  id: string; name: string; type: string; threshold: number; unit: string;
  severity: 'critical' | 'warning' | 'info'; isActive: boolean; escalateAfterMin: number;
  notifyRoles: string[];
}

export function CostAlertsNotifications({ projects }: { projects: any[] }) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const [rules, setRules] = useState<AlertRule[]>([
    { id: '1', name: 'Budget Overrun', type: 'budget_threshold', threshold: 90, unit: '%', severity: 'warning', isActive: true, escalateAfterMin: 60, notifyRoles: ['PM', 'Finance'] },
    { id: '2', name: 'Critical Overrun', type: 'budget_threshold', threshold: 100, unit: '%', severity: 'critical', isActive: true, escalateAfterMin: 30, notifyRoles: ['PM', 'Finance', 'Director'] },
    { id: '3', name: 'Cost Variance', type: 'variance', threshold: 10, unit: '%', severity: 'warning', isActive: true, escalateAfterMin: 120, notifyRoles: ['PM'] },
    { id: '4', name: 'Low Margin', type: 'margin', threshold: 5, unit: '%', severity: 'critical', isActive: true, escalateAfterMin: 30, notifyRoles: ['PM', 'Finance', 'Director'] },
    { id: '5', name: 'Supplier Price Increase', type: 'supplier_price', threshold: 15, unit: '%', severity: 'warning', isActive: true, escalateAfterMin: 120, notifyRoles: ['Procurement'] },
    { id: '6', name: 'Resource Cost Overrun', type: 'resource_cost', threshold: 20, unit: '%', severity: 'warning', isActive: false, escalateAfterMin: 180, notifyRoles: ['PM'] },
  ]);

  const [alerts, setAlerts] = useState<CostAlert[]>(() => {
    const generated: CostAlert[] = [];
    projects.forEach(p => {
      const budget = p.budget || 100000;
      const actual = p.actual_cost || budget * (0.7 + Math.random() * 0.4);
      const pctUsed = (actual / budget) * 100;
      const name = p.name || 'Unnamed';

      if (pctUsed > 100) {
        generated.push({
          id: `crit-${p.id}`, type: 'budget_threshold', title: 'Budget Exceeded',
          message: `${name} has exceeded budget by ${(pctUsed - 100).toFixed(1)}%. Actual: ${Math.round(actual).toLocaleString()} vs Budget: ${budget.toLocaleString()}`,
          severity: 'critical', project: name, category: 'Budget', value: pctUsed, threshold: 100,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(), acknowledged: false, acknowledgedBy: null, escalated: pctUsed > 110,
        });
      } else if (pctUsed > 90) {
        generated.push({
          id: `warn-${p.id}`, type: 'budget_threshold', title: 'Budget Warning',
          message: `${name} has consumed ${pctUsed.toFixed(1)}% of budget. ${Math.round(budget - actual).toLocaleString()} remaining.`,
          severity: 'warning', project: name, category: 'Budget', value: pctUsed, threshold: 90,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 5).toISOString(), acknowledged: false, acknowledgedBy: null, escalated: false,
        });
      }
      const margin = ((budget * 1.15 - actual) / (budget * 1.15)) * 100;
      if (margin < 5) {
        generated.push({
          id: `margin-${p.id}`, type: 'margin', title: 'Low Margin Alert',
          message: `${name} margin is ${margin.toFixed(1)}%, below 5% threshold.`,
          severity: 'critical', project: name, category: 'Margin', value: margin, threshold: 5,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(), acknowledged: false, acknowledgedBy: null, escalated: true,
        });
      }
    });
    // Add some static alerts
    generated.push({
      id: 'supplier-1', type: 'supplier_price', title: 'Steel Price Surge',
      message: 'Rebar prices increased 18% from Gulf Steel Industries, exceeding 15% threshold.',
      severity: 'warning', project: 'Portfolio-wide', category: 'Materials', value: 18, threshold: 15,
      createdAt: new Date(Date.now() - 86400000).toISOString(), acknowledged: false, acknowledgedBy: null, escalated: false,
    });
    generated.push({
      id: 'resource-1', type: 'resource_cost', title: 'Overtime Cost Spike',
      message: 'Weekly overtime costs up 25% across 3 projects. Review labor scheduling.',
      severity: 'info', project: 'Multiple', category: 'Labor', value: 25, threshold: 20,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), acknowledged: true, acknowledgedBy: 'Ahmed K.', escalated: false,
    });
    return generated.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return sev[a.severity] - sev[b.severity] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false;
    if (!showAcknowledged && a.acknowledged) return false;
    return true;
  });

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length,
    info: alerts.filter(a => a.severity === 'info' && !a.acknowledged).length,
    escalated: alerts.filter(a => a.escalated && !a.acknowledged).length,
    total: alerts.filter(a => !a.acknowledged).length,
  }), [alerts]);

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, acknowledgedBy: 'Current User' } : a));
    toast({ title: 'Alert acknowledged' });
  };

  const acknowledgeAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true, acknowledgedBy: 'Current User' })));
    toast({ title: 'All alerts acknowledged' });
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const sevColor = (s: string) => s === 'critical' ? 'text-destructive' : s === 'warning' ? 'text-chart-4' : 'text-muted-foreground';
  const sevBg = (s: string) => s === 'critical' ? 'border-destructive/30 bg-destructive/5' : s === 'warning' ? 'border-chart-4/30 bg-chart-4/5' : 'border-border';
  const sevVariant = (s: string): 'default' | 'secondary' | 'destructive' => s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'default';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Cost Alerts & Notifications</h2>
          {stats.critical > 0 && <Badge variant="destructive" className="animate-pulse">{stats.critical} Critical</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}><Settings className="h-4 w-4 mr-1" />Rules</Button>
          <Button size="sm" variant="outline" onClick={acknowledgeAll} disabled={stats.total === 0}>Acknowledge All</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 cursor-pointer hover:ring-1 ring-primary" onClick={() => setFilter('all')}>
          <div className="text-xs text-muted-foreground">Active Alerts</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 ring-destructive" onClick={() => setFilter('critical')}>
          <div className="text-xs text-muted-foreground">Critical</div>
          <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 ring-chart-4" onClick={() => setFilter('warning')}>
          <div className="text-xs text-muted-foreground">Warnings</div>
          <div className="text-2xl font-bold text-chart-4">{stats.warning}</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-1 ring-primary" onClick={() => setFilter('info')}>
          <div className="text-xs text-muted-foreground">Info</div>
          <div className="text-2xl font-bold text-primary">{stats.info}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Escalated</div>
          <div className="text-2xl font-bold text-destructive">{stats.escalated}</div>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={showAcknowledged} onCheckedChange={setShowAcknowledged} />
          <Label className="text-xs">Show acknowledged</Label>
        </div>
        <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('all')}>All</Badge>
        <Badge variant={filter === 'critical' ? 'destructive' : 'outline'} className="cursor-pointer" onClick={() => setFilter('critical')}>Critical</Badge>
        <Badge variant={filter === 'warning' ? 'secondary' : 'outline'} className="cursor-pointer" onClick={() => setFilter('warning')}>Warning</Badge>
        <Badge variant={filter === 'info' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('info')}>Info</Badge>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.map(a => (
          <Card key={a.id} className={`p-4 border ${sevBg(a.severity)} ${a.acknowledged ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {a.severity === 'critical' ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
                 a.severity === 'warning' ? <AlertTriangle className="h-5 w-5 text-chart-4" /> :
                 <Bell className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{a.title}</span>
                  <Badge variant={sevVariant(a.severity)}>{a.severity}</Badge>
                  {a.escalated && <Badge variant="destructive" className="text-xs">Escalated</Badge>}
                  {a.acknowledged && <Badge variant="outline" className="text-xs">✓ {a.acknowledgedBy}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Project: {a.project}</span>
                  <span>Category: {a.category}</span>
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {!a.acknowledged && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledge(a.id)}>
                  <CheckCircle className="h-3 w-3 mr-1" />Ack
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-chart-2" />
            No active alerts
          </Card>
        )}
      </div>

      {/* Alert Rules Settings */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Alert Rules Configuration</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Notify</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="font-mono">{r.threshold}{r.unit}</TableCell>
                  <TableCell><Badge variant={sevVariant(r.severity)}>{r.severity}</Badge></TableCell>
                  <TableCell className="text-xs">{r.escalateAfterMin}min</TableCell>
                  <TableCell className="text-xs">{r.notifyRoles.join(', ')}</TableCell>
                  <TableCell><Switch checked={r.isActive} onCheckedChange={() => toggleRule(r.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
