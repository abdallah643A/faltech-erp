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
import { Plus, Bug, Clock, DollarSign, AlertTriangle } from 'lucide-react';

interface TechDebt {
  id: string;
  title: string;
  description: string;
  tech_asset: string;
  category: string;
  severity: string;
  estimated_effort_days: number;
  estimated_cost: number;
  impact: string;
  status: string;
  created_at: string;
}

export function TechDebtBacklog({ techAssets = [] }: { techAssets: any[] }) {
  const [items, setItems] = useState<TechDebt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', tech_asset: '', category: 'code_quality',
    severity: 'medium', estimated_effort_days: '', estimated_cost: '', impact: '', status: 'open',
  });

  const totalCost = items.reduce((s, i) => s + i.estimated_cost, 0);
  const totalEffort = items.reduce((s, i) => s + i.estimated_effort_days, 0);
  const criticalCount = items.filter(i => i.severity === 'critical' || i.severity === 'high').length;

  const handleAdd = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), title: form.title, description: form.description,
      tech_asset: form.tech_asset, category: form.category, severity: form.severity,
      estimated_effort_days: Number(form.estimated_effort_days) || 0,
      estimated_cost: Number(form.estimated_cost) || 0,
      impact: form.impact, status: form.status,
      created_at: new Date().toISOString(),
    }]);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Bug className="h-5 w-5" /> Tech Debt Backlog</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Log Debt</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">Critical/High</span></div>
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><Clock className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">Total Effort</span></div>
          <p className="text-2xl font-bold">{totalEffort} days</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">Est. Cost</span></div>
          <p className="text-2xl font-bold">{(totalCost / 1000).toFixed(0)}K</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Asset</TableHead><TableHead>Category</TableHead>
                <TableHead>Severity</TableHead><TableHead>Effort</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tech debt logged</TableCell></TableRow>}
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell><div><p className="font-medium text-sm">{i.title}</p>{i.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{i.description}</p>}</div></TableCell>
                  <TableCell className="text-sm">{i.tech_asset || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{i.category.replace('_', ' ')}</Badge></TableCell>
                  <TableCell><Badge variant={i.severity === 'critical' ? 'destructive' : i.severity === 'high' ? 'destructive' : 'secondary'}>{i.severity}</Badge></TableCell>
                  <TableCell>{i.estimated_effort_days}d</TableCell>
                  <TableCell>{i.estimated_cost.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Tech Debt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <Select value={form.tech_asset} onValueChange={v => setForm(f => ({ ...f, tech_asset: v }))}>
              <SelectTrigger><SelectValue placeholder="Related Asset" /></SelectTrigger>
              <SelectContent>{techAssets.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['code_quality', 'architecture', 'infrastructure', 'security', 'dependency', 'documentation', 'testing'].map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['critical', 'high', 'medium', 'low'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Effort (days)" value={form.estimated_effort_days} onChange={e => setForm(f => ({ ...f, estimated_effort_days: e.target.value }))} />
              <Input type="number" placeholder="Est. Cost (SAR)" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} />
            </div>
            <Button onClick={handleAdd} disabled={!form.title} className="w-full">Log Debt Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
