import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWmsCycleCounts, useWmsCycleCountLines } from '@/hooks/useWarehouseExecution';
import { ClipboardCheck, Plus, ScanLine, CheckCircle2, AlertTriangle, Hash } from 'lucide-react';

export default function CycleCountMobile() {
  const { data: counts, createCount, updateCount } = useWmsCycleCounts();
  const [activeCount, setActiveCount] = useState<any>(null);
  const { data: lines, addLine, updateLine } = useWmsCycleCountLines(activeCount?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ warehouse_code: '', zone: '', method: 'full' });
  const [scanInput, setScanInput] = useState('');
  const [countQty, setCountQty] = useState('');
  const [scannedItem, setScannedItem] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const result = await createCount.mutateAsync(form);
    setShowCreate(false);
    setForm({ warehouse_code: '', zone: '', method: 'full' });
  };

  const handleScan = () => {
    if (!scanInput.trim() || !activeCount) return;
    const matched = lines?.find((l: any) => l.item_code === scanInput);
    setScannedItem(matched || { item_code: scanInput, system_qty: 0 });
    setScanInput('');
    setCountQty('');
  };

  const submitCount = async () => {
    if (!scannedItem || countQty === '') return;
    const qty = Number(countQty);
    if (scannedItem.id) {
      await updateLine.mutateAsync({ id: scannedItem.id, counted_qty: qty, status: 'counted', counted_at: new Date().toISOString() });
    } else {
      await addLine.mutateAsync({ cycle_count_id: activeCount.id, item_code: scannedItem.item_code, counted_qty: qty, system_qty: 0, status: 'counted', counted_at: new Date().toISOString() });
    }
    setScannedItem(null);
    setCountQty('');
    inputRef.current?.focus();
  };

  const startCount = async (count: any) => {
    setActiveCount(count);
    if (count.status === 'draft') {
      await updateCount.mutateAsync({ id: count.id, status: 'in_progress', started_at: new Date().toISOString() });
    }
  };

  const inProgress = counts?.filter((c: any) => c.status === 'in_progress') || [];
  const drafts = counts?.filter((c: any) => c.status === 'draft') || [];

  return (
    <div className="min-h-screen bg-background p-3 pb-20 space-y-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Cycle Count</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Cycle Count</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Warehouse Code" value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} />
              <Input placeholder="Zone (optional)" value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} />
              <Select value={form.method} onValueChange={v => setForm(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Count</SelectItem>
                  <SelectItem value="abc">ABC Analysis</SelectItem>
                  <SelectItem value="random">Random Sample</SelectItem>
                  <SelectItem value="zone">Zone Count</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active count scanner */}
      {activeCount ? (
        <>
          <Card className="border-2 border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{activeCount.count_number}</div>
                  <div className="text-xs text-muted-foreground">{activeCount.warehouse_code} • {activeCount.method}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveCount(null)}>Back</Button>
              </div>
              <div className="flex gap-2">
                <Input ref={inputRef} placeholder="Scan item barcode..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
                <Button onClick={handleScan} className="h-12 px-6"><ScanLine className="h-5 w-5" /></Button>
              </div>
            </CardContent>
          </Card>

          {/* Count entry */}
          {scannedItem && (
            <Card className="border-2 border-orange-400/50">
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <Hash className="h-6 w-6 text-orange-500 mx-auto" />
                  <div className="font-bold text-lg mt-1">{scannedItem.item_code}</div>
                  <div className="text-sm text-muted-foreground">{scannedItem.item_description || 'Unknown Item'}</div>
                  <div className="text-xs mt-1">System Qty: <span className="font-bold">{scannedItem.system_qty}</span></div>
                </div>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Counted Qty" value={countQty} onChange={e => setCountQty(e.target.value)} className="text-lg h-12 text-center" onKeyDown={e => e.key === 'Enter' && submitCount()} />
                  <Button onClick={submitCount} className="h-12 px-6"><CheckCircle2 className="h-5 w-5" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Counted items */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Counted Items ({lines?.filter((l: any) => l.status === 'counted').length || 0})</h2>
            <div className="space-y-1">
              {(lines || []).filter((l: any) => l.status === 'counted').map((line: any) => (
                <Card key={line.id} className="p-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{line.item_code}</span>
                    <div className="flex items-center gap-2">
                      <span>Sys: {line.system_qty}</span>
                      <span>Count: <span className="font-bold">{line.counted_qty}</span></span>
                      {line.variance_qty !== 0 && (
                        <Badge variant={Math.abs(line.variance_qty) > 5 ? 'destructive' : 'secondary'} className="text-[10px]">
                          {line.variance_qty > 0 ? '+' : ''}{line.variance_qty}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Count list */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Active Counts ({inProgress.length})</h2>
            <div className="space-y-2">
              {inProgress.map((count: any) => (
                <Card key={count.id} className="cursor-pointer hover:border-primary/50" onClick={() => startCount(count)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{count.count_number}</div>
                      <div className="text-xs text-muted-foreground">{count.warehouse_code} • {count.method}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{count.counted_items}/{count.total_items}</div>
                      <Badge variant="default" className="text-[10px]">In Progress</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-2">Draft Counts ({drafts.length})</h2>
            <div className="space-y-2">
              {drafts.map((count: any) => (
                <Card key={count.id} className="cursor-pointer hover:border-primary/50" onClick={() => startCount(count)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{count.count_number}</div>
                      <div className="text-xs text-muted-foreground">{count.warehouse_code} • {count.method}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                  </CardContent>
                </Card>
              ))}
              {drafts.length === 0 && inProgress.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No cycle counts</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
