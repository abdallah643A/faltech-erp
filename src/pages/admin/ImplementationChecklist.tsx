import { useState, useMemo } from 'react';
import { ListChecks, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanies } from '@/hooks/useGroupStructure';
import { useChecklist, useUpsertChecklistItem, ChecklistItem } from '@/hooks/useAdminSetup';

const PHASES = ['Discovery', 'Configuration', 'Data Migration', 'Testing', 'Training', 'Go-Live'];

const STATUS_META: Record<ChecklistItem['status'], string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/10 text-info',
  done: 'bg-success/10 text-success',
  blocked: 'bg-destructive/10 text-destructive',
};

export default function ImplementationChecklist() {
  const { data: companies = [] } = useCompanies();
  const [companyId, setCompanyId] = useState<string>('');
  const effective = companyId || companies[0]?.id || '';
  const { data: items = [], isLoading } = useChecklist(effective);
  const upsert = useUpsertChecklistItem();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ChecklistItem>>({ phase: 'Discovery', task: '', status: 'todo', blocks_go_live: false });

  const grouped = useMemo(() => {
    const g: Record<string, ChecklistItem[]> = {};
    PHASES.forEach(p => { g[p] = []; });
    items.forEach(i => {
      g[i.phase] = g[i.phase] || [];
      g[i.phase].push(i);
    });
    return g;
  }, [items]);

  const goLiveBlockers = items.filter(i => i.blocks_go_live && i.status !== 'done').length;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Implementation Checklist
          </h1>
          <p className="text-sm text-muted-foreground">Track go-live readiness across phases per company.</p>
        </div>
        {goLiveBlockers > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {goLiveBlockers} go-live blocker{goLiveBlockers > 1 ? 's' : ''}
          </Badge>
        )}
      </header>

      <div className="flex items-center gap-3">
        <Select value={effective} onValueChange={setCompanyId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select company" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Implementation Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={draft.phase} onValueChange={(v) => setDraft({ ...draft, phase: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Task title" value={draft.task} onChange={e => setDraft({ ...draft, task: e.target.value })} />
              <Input placeholder="Owner name" value={draft.owner_name || ''} onChange={e => setDraft({ ...draft, owner_name: e.target.value })} />
              <Input type="date" value={draft.due_date || ''} onChange={e => setDraft({ ...draft, due_date: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.blocks_go_live} onCheckedChange={(v) => setDraft({ ...draft, blocks_go_live: !!v })} />
                Blocks go-live
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!draft.task} onClick={() => {
                upsert.mutate({ ...draft, company_id: effective } as any);
                setOpen(false);
                setDraft({ phase: 'Discovery', task: '', status: 'todo', blocks_go_live: false });
              }}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-4">
          {PHASES.map(phase => (
            <section key={phase} className="enterprise-card">
              <div className="enterprise-card-header flex items-center justify-between">
                <h3 className="font-semibold">{phase}</h3>
                <Badge variant="outline">{grouped[phase]?.length || 0}</Badge>
              </div>
              {(!grouped[phase] || grouped[phase].length === 0) ? (
                <p className="p-4 text-sm text-muted-foreground text-center">No tasks</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Blocker</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[phase].map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.task}</TableCell>
                        <TableCell className="text-sm">{item.owner_name || '—'}</TableCell>
                        <TableCell className="text-sm">{item.due_date || '—'}</TableCell>
                        <TableCell>
                          <Select value={item.status} onValueChange={(v) => upsert.mutate({ ...item, status: v as any })}>
                            <SelectTrigger className={`h-7 w-32 ${STATUS_META[item.status]}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.blocks_go_live && <Badge variant="destructive" className="text-[10px]">Go-Live</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
