import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWmsTasks, useWmsScans, useWmsExceptions } from '@/hooks/useWarehouseExecution';
import { RotateCcw, ScanLine, Plus, CheckCircle2, XCircle, AlertTriangle, Package } from 'lucide-react';

export default function ReturnHandling() {
  const { data: tasks, createTask, updateTask } = useWmsTasks('return');
  const { recordScan } = useWmsScans();
  const { createException } = useWmsExceptions();
  const [showCreate, setShowCreate] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [activeReturn, setActiveReturn] = useState<any>(null);
  const [inspectionResult, setInspectionResult] = useState<'restock' | 'damage' | 'dispose' | ''>('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    reference_number: '', item_code: '', item_description: '',
    warehouse_code: '', target_bin: '', expected_qty: 1, uom: 'EA',
    exception_notes: '',
  });

  const pending = tasks?.filter((t: any) => ['pending', 'assigned'].includes(t.status)) || [];
  const inspecting = tasks?.filter((t: any) => t.status === 'in_progress') || [];
  const completed = tasks?.filter((t: any) => t.status === 'completed') || [];
  const exceptions = tasks?.filter((t: any) => t.status === 'exception') || [];

  const handleCreate = async () => {
    await createTask.mutateAsync({ ...form, task_type: 'return', status: 'pending' });
    setShowCreate(false);
    setForm({ reference_number: '', item_code: '', item_description: '', warehouse_code: '', target_bin: '', expected_qty: 1, uom: 'EA', exception_notes: '' });
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const matched = pending.find((t: any) => t.item_code === scanInput || t.reference_number === scanInput);
    if (matched) {
      setActiveReturn(matched);
      await updateTask.mutateAsync({ id: matched.id, status: 'in_progress', started_at: new Date().toISOString() });
      await recordScan.mutateAsync({ task_id: matched.id, scan_type: 'barcode', scan_value: scanInput, scan_result: 'success', item_code: matched.item_code });
      setFeedback({ type: 'success', msg: `Return item found: ${matched.item_description}. Inspect and select disposition.` });
    } else {
      await recordScan.mutateAsync({ scan_type: 'barcode', scan_value: scanInput, scan_result: 'mismatch' });
      setFeedback({ type: 'error', msg: 'Item not found in return queue' });
    }
    setScanInput('');
    inputRef.current?.focus();
  };

  const completeInspection = async () => {
    if (!activeReturn || !inspectionResult) return;
    if (inspectionResult === 'restock') {
      await updateTask.mutateAsync({
        id: activeReturn.id, status: 'completed', completed_at: new Date().toISOString(),
        actual_qty: activeReturn.expected_qty, exception_notes: inspectionNotes || 'Restocked',
      });
      setFeedback({ type: 'success', msg: 'Item returned to stock' });
    } else if (inspectionResult === 'damage') {
      await updateTask.mutateAsync({ id: activeReturn.id, status: 'exception', exception_reason: 'damage', exception_notes: inspectionNotes });
      await createException.mutateAsync({
        task_id: activeReturn.id, exception_type: 'damage', severity: 'medium',
        title: `Damaged return: ${activeReturn.item_code}`,
        description: inspectionNotes, item_code: activeReturn.item_code,
        warehouse_code: activeReturn.warehouse_code,
      });
      setFeedback({ type: 'error', msg: 'Damage exception recorded' });
    } else {
      await updateTask.mutateAsync({ id: activeReturn.id, status: 'exception', exception_reason: 'other', exception_notes: `Dispose: ${inspectionNotes}` });
      setFeedback({ type: 'error', msg: 'Disposal recorded' });
    }
    setActiveReturn(null);
    setInspectionResult('');
    setInspectionNotes('');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Return Handling</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Log Return</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Return Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="RMA / Return Reference" value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} />
              <Input placeholder="Item Code" value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} />
              <Input placeholder="Description" value={form.item_description} onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Warehouse" value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} />
                <Input type="number" placeholder="Qty" value={form.expected_qty || ''} onChange={e => setForm(p => ({ ...p, expected_qty: Number(e.target.value) }))} />
                <Input placeholder="UOM" value={form.uom} onChange={e => setForm(p => ({ ...p, uom: e.target.value }))} />
              </div>
              <Input placeholder="Return Bin" value={form.target_bin} onChange={e => setForm(p => ({ ...p, target_bin: e.target.value }))} />
              <Textarea placeholder="Reason for return..." value={form.exception_notes} onChange={e => setForm(p => ({ ...p, exception_notes: e.target.value }))} />
              <Button onClick={handleCreate} className="w-full" disabled={createTask.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold text-primary">{pending.length}</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-orange-500">{inspecting.length}</div><div className="text-xs text-muted-foreground">Inspecting</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-green-500">{completed.length}</div><div className="text-xs text-muted-foreground">Restocked</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-red-500">{exceptions.length}</div><div className="text-xs text-muted-foreground">Exceptions</div></Card>
      </div>

      {/* Scanner */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /><span className="font-semibold">Scan Return Item</span></div>
          <div className="flex gap-2">
            <Input ref={inputRef} placeholder="Scan item barcode or RMA#..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
            <Button onClick={handleScan} className="h-12 px-6">Scan</Button>
          </div>
          {feedback && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm font-medium">{feedback.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Panel */}
      {activeReturn && (
        <Card className="border-2 border-orange-400/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Inspect Return</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Item:</span><br /><span className="font-bold">{activeReturn.item_code}</span></div>
              <div><span className="text-muted-foreground">Description:</span><br /><span>{activeReturn.item_description}</span></div>
              <div><span className="text-muted-foreground">Qty:</span><br /><span className="font-bold">{activeReturn.expected_qty} {activeReturn.uom}</span></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Disposition</label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={inspectionResult === 'restock' ? 'default' : 'outline'} onClick={() => setInspectionResult('restock')} className="h-16 flex-col gap-1">
                  <Package className="h-5 w-5" /><span className="text-xs">Restock</span>
                </Button>
                <Button variant={inspectionResult === 'damage' ? 'destructive' : 'outline'} onClick={() => setInspectionResult('damage')} className="h-16 flex-col gap-1">
                  <AlertTriangle className="h-5 w-5" /><span className="text-xs">Damaged</span>
                </Button>
                <Button variant={inspectionResult === 'dispose' ? 'destructive' : 'outline'} onClick={() => setInspectionResult('dispose')} className="h-16 flex-col gap-1">
                  <XCircle className="h-5 w-5" /><span className="text-xs">Dispose</span>
                </Button>
              </div>
            </div>
            <Textarea placeholder="Inspection notes..." value={inspectionNotes} onChange={e => setInspectionNotes(e.target.value)} />
            <Button onClick={completeInspection} className="w-full" disabled={!inspectionResult}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Inspection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Return Queue */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Return Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>RMA/Ref</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...inspecting, ...pending, ...exceptions].map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { if (t.status === 'pending') { setActiveReturn(null); setScanInput(t.item_code); } }}>
                  <TableCell className="font-medium">{t.reference_number || '—'}</TableCell>
                  <TableCell>{t.item_code} <span className="text-xs text-muted-foreground">{t.item_description}</span></TableCell>
                  <TableCell className="font-bold">{t.expected_qty} {t.uom}</TableCell>
                  <TableCell className="text-sm">{t.exception_notes || '—'}</TableCell>
                  <TableCell><Badge variant={t.status === 'exception' ? 'destructive' : t.status === 'in_progress' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && inspecting.length === 0 && exceptions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No returns pending</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
