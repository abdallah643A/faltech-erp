import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users } from 'lucide-react';

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  project: string;
  raci: 'R' | 'A' | 'C' | 'I';
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  engagement: string;
  cadence: string;
}

const RACI_COLORS = { R: 'bg-primary text-primary-foreground', A: 'bg-destructive text-destructive-foreground', C: 'bg-amber-500 text-white', I: 'bg-muted text-muted-foreground' };
const RACI_LABELS = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };

export function StakeholderMatrix({ projects = [] }: { projects: any[] }) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', project: '', raci: 'I' as const, influence: 'medium' as const, interest: 'medium' as const, engagement: 'supportive', cadence: 'monthly' });

  const handleAdd = () => {
    setStakeholders(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setDialogOpen(false);
    setForm({ name: '', role: '', project: '', raci: 'I', influence: 'medium', interest: 'medium', engagement: 'supportive', cadence: 'monthly' });
  };

  // Power/Interest grid counts
  const grid = {
    manage: stakeholders.filter(s => s.influence === 'high' && s.interest === 'high').length,
    satisfy: stakeholders.filter(s => s.influence === 'high' && s.interest !== 'high').length,
    inform: stakeholders.filter(s => s.influence !== 'high' && s.interest === 'high').length,
    monitor: stakeholders.filter(s => s.influence !== 'high' && s.interest !== 'high').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Stakeholder Engagement Matrix</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Stakeholder</Button>
      </div>

      {/* Power/Interest Grid */}
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <Card className="border-primary/30"><CardContent className="pt-3 pb-2 px-3 text-center">
          <p className="text-xs text-muted-foreground">Manage Closely</p>
          <p className="text-xs text-muted-foreground">(High Power, High Interest)</p>
          <p className="text-xl font-bold text-primary">{grid.manage}</p>
        </CardContent></Card>
        <Card className="border-amber-500/30"><CardContent className="pt-3 pb-2 px-3 text-center">
          <p className="text-xs text-muted-foreground">Keep Satisfied</p>
          <p className="text-xs text-muted-foreground">(High Power, Low Interest)</p>
          <p className="text-xl font-bold text-amber-600">{grid.satisfy}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 px-3 text-center">
          <p className="text-xs text-muted-foreground">Keep Informed</p>
          <p className="text-xs text-muted-foreground">(Low Power, High Interest)</p>
          <p className="text-xl font-bold">{grid.inform}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 px-3 text-center">
          <p className="text-xs text-muted-foreground">Monitor</p>
          <p className="text-xs text-muted-foreground">(Low Power, Low Interest)</p>
          <p className="text-xl font-bold text-muted-foreground">{grid.monitor}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>RACI</TableHead>
                <TableHead>Influence</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Cadence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeholders.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No stakeholders defined yet</TableCell></TableRow>
              )}
              {stakeholders.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm">{s.role}</TableCell>
                  <TableCell className="text-sm">{s.project}</TableCell>
                  <TableCell><Badge className={RACI_COLORS[s.raci]}>{s.raci} - {RACI_LABELS[s.raci]}</Badge></TableCell>
                  <TableCell><Badge variant={s.influence === 'high' ? 'destructive' : 'secondary'}>{s.influence}</Badge></TableCell>
                  <TableCell><Badge variant={s.interest === 'high' ? 'default' : 'secondary'}>{s.interest}</Badge></TableCell>
                  <TableCell className="text-sm capitalize">{s.engagement}</TableCell>
                  <TableCell className="text-sm capitalize">{s.cadence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stakeholder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Role / Title" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            <Select value={form.project} onValueChange={v => setForm(f => ({ ...f, project: v }))}>
              <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.raci} onValueChange={v => setForm(f => ({ ...f, raci: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['R', 'A', 'C', 'I'] as const).map(r => <SelectItem key={r} value={r}>{r} - {RACI_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.cadence} onValueChange={v => setForm(f => ({ ...f, cadence: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.influence} onValueChange={v => setForm(f => ({ ...f, influence: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['high', 'medium', 'low'].map(l => <SelectItem key={l} value={l}>Influence: {l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.interest} onValueChange={v => setForm(f => ({ ...f, interest: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['high', 'medium', 'low'].map(l => <SelectItem key={l} value={l}>Interest: {l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Select value={form.engagement} onValueChange={v => setForm(f => ({ ...f, engagement: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['supportive', 'neutral', 'resistant', 'champion'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!form.name} className="w-full">Add Stakeholder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
