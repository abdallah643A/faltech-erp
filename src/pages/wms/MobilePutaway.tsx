import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWmsTasks, useWmsScans } from '@/hooks/useWarehouseExecution';
import { ArrowDown, ScanLine, CheckCircle2, XCircle, MapPin, Navigation } from 'lucide-react';

export default function MobilePutaway() {
  const { data: tasks, updateTask } = useWmsTasks('putaway');
  const { recordScan } = useWmsScans();
  const [scanInput, setScanInput] = useState('');
  const [step, setStep] = useState<'scan_item' | 'scan_bin'>('scan_item');
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = tasks?.filter((t: any) => t.status === 'pending' || t.status === 'assigned') || [];
  const inProgress = tasks?.filter((t: any) => t.status === 'in_progress') || [];

  const handleScan = async () => {
    if (!scanInput.trim()) return;

    if (step === 'scan_item') {
      const matched = pending.find((t: any) => t.item_code === scanInput || t.reference_number === scanInput);
      if (matched) {
        setCurrentItem(matched);
        setStep('scan_bin');
        setFeedback({ type: 'success', msg: `Item matched: ${matched.item_description}` });
        await updateTask.mutateAsync({ id: matched.id, status: 'in_progress', started_at: new Date().toISOString() });
      } else {
        setFeedback({ type: 'error', msg: 'Item not found in putaway queue' });
      }
      await recordScan.mutateAsync({ scan_type: 'barcode', scan_value: scanInput, scan_result: matched ? 'success' : 'mismatch', item_code: scanInput });
    } else if (step === 'scan_bin' && currentItem) {
      const isCorrectBin = currentItem.target_bin === scanInput || !currentItem.target_bin;
      await recordScan.mutateAsync({
        task_id: currentItem.id, scan_type: 'barcode', scan_value: scanInput,
        scan_result: isCorrectBin ? 'success' : 'mismatch',
        expected_value: currentItem.target_bin, location: scanInput,
      });
      if (isCorrectBin) {
        await updateTask.mutateAsync({ id: currentItem.id, status: 'completed', completed_at: new Date().toISOString(), actual_qty: currentItem.expected_qty });
        setFeedback({ type: 'success', msg: `Putaway complete → Bin ${scanInput}` });
        setCurrentItem(null);
        setStep('scan_item');
      } else {
        setFeedback({ type: 'error', msg: `Wrong bin! Expected: ${currentItem.target_bin}` });
      }
    }
    setScanInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background p-3 pb-20 space-y-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <ArrowDown className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Directed Putaway</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={step === 'scan_item' ? 'default' : 'secondary'} className="text-xs">1. Scan Item</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={step === 'scan_bin' ? 'default' : 'secondary'} className="text-xs">2. Scan Bin</Badge>
      </div>

      {/* Scanner */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">{step === 'scan_item' ? 'Scan Item Barcode' : 'Scan Target Bin'}</span>
          </div>
          <div className="flex gap-2">
            <Input ref={inputRef} placeholder={step === 'scan_item' ? 'Scan item...' : 'Scan bin location...'} value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
            <Button onClick={handleScan} className="h-12 px-6">Go</Button>
          </div>
          {feedback && (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${feedback.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium text-sm">{feedback.msg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current item direction */}
      {currentItem && (
        <Card className="border-2 border-orange-400/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm">Go to Bin</span>
            </div>
            <div className="text-center py-3">
              <div className="text-3xl font-bold text-primary">{currentItem.target_bin || 'ANY'}</div>
              <div className="text-sm text-muted-foreground mt-1">{currentItem.item_code} — {currentItem.item_description}</div>
              <div className="text-sm mt-1">Qty: <span className="font-bold">{currentItem.expected_qty} {currentItem.uom}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center"><div className="text-2xl font-bold text-primary">{pending.length}</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-bold text-orange-500">{inProgress.length}</div><div className="text-xs text-muted-foreground">In Progress</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-bold text-green-500">{tasks?.filter((t: any) => t.status === 'completed').length || 0}</div><div className="text-xs text-muted-foreground">Done Today</div></Card>
      </div>

      {/* Queue */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Putaway Queue</h2>
        <div className="space-y-2">
          {pending.map((task: any) => (
            <Card key={task.id} className="cursor-pointer hover:border-primary/50">
              <CardContent className="p-3 flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{task.item_code}</div>
                  <div className="text-xs text-muted-foreground">→ {task.target_bin || 'Unassigned'}</div>
                </div>
                <div className="text-right"><div className="font-bold text-sm">{task.expected_qty} {task.uom}</div></div>
              </CardContent>
            </Card>
          ))}
          {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All items put away</p>}
        </div>
      </div>
    </div>
  );
}
