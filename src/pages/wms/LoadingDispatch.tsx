import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWmsTasks, useWmsScans } from '@/hooks/useWarehouseExecution';
import { Truck, ScanLine, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function LoadingDispatch() {
  const { data: tasks, createTask, updateTask } = useWmsTasks('load');
  const { recordScan } = useWmsScans();
  const [scanInput, setScanInput] = useState('');
  const [activeLoad, setActiveLoad] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = tasks?.filter((t: any) => t.status === 'pending' || t.status === 'assigned') || [];
  const loading = tasks?.filter((t: any) => t.status === 'in_progress') || [];
  const dispatched = tasks?.filter((t: any) => t.status === 'completed') || [];

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const matched = activeLoad || pending.find((t: any) => t.reference_number === scanInput || t.item_code === scanInput);
    const result = matched ? 'success' : 'mismatch';
    await recordScan.mutateAsync({
      scan_type: 'barcode', scan_value: scanInput, scan_result: result,
      task_id: matched?.id, item_code: scanInput,
    });
    if (matched && result === 'success') {
      if (!activeLoad) {
        setActiveLoad(matched);
        await updateTask.mutateAsync({ id: matched.id, status: 'in_progress', started_at: new Date().toISOString() });
      }
      setFeedback({ type: 'success', msg: `Loaded: ${scanInput}` });
    } else {
      setFeedback({ type: 'error', msg: `Not found: ${scanInput}` });
    }
    setScanInput('');
    inputRef.current?.focus();
  };

  const confirmDispatch = async (task: any) => {
    await updateTask.mutateAsync({ id: task.id, status: 'completed', completed_at: new Date().toISOString(), actual_qty: task.expected_qty });
    if (activeLoad?.id === task.id) setActiveLoad(null);
    setFeedback({ type: 'success', msg: 'Dispatched!' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Loading & Dispatch</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold text-blue-500">{pending.length}</div><div className="text-xs text-muted-foreground">Awaiting Load</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-orange-500">{loading.length}</div><div className="text-xs text-muted-foreground">Loading</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold text-green-500">{dispatched.length}</div><div className="text-xs text-muted-foreground">Dispatched</div></Card>
      </div>

      {/* Scanner */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">Loading Scanner</span>
          </div>
          <div className="flex gap-2">
            <Input ref={inputRef} placeholder="Scan package / pallet barcode..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
            <Button onClick={handleScan} className="h-12 px-6">Scan</Button>
          </div>
          {feedback && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium text-sm">{feedback.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load Queue */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Load Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...loading, ...pending].map((task: any) => (
                <TableRow key={task.id} className={activeLoad?.id === task.id ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">{task.reference_number || '—'}</TableCell>
                  <TableCell>{task.item_code} <span className="text-xs text-muted-foreground">{task.item_description}</span></TableCell>
                  <TableCell className="text-center font-bold">{task.expected_qty}</TableCell>
                  <TableCell><Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>{task.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {task.status === 'in_progress' && <Button size="sm" onClick={() => confirmDispatch(task)}><CheckCircle2 className="h-3 w-3 mr-1" />Dispatch</Button>}
                    {task.status === 'pending' && <Button size="sm" variant="outline" onClick={() => { setActiveLoad(task); updateTask.mutateAsync({ id: task.id, status: 'in_progress', started_at: new Date().toISOString() }); }}><Truck className="h-3 w-3 mr-1" />Load</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && loading.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No items to load</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
