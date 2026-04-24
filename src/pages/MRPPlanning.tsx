import { useState } from 'react';
import { useMRPRuns, useMRPResults } from '@/hooks/useBOM';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Play, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MRPPlanning() {
  const { t } = useLanguage();
  const { runs, isLoading, createRun, updateRun } = useMRPRuns();
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ horizon_days: 30, notes: '' });

  const { results } = useMRPResults(selectedRun || undefined);

  const stats = {
    total: runs?.length || 0,
    shortages: results?.filter(r => r.shortage_qty > 0).length || 0,
    totalShortageValue: results?.reduce((s, r) => s + (r.shortage_qty || 0), 0) || 0,
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MRP Planning</h1>
          <p className="text-muted-foreground">Material Requirements Planning — analyze demand and shortages</p>
        </div>
        <Button onClick={() => { setForm({ horizon_days: 30, notes: '' }); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New MRP Run
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Play className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">MRP Runs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.shortages}</p><p className="text-xs text-muted-foreground">Shortages Detected</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Package className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.totalShortageValue}</p><p className="text-xs text-muted-foreground">Total Shortage Qty</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="runs">
        <TabsList><TabsTrigger value="runs">MRP Runs</TabsTrigger><TabsTrigger value="results" disabled={!selectedRun}>Results</TabsTrigger></TabsList>

        <TabsContent value="runs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Run #</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Horizon</TableHead>
                <TableHead>Planned Orders</TableHead><TableHead>Shortage Value</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
                 (runs || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No MRP runs found</TableCell></TableRow> :
                 (runs || []).map(run => (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRun(run.id)}>
                    <TableCell className="font-mono text-sm">{run.run_number}</TableCell>
                    <TableCell>{format(new Date(run.run_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{run.horizon_days} days</TableCell>
                    <TableCell>{run.total_planned_orders}</TableCell>
                    <TableCell>{(run.total_shortage_value || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={run.status === 'completed' ? 'default' : run.status === 'running' ? 'secondary' : 'outline'}>{run.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="results">
          <Card><CardHeader><CardTitle>MRP Results</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead><TableHead>Required</TableHead><TableHead>On Hand</TableHead>
                <TableHead>On Order</TableHead><TableHead>Shortage</TableHead><TableHead>Action</TableHead><TableHead>Due</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(results || []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell><div><p className="font-medium">{r.item_description}</p><p className="text-xs text-muted-foreground">{r.item_code}</p></div></TableCell>
                    <TableCell>{r.required_qty}</TableCell>
                    <TableCell>{r.on_hand_qty}</TableCell>
                    <TableCell>{r.on_order_qty}</TableCell>
                    <TableCell className={r.shortage_qty > 0 ? 'text-destructive font-bold' : ''}>{r.shortage_qty}</TableCell>
                    <TableCell><Badge variant={r.suggested_action === 'purchase' ? 'default' : 'secondary'}>{r.suggested_action}</Badge></TableCell>
                    <TableCell>{r.due_date ? format(new Date(r.due_date), 'MMM dd') : '—'}</TableCell>
                    <TableCell><Badge variant={r.status === 'open' ? 'outline' : 'default'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New MRP Run</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Planning Horizon (days)</Label><Input type="number" value={form.horizon_days} onChange={e => setForm({...form, horizon_days: +e.target.value})} /></div>
            <div><Label>{t('common.notes')}</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => { createRun.mutate(form); setFormOpen(false); }}>Run MRP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
