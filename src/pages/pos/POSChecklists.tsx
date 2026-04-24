import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Plus, Play, CheckCircle2, ListChecks, Trash2 } from 'lucide-react';
import { usePOSChecklists } from '@/hooks/usePOSChecklists';
import { format } from 'date-fns';

export default function POSChecklists() {
  const { templates, runs, createTemplate, startRun, updateRunItem, completeRun } = usePOSChecklists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shiftType, setShiftType] = useState<'opening' | 'closing'>('opening');
  const [desc, setDesc] = useState('');
  const [items, setItems] = useState<Array<{ title: string; is_required: boolean; requires_photo: boolean; requires_count: boolean }>>([
    { title: 'Verify cash drawer count', is_required: true, requires_photo: false, requires_count: true },
  ]);

  const submit = async () => {
    if (!name.trim()) return;
    await createTemplate.mutateAsync({ template_name: name, shift_type: shiftType, description: desc, items: items.filter(i => i.title.trim()) });
    setOpen(false); setName(''); setDesc(''); setItems([{ title: '', is_required: true, requires_photo: false, requires_count: false }]);
  };

  const activeRuns = (runs || []).filter((r: any) => r.status === 'in_progress');
  const recentRuns = (runs || []).filter((r: any) => r.status !== 'in_progress').slice(0, 20);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="h-7 w-7 text-primary" />Store Open/Close Checklists</h1>
          <p className="text-muted-foreground">Standardize daily opening and closing procedures across branches.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Template</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Checklist Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Template Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Opening" /></div>
                <div><Label>Shift Type</Label>
                  <Select value={shiftType} onValueChange={(v: any) => setShiftType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="opening">Opening</SelectItem><SelectItem value="closing">Closing</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Tasks</Label>
                  <Button size="sm" variant="outline" onClick={() => setItems([...items, { title: '', is_required: true, requires_photo: false, requires_count: false }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 border rounded p-2">
                    <Input className="flex-1" placeholder="Task title" value={it.title} onChange={e => { const c = [...items]; c[idx].title = e.target.value; setItems(c); }} />
                    <label className="flex items-center gap-1 text-xs"><Checkbox checked={it.is_required} onCheckedChange={v => { const c = [...items]; c[idx].is_required = !!v; setItems(c); }} />Req</label>
                    <label className="flex items-center gap-1 text-xs"><Checkbox checked={it.requires_photo} onCheckedChange={v => { const c = [...items]; c[idx].requires_photo = !!v; setItems(c); }} />Photo</label>
                    <label className="flex items-center gap-1 text-xs"><Checkbox checked={it.requires_count} onCheckedChange={v => { const c = [...items]; c[idx].requires_count = !!v; setItems(c); }} />Count</label>
                    <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={createTemplate.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Runs ({activeRuns.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeRuns.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No active checklists. Start one from a template.</CardContent></Card>}
          {activeRuns.map((run: any) => (
            <Card key={run.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" />{run.shift_type === 'opening' ? 'Opening' : 'Closing'} — {run.cashier_name || 'Cashier'}</CardTitle>
                  <Button size="sm" onClick={() => completeRun.mutate(run.id)}><CheckCircle2 className="h-4 w-4 mr-1" />Complete</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(run.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => (
                  <div key={it.id} className="flex items-center gap-3 border rounded p-2">
                    <Checkbox checked={it.is_completed} onCheckedChange={v => updateRunItem.mutate({ item_id: it.id, is_completed: !!v })} />
                    <div className="flex-1">
                      <div className={it.is_completed ? 'line-through text-muted-foreground' : ''}>{it.title}</div>
                      {it.is_required && <Badge variant="outline" className="text-xs mt-1">Required</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="grid md:grid-cols-2 gap-4">
          {(templates || []).map((tpl: any) => (
            <Card key={tpl.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tpl.template_name}</CardTitle>
                  <Badge variant={tpl.shift_type === 'opening' ? 'default' : 'secondary'}>{tpl.shift_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{tpl.description}</p>
                <p className="text-xs">{(tpl.items || []).length} tasks</p>
                <Button size="sm" className="mt-3" onClick={() => startRun.mutate({ template_id: tpl.id })}><Play className="h-3 w-3 mr-1" />Start</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {recentRuns.map((run: any) => (
            <Card key={run.id}><CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{run.shift_type === 'opening' ? 'Opening' : 'Closing'} — {run.cashier_name || '—'}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(run.started_at), 'PPp')}</div>
              </div>
              <Badge variant={run.status === 'completed' ? 'default' : 'outline'}>{run.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
