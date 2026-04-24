import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalApprovalTasks, PortalType } from '@/hooks/useUnifiedPortal';
import { Check, X, ArrowUp } from 'lucide-react';

const PORTAL_TYPES: (PortalType | 'all')[] = ['all', 'client', 'supplier', 'subcontractor'];

export default function PortalApprovalTasks() {
  const [filter, setFilter] = useState<PortalType | 'all'>('all');
  const { data: tasks = [], decide } = usePortalApprovalTasks(filter === 'all' ? undefined : filter);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Tasks</h1>
          <p className="text-sm text-muted-foreground">Cross-portal sign-offs awaiting decision.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{PORTAL_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Task</TableHead><TableHead>Portal</TableHead><TableHead>Priority</TableHead>
              <TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {tasks.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.task_title}</TableCell>
                  <TableCell><Badge variant="outline">{t.portal_type}</Badge></TableCell>
                  <TableCell><Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'}>{t.priority}</Badge></TableCell>
                  <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge>{t.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    {t.status === 'pending' && <>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: t.id, status: 'approved' })}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: t.id, status: 'rejected' })}><X className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: t.id, status: 'escalated' })}><ArrowUp className="h-4 w-4" /></Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No pending tasks</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
