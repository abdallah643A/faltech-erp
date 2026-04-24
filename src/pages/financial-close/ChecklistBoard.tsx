import { useState, useMemo } from 'react';
import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Play, CheckCircle2, AlertTriangle, Pause, SkipForward } from 'lucide-react';

const columns = [
  { key: 'pending', label: 'To Do', icon: Pause, color: 'bg-muted' },
  { key: 'in_progress', label: 'In Progress', icon: Play, color: 'bg-blue-50' },
  { key: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'bg-red-50' },
  { key: 'review', label: 'Review', icon: SkipForward, color: 'bg-amber-50' },
  { key: 'completed', label: 'Done', icon: CheckCircle2, color: 'bg-green-50' },
];

export default function ChecklistBoard() {
  const { periods, useCloseTasks, updateTaskStatus } = useFinancialClose();
  const activePeriods = periods.filter(p => p.status !== 'completed');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(activePeriods[0]?.id || '');
  const { data: tasks = [] } = useCloseTasks(selectedPeriod || null);
  const [blockerDialog, setBlockerDialog] = useState<string | null>(null);
  const [blockerReason, setBlockerReason] = useState('');

  const tasksByStatus = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    columns.forEach(c => { map[c.key] = tasks.filter(t => t.status === c.key); });
    return map;
  }, [tasks]);

  const handleStatusChange = (taskId: string, status: string) => {
    if (status === 'blocked') {
      setBlockerDialog(taskId);
      return;
    }
    updateTaskStatus.mutate({ id: taskId, status });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklist Board</h1>
          <p className="text-muted-foreground">Kanban view of close tasks</p>
        </div>
        {activePeriods.length > 0 && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select period" /></SelectTrigger>
            <SelectContent>
              {activePeriods.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.period_label || `${p.period_type.replace('_', ' ')} ${p.fiscal_year} P${p.period_number}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedPeriod && <Card><CardContent className="py-12 text-center text-muted-foreground">Select an active close period to view tasks</CardContent></Card>}

      {selectedPeriod && (
        <div className="grid grid-cols-5 gap-3 min-h-[500px]">
          {columns.map(col => (
            <div key={col.key} className={`rounded-lg p-3 ${col.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <col.icon className="h-4 w-4" />
                <span className="font-semibold text-sm">{col.label}</span>
                <Badge variant="outline" className="ml-auto">{tasksByStatus[col.key]?.length || 0}</Badge>
              </div>
              <div className="space-y-2">
                {tasksByStatus[col.key]?.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium leading-tight">{task.task_name}</p>
                        <Badge variant={priorityColor(task.priority)} className="text-[10px] ml-1 shrink-0">{task.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{task.function_area}</Badge>
                        {task.owner_name && <span className="text-[10px] text-muted-foreground">• {task.owner_name}</span>}
                      </div>
                      {task.blocker_reason && <p className="text-xs text-red-600">⚠ {task.blocker_reason}</p>}
                      <div className="flex gap-1 flex-wrap">
                        {col.key === 'pending' && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleStatusChange(task.id, 'in_progress')}>Start</Button>}
                        {col.key === 'in_progress' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleStatusChange(task.id, 'review')}>Review</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600" onClick={() => handleStatusChange(task.id, 'blocked')}>Block</Button>
                          </>
                        )}
                        {col.key === 'blocked' && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleStatusChange(task.id, 'in_progress')}>Unblock</Button>}
                        {col.key === 'review' && <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600" onClick={() => handleStatusChange(task.id, 'completed')}>Complete</Button>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!blockerDialog} onOpenChange={() => setBlockerDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Blocker Reason</Label><Textarea value={blockerReason} onChange={e => setBlockerReason(e.target.value)} placeholder="Describe what's blocking this task..." /></div>
            <Button className="w-full" onClick={() => {
              if (blockerDialog) updateTaskStatus.mutate({ id: blockerDialog, status: 'blocked', blocker_reason: blockerReason });
              setBlockerDialog(null);
              setBlockerReason('');
            }}>Confirm Block</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
