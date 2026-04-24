import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, LogOut } from 'lucide-react';
import { useOffboardingChecklists } from '@/hooks/useHREnhanced';

export default function OffboardingPage() {
  const { data: checklists = [], create, completeTask } = useOffboardingChecklists();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ separation_type: 'resignation', notice_date: new Date().toISOString().slice(0, 10), last_working_date: '' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LogOut className="h-6 w-6 text-primary" />Offboarding</h1>
          <p className="text-muted-foreground">Exit interview, asset return, EOSB & GOSI termination</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Offboarding</Button>
      </div>

      <div className="space-y-3">
        {checklists.map((c: any) => {
          const tasks = (c.hr_offboarding_tasks || []).sort((a: any, b: any) => a.task_order - b.task_order);
          const done = tasks.filter((t: any) => t.completed).length;
          return (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{c.checklist_number} <Badge variant="outline" className="ml-2">{c.separation_type}</Badge></div>
                    <div className="text-xs text-muted-foreground">Notice: {c.notice_date} → Last day: {c.last_working_date}</div>
                  </div>
                  <Badge>{done}/{tasks.length} tasks</Badge>
                </div>
                <div className="space-y-1">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 py-1 border-b">
                      <Checkbox checked={t.completed} onCheckedChange={(v) => completeTask.mutate({ id: t.id, completed: !!v })} />
                      <div className="flex-1">
                        <span className={t.completed ? 'line-through text-muted-foreground text-sm' : 'text-sm'}>{t.task_name}</span>
                        <span className="text-xs text-muted-foreground ml-2" dir="rtl">{t.task_name_ar}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{t.responsible_role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {checklists.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No offboarding records</CardContent></Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Offboarding</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Separation Type</Label>
              <Select value={draft.separation_type} onValueChange={(v) => setDraft({ ...draft, separation_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['resignation', 'termination', 'retirement', 'end_of_contract', 'mutual_consent', 'death'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notice Date</Label><Input type="date" value={draft.notice_date} onChange={(e) => setDraft({ ...draft, notice_date: e.target.value })} /></div>
            <div><Label>Last Working Date</Label><Input type="date" value={draft.last_working_date} onChange={(e) => setDraft({ ...draft, last_working_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Reason</Label><Input value={draft.reason || ''} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await create.mutateAsync(draft); setOpen(false); }} disabled={!draft.last_working_date}>Initiate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
