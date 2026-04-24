import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWmsTasks } from '@/hooks/useWarehouseExecution';
import { ClipboardList, Play, CheckCircle2, Search, User, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PickingQueue() {
  const { t } = useLanguage();
  const { data: tasks, updateTask } = useWmsTasks('pick');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = (tasks || []).filter((t: any) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.reference_number || '').toLowerCase().includes(s) || (t.item_code || '').toLowerCase().includes(s) || (t.item_description || '').toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    pending: tasks?.filter((t: any) => t.status === 'pending').length || 0,
    assigned: tasks?.filter((t: any) => t.status === 'assigned').length || 0,
    inProgress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
    completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
  };

  const startPick = async (task: any) => {
    await updateTask.mutateAsync({ id: task.id, status: 'in_progress', started_at: new Date().toISOString() });
  };

  const completePick = async (task: any) => {
    await updateTask.mutateAsync({ id: task.id, status: 'completed', completed_at: new Date().toISOString(), actual_qty: task.expected_qty });
  };

  const priorityColor = (p: string) => p === 'urgent' ? 'destructive' : p === 'high' ? 'default' : 'secondary';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Picking Queue</h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold text-blue-500">{stats.pending}</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-purple-500">{stats.assigned}</div><div className="text-xs text-muted-foreground">Assigned</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-orange-500">{stats.inProgress}</div><div className="text-xs text-muted-foreground">In Progress</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-green-500">{stats.completed}</div><div className="text-xs text-muted-foreground">Completed</div></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search picks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task: any) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.reference_number || '—'}</TableCell>
                  <TableCell>
                    <div className="text-sm">{task.item_code}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{task.item_description}</div>
                  </TableCell>
                  <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.source_bin || '—'}</div></TableCell>
                  <TableCell className="text-center font-bold">{task.expected_qty} {task.uom}</TableCell>
                  <TableCell><Badge variant={priorityColor(task.priority)}>{task.priority}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-1 text-sm">{task.assigned_to_name ? <><User className="h-3 w-3" />{task.assigned_to_name}</> : <span className="text-muted-foreground">Unassigned</span>}</div></TableCell>
                  <TableCell><Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>{task.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {task.status === 'pending' && <Button size="sm" variant="outline" onClick={() => startPick(task)}><Play className="h-3 w-3 mr-1" />Start</Button>}
                    {task.status === 'in_progress' && <Button size="sm" onClick={() => completePick(task)}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pick tasks found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
