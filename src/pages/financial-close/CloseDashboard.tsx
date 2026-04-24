import { useState } from 'react';
import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, AlertTriangle, CheckCircle2, Clock, ShieldAlert, BarChart3 } from 'lucide-react';

const statusColor = (s: string) => {
  switch (s) {
    case 'completed': return 'default' as const;
    case 'in_progress': return 'secondary' as const;
    case 'review': return 'outline' as const;
    default: return 'outline' as const;
  }
};

const ragColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
};

export default function CloseDashboard() {
  const { periods, periodsLoading, createPeriod, initializePeriodTasks, detectExceptions, allExceptions, updateReadiness } = useFinancialClose();
  const [showCreate, setShowCreate] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_type: 'month_end', fiscal_year: new Date().getFullYear(), period_number: new Date().getMonth() + 1, target_close_date: '' });

  const activePeriods = periods.filter(p => p.status !== 'completed');
  const recentCompleted = periods.filter(p => p.status === 'completed').slice(0, 5);
  const openExceptions = allExceptions.filter(e => e.status === 'open');

  const handleCreate = async () => {
    await createPeriod.mutateAsync(newPeriod);
    const latest = periods[0]; // will be refreshed
    setShowCreate(false);
  };

  const handleInitAndDetect = async (periodId: string) => {
    await initializePeriodTasks.mutateAsync(periodId);
    await detectExceptions.mutateAsync(periodId);
    await updateReadiness.mutateAsync(periodId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Close Manager</h1>
          <p className="text-muted-foreground">Manage month-end, quarter-end, and year-end close processes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Close Period</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Play className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Closes</p>
                <p className="text-2xl font-bold">{activePeriods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Open Exceptions</p>
                <p className="text-2xl font-bold">{openExceptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Completed This Year</p>
                <p className="text-2xl font-bold">{recentCompleted.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Readiness</p>
                <p className="text-2xl font-bold">{activePeriods.length ? Math.round(activePeriods.reduce((s, p) => s + (p.readiness_score || 0), 0) / activePeriods.length) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Close Periods */}
      <Card>
        <CardHeader><CardTitle>Active Close Periods</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {activePeriods.length === 0 && <p className="text-center text-muted-foreground py-8">No active close periods. Create one to get started.</p>}
          {activePeriods.map(p => (
            <div key={p.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${ragColor(p.readiness_score || 0)}`}>
                    {p.readiness_score || 0}%
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.period_label || `${p.period_type.replace('_', ' ')} - ${p.fiscal_year} P${p.period_number}`}</h3>
                    <p className="text-sm text-muted-foreground">{p.completed_tasks}/{p.total_tasks} tasks • {p.exception_count} exceptions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  {p.total_tasks === 0 && (
                    <Button size="sm" variant="outline" onClick={() => handleInitAndDetect(p.id)} disabled={initializePeriodTasks.isPending}>
                      <Play className="h-3 w-3 mr-1" />Initialize
                    </Button>
                  )}
                </div>
              </div>
              <Progress value={p.readiness_score || 0} className="h-2" />
              {p.target_close_date && <p className="text-xs text-muted-foreground">Target: {new Date(p.target_close_date).toLocaleDateString()}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Exceptions */}
      {openExceptions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-500" />Open Exceptions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openExceptions.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={e.severity === 'critical' ? 'destructive' : e.severity === 'high' ? 'destructive' : 'secondary'}>{e.severity}</Badge>
                    <div>
                      <p className="font-medium text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.exception_type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{e.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Close Period</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period Type</Label>
              <Select value={newPeriod.period_type} onValueChange={v => setNewPeriod(p => ({ ...p, period_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month_end">Month End</SelectItem>
                  <SelectItem value="quarter_end">Quarter End</SelectItem>
                  <SelectItem value="year_end">Year End</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fiscal Year</Label><Input type="number" value={newPeriod.fiscal_year} onChange={e => setNewPeriod(p => ({ ...p, fiscal_year: +e.target.value }))} /></div>
              <div><Label>Period Number</Label><Input type="number" min={1} max={12} value={newPeriod.period_number} onChange={e => setNewPeriod(p => ({ ...p, period_number: +e.target.value }))} /></div>
            </div>
            <div><Label>Target Close Date</Label><Input type="date" value={newPeriod.target_close_date} onChange={e => setNewPeriod(p => ({ ...p, target_close_date: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleCreate} disabled={createPeriod.isPending}>Create Period</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
