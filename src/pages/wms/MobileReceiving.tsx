import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useWmsTasks, useWmsScans } from '@/hooks/useWarehouseExecution';
import { PackagePlus, ScanLine, Wifi, CheckCircle2, XCircle, AlertTriangle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

export default function MobileReceiving() {
  const { t } = useLanguage();
  const { data: tasks, createTask } = useWmsTasks('receive');
  const { data: scans, recordScan } = useWmsScans();
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'barcode' | 'rfid'>('barcode');
  const [activeTask, setActiveTask] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ reference_number: '', warehouse_code: '', item_code: '', item_description: '', expected_qty: 0, uom: 'EA' });
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending' || t.status === 'in_progress') || [];
  const completedToday = tasks?.filter((t: any) => t.status === 'completed' && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()) || [];

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    const matchedTask = activeTask || pendingTasks.find((t: any) => t.item_code === scanInput || t.reference_number === scanInput);
    const result = matchedTask ? 'success' : 'mismatch';

    await recordScan.mutateAsync({
      task_id: matchedTask?.id || null,
      scan_type: scanMode,
      scan_value: scanInput,
      scan_result: result,
      expected_value: matchedTask?.item_code || '',
      item_code: matchedTask?.item_code || scanInput,
      item_description: matchedTask?.item_description || '',
      quantity: 1,
      location: matchedTask?.warehouse_code || '',
    });

    if (result === 'success' && matchedTask) {
      const newQty = (matchedTask.actual_qty || 0) + 1;
      // We don't update task inline here; the invalidation handles it
    }

    setScanInput('');
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    await createTask.mutateAsync({ ...newTask, task_type: 'receive', status: 'pending' });
    setShowCreate(false);
    setNewTask({ reference_number: '', warehouse_code: '', item_code: '', item_description: '', expected_qty: 0, uom: 'EA' });
  };

  return (
    <div className="min-h-screen bg-background p-3 pb-20 space-y-3 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Mobile Receiving</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Receiving Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="PO / Reference #" value={newTask.reference_number} onChange={e => setNewTask(p => ({ ...p, reference_number: e.target.value }))} />
              <Input placeholder="Warehouse Code" value={newTask.warehouse_code} onChange={e => setNewTask(p => ({ ...p, warehouse_code: e.target.value }))} />
              <Input placeholder="Item Code" value={newTask.item_code} onChange={e => setNewTask(p => ({ ...p, item_code: e.target.value }))} />
              <Input placeholder="Item Description" value={newTask.item_description} onChange={e => setNewTask(p => ({ ...p, item_description: e.target.value }))} />
              <div className="flex gap-2">
                <Input type="number" placeholder="Expected Qty" value={newTask.expected_qty || ''} onChange={e => setNewTask(p => ({ ...p, expected_qty: Number(e.target.value) }))} />
                <Input placeholder="UOM" value={newTask.uom} onChange={e => setNewTask(p => ({ ...p, uom: e.target.value }))} className="w-24" />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createTask.isPending}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scanner */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">Scanner</span>
            <div className="ml-auto flex gap-1">
              <Button variant={scanMode === 'barcode' ? 'default' : 'outline'} size="sm" onClick={() => setScanMode('barcode')}>
                <ScanLine className="h-3 w-3 mr-1" /> Barcode
              </Button>
              <Button variant={scanMode === 'rfid' ? 'default' : 'outline'} size="sm" onClick={() => setScanMode('rfid')}>
                <Wifi className="h-3 w-3 mr-1" /> RFID
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Scan or type barcode..."
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              className="text-lg h-12"
              autoFocus
            />
            <Button onClick={handleScan} className="h-12 px-6" disabled={recordScan.isPending}>Scan</Button>
          </div>
          {/* Last scan feedback */}
          {scans && scans.length > 0 && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${scans[0].scan_result === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
              {scans[0].scan_result === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium">{scans[0].scan_value}</span>
              <Badge variant={scans[0].scan_result === 'success' ? 'default' : 'destructive'} className="ml-auto">
                {scans[0].scan_result}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{pendingTasks.length}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{tasks?.filter((t: any) => t.status === 'in_progress').length || 0}</div>
          <div className="text-xs text-muted-foreground">In Progress</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{completedToday.length}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </Card>
      </div>

      {/* Active Task */}
      {activeTask && (
        <Card className="border-2 border-orange-400/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Active Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ref:</span><span className="font-medium">{activeTask.reference_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Item:</span><span className="font-medium">{activeTask.item_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Progress:</span><span className="font-bold">{activeTask.actual_qty}/{activeTask.expected_qty} {activeTask.uom}</span></div>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setActiveTask(null)}>Release</Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Tasks */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Receiving Queue ({pendingTasks.length})</h2>
        <div className="space-y-2">
          {pendingTasks.map((task: any) => (
            <Card key={task.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTask(task)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.reference_number || 'No Ref'}</div>
                  <div className="text-xs text-muted-foreground truncate">{task.item_code} - {task.item_description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{task.actual_qty}/{task.expected_qty}</div>
                  <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">{task.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No pending receiving tasks</p>}
        </div>
      </div>
    </div>
  );
}
