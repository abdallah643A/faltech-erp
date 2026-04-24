import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWmsWaves, useWmsTasks } from '@/hooks/useWarehouseExecution';
import { Layers, Plus, Play, CheckCircle2, Pause } from 'lucide-react';

export default function BatchWaveBuilder() {
  const { data: waves, createWave, updateWave } = useWmsWaves();
  const { data: pickTasks } = useWmsTasks('pick', 'pending');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ wave_type: 'batch', priority: 'normal', warehouse_code: '', notes: '' });

  const handleCreate = async () => {
    await createWave.mutateAsync(form);
    setShowCreate(false);
    setForm({ wave_type: 'batch', priority: 'normal', warehouse_code: '', notes: '' });
  };

  const releaseWave = async (wave: any) => {
    await updateWave.mutateAsync({ id: wave.id, status: 'released', released_at: new Date().toISOString() });
  };

  const completeWave = async (wave: any) => {
    await updateWave.mutateAsync({ id: wave.id, status: 'completed', completed_at: new Date().toISOString() });
  };

  const stats = {
    draft: waves?.filter((w: any) => w.status === 'draft').length || 0,
    released: waves?.filter((w: any) => w.status === 'released' || w.status === 'in_progress').length || 0,
    unassignedPicks: pickTasks?.length || 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Batch & Wave Builder</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Create Wave</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Wave / Batch</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.wave_type} onValueChange={v => setForm(p => ({ ...p, wave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Order</SelectItem>
                  <SelectItem value="batch">Batch Pick</SelectItem>
                  <SelectItem value="wave">Wave Pick</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Warehouse Code" value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <Button onClick={handleCreate} className="w-full" disabled={createWave.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold text-blue-500">{stats.draft}</div><div className="text-xs text-muted-foreground">Draft Waves</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-orange-500">{stats.released}</div><div className="text-xs text-muted-foreground">Active Waves</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-purple-500">{stats.unassignedPicks}</div><div className="text-xs text-muted-foreground">Unassigned Picks</div></Card>
      </div>

      {/* Waves Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-center">Lines</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(waves || []).map((wave: any) => (
                <TableRow key={wave.id}>
                  <TableCell className="font-medium">{wave.wave_number}</TableCell>
                  <TableCell><Badge variant="outline">{wave.wave_type}</Badge></TableCell>
                  <TableCell>{wave.warehouse_code || '—'}</TableCell>
                  <TableCell className="text-center">{wave.total_lines}</TableCell>
                  <TableCell className="text-center">{wave.completed_lines}/{wave.total_lines}</TableCell>
                  <TableCell><Badge variant={wave.priority === 'urgent' ? 'destructive' : 'secondary'}>{wave.priority}</Badge></TableCell>
                  <TableCell><Badge variant={wave.status === 'completed' ? 'default' : wave.status === 'released' ? 'default' : 'secondary'}>{wave.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {wave.status === 'draft' && <Button size="sm" onClick={() => releaseWave(wave)}><Play className="h-3 w-3 mr-1" />Release</Button>}
                    {(wave.status === 'released' || wave.status === 'in_progress') && <Button size="sm" onClick={() => completeWave(wave)}><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {(!waves || waves.length === 0) && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No waves created yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
