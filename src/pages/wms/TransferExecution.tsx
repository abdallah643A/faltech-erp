import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWmsTasks, useWmsScans } from '@/hooks/useWarehouseExecution';
import { ArrowLeftRight, ScanLine, Plus, CheckCircle2, MapPin, Package, Warehouse } from 'lucide-react';
import { useRef } from 'react';

export default function TransferExecution() {
  const { data: tasks, createTask, updateTask } = useWmsTasks('transfer');
  const { recordScan } = useWmsScans();
  const [showCreate, setShowCreate] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [activeTransfer, setActiveTransfer] = useState<any>(null);
  const [step, setStep] = useState<'pick' | 'place'>('pick');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    reference_number: '', item_code: '', item_description: '',
    warehouse_code: '', source_bin: '', target_bin: '',
    expected_qty: 0, uom: 'EA', priority: 'normal',
  });

  const pending = tasks?.filter((t: any) => ['pending', 'assigned'].includes(t.status)) || [];
  const inProgress = tasks?.filter((t: any) => t.status === 'in_progress') || [];
  const completed = tasks?.filter((t: any) => t.status === 'completed') || [];

  const handleCreate = async () => {
    await createTask.mutateAsync({ ...form, task_type: 'transfer', status: 'pending' });
    setShowCreate(false);
    setForm({ reference_number: '', item_code: '', item_description: '', warehouse_code: '', source_bin: '', target_bin: '', expected_qty: 0, uom: 'EA', priority: 'normal' });
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    if (step === 'pick') {
      const matched = activeTransfer || pending.find((t: any) => t.item_code === scanInput || t.reference_number === scanInput);
      if (matched) {
        setActiveTransfer(matched);
        setStep('place');
        await updateTask.mutateAsync({ id: matched.id, status: 'in_progress', started_at: new Date().toISOString() });
        await recordScan.mutateAsync({ task_id: matched.id, scan_type: 'barcode', scan_value: scanInput, scan_result: 'success', item_code: matched.item_code, location: matched.source_bin });
        setFeedback({ type: 'success', msg: `Picked from ${matched.source_bin}. Now scan target bin.` });
      } else {
        await recordScan.mutateAsync({ scan_type: 'barcode', scan_value: scanInput, scan_result: 'mismatch' });
        setFeedback({ type: 'error', msg: 'Item not found in transfer queue' });
      }
    } else if (step === 'place' && activeTransfer) {
      const isCorrect = !activeTransfer.target_bin || activeTransfer.target_bin === scanInput;
      await recordScan.mutateAsync({ task_id: activeTransfer.id, scan_type: 'barcode', scan_value: scanInput, scan_result: isCorrect ? 'success' : 'mismatch', expected_value: activeTransfer.target_bin, location: scanInput });
      if (isCorrect) {
        await updateTask.mutateAsync({ id: activeTransfer.id, status: 'completed', completed_at: new Date().toISOString(), actual_qty: activeTransfer.expected_qty });
        setFeedback({ type: 'success', msg: `Transfer complete! ${activeTransfer.item_code} → ${scanInput}` });
        setActiveTransfer(null);
        setStep('pick');
      } else {
        setFeedback({ type: 'error', msg: `Wrong bin! Expected: ${activeTransfer.target_bin}` });
      }
    }
    setScanInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Transfer Execution</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Transfer Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Reference #" value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} />
              <Input placeholder="Item Code" value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} />
              <Input placeholder="Description" value={form.item_description} onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Source Bin" value={form.source_bin} onChange={e => setForm(p => ({ ...p, source_bin: e.target.value }))} />
                <Input placeholder="Target Bin" value={form.target_bin} onChange={e => setForm(p => ({ ...p, target_bin: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Warehouse" value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} />
                <Input type="number" placeholder="Qty" value={form.expected_qty || ''} onChange={e => setForm(p => ({ ...p, expected_qty: Number(e.target.value) }))} />
                <Input placeholder="UOM" value={form.uom} onChange={e => setForm(p => ({ ...p, uom: e.target.value }))} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createTask.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold text-primary">{pending.length}</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-orange-500">{inProgress.length}</div><div className="text-xs text-muted-foreground">In Progress</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-green-500">{completed.length}</div><div className="text-xs text-muted-foreground">Completed</div></Card>
      </div>

      {/* Scanner */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">{step === 'pick' ? 'Step 1: Scan Item at Source' : 'Step 2: Scan Target Bin'}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant={step === 'pick' ? 'default' : 'secondary'}>1. Pick</Badge>
            <span>→</span>
            <Badge variant={step === 'place' ? 'default' : 'secondary'}>2. Place</Badge>
          </div>
          <div className="flex gap-2">
            <Input ref={inputRef} placeholder={step === 'pick' ? 'Scan item...' : 'Scan target bin...'} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
            <Button onClick={handleScan} className="h-12 px-6">Go</Button>
          </div>
          {feedback && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
              <CheckCircle2 className="h-5 w-5" /><span className="text-sm font-medium">{feedback.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Transfer */}
      {activeTransfer && (
        <Card className="border-2 border-orange-400/50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Transfer In Progress</div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="text-center"><MapPin className="h-5 w-5 text-red-500 mx-auto" /><div className="font-bold">{activeTransfer.source_bin}</div><div className="text-xs text-muted-foreground">Source</div></div>
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <div className="text-center"><MapPin className="h-5 w-5 text-green-500 mx-auto" /><div className="font-bold">{activeTransfer.target_bin || 'ANY'}</div><div className="text-xs text-muted-foreground">Target</div></div>
              </div>
              <div className="mt-2 text-sm">{activeTransfer.item_code} — {activeTransfer.expected_qty} {activeTransfer.uom}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Queue */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Transfer Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead><TableHead>Item</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...inProgress, ...pending].map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setActiveTransfer(t); setStep('pick'); }}>
                  <TableCell className="font-medium">{t.reference_number || '—'}</TableCell>
                  <TableCell>{t.item_code}</TableCell>
                  <TableCell>{t.source_bin || '—'}</TableCell>
                  <TableCell>{t.target_bin || '—'}</TableCell>
                  <TableCell className="font-bold">{t.expected_qty} {t.uom}</TableCell>
                  <TableCell><Badge variant={t.status === 'in_progress' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                  <TableCell><Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'}>{t.priority}</Badge></TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && inProgress.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No pending transfers</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
