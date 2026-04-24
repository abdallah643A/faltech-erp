import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, TrendingUp, DollarSign } from 'lucide-react';

interface Benefit {
  id: string;
  project_name: string;
  benefit_name: string;
  category: string;
  expected_value: number;
  realized_value: number;
  unit: string;
  target_date: string;
  status: string;
  notes: string;
}

// In-memory state since no DB table yet — data-driven UI ready for persistence
export function BenefitsRealizationTracker({ projects = [] }: { projects: any[] }) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    project_name: '', benefit_name: '', category: 'financial',
    expected_value: '', realized_value: '', unit: 'SAR',
    target_date: '', status: 'planned', notes: '',
  });

  const totalExpected = benefits.reduce((s, b) => s + b.expected_value, 0);
  const totalRealized = benefits.reduce((s, b) => s + b.realized_value, 0);
  const realizationRate = totalExpected > 0 ? Math.round((totalRealized / totalExpected) * 100) : 0;
  const onTrack = benefits.filter(b => b.status === 'on_track' || b.status === 'realized').length;

  const handleAdd = () => {
    setBenefits(prev => [...prev, {
      id: crypto.randomUUID(),
      project_name: form.project_name,
      benefit_name: form.benefit_name,
      category: form.category,
      expected_value: Number(form.expected_value) || 0,
      realized_value: Number(form.realized_value) || 0,
      unit: form.unit,
      target_date: form.target_date,
      status: form.status,
      notes: form.notes,
    }]);
    setDialogOpen(false);
    setForm({ project_name: '', benefit_name: '', category: 'financial', expected_value: '', realized_value: '', unit: 'SAR', target_date: '', status: 'planned', notes: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Benefits Realization Tracker</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Benefit</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Benefits</span></div>
          <p className="text-2xl font-bold">{benefits.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Expected Value</span></div>
          <p className="text-2xl font-bold">{(totalExpected / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Realized</span></div>
          <p className="text-2xl font-bold">{(totalRealized / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <span className="text-xs text-muted-foreground">Realization Rate</span>
          <p className="text-2xl font-bold">{realizationRate}%</p>
          <Progress value={realizationRate} className="h-1.5 mt-1" />
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Realized</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benefits.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No benefits tracked yet. Click "Add Benefit" to start.</TableCell></TableRow>
              )}
              {benefits.map(b => {
                const pct = b.expected_value > 0 ? Math.round((b.realized_value / b.expected_value) * 100) : 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.project_name}</TableCell>
                    <TableCell>{b.benefit_name}</TableCell>
                    <TableCell><Badge variant="outline">{b.category}</Badge></TableCell>
                    <TableCell>{b.expected_value.toLocaleString()} {b.unit}</TableCell>
                    <TableCell>{b.realized_value.toLocaleString()} {b.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Progress value={pct} className="h-1.5 w-12" />
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{b.target_date || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'realized' ? 'default' : b.status === 'at_risk' ? 'destructive' : 'secondary'}>
                        {b.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Benefit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.project_name} onValueChange={v => setForm(f => ({ ...f, project_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Benefit Name *" value={form.benefit_name} onChange={e => setForm(f => ({ ...f, benefit_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['financial', 'operational', 'strategic', 'compliance', 'customer'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['planned', 'on_track', 'at_risk', 'realized', 'not_achieved'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Expected Value" value={form.expected_value} onChange={e => setForm(f => ({ ...f, expected_value: e.target.value }))} />
              <Input type="number" placeholder="Realized Value" value={form.realized_value} onChange={e => setForm(f => ({ ...f, realized_value: e.target.value }))} />
              <Input placeholder="Unit (SAR)" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            <Button onClick={handleAdd} disabled={!form.benefit_name} className="w-full">Add Benefit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
