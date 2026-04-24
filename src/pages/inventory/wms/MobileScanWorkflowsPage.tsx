import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMobileScanLog, useRecordScan } from '@/hooks/useWMS';
import { ScanLine, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileScanWorkflowsPage() {
  const { data = [] } = useMobileScanLog(50);
  const record = useRecordScan();
  const [scan, setScan] = useState<any>({ scan_type: 'pick', barcode: '', item_code: '', warehouse_code: '', bin_code: '', quantity: 1 });

  const submit = () => {
    if (!scan.barcode) return;
    record.mutate(scan);
    setScan({ ...scan, barcode: '', item_code: '', quantity: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Smartphone className="h-5 w-5" /> Mobile Scan Workflows</h1>
        <p className="text-xs text-blue-100">Handheld terminal simulator + scan log</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ScanLine className="h-4 w-4" /> Scanner Simulator</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label className="text-xs">Workflow</Label>
              <Select value={scan.scan_type} onValueChange={(v) => setScan({ ...scan, scan_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pick">Pick</SelectItem>
                  <SelectItem value="putaway">Put-away</SelectItem>
                  <SelectItem value="receive">Receive</SelectItem>
                  <SelectItem value="ship">Ship</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Barcode / SSCC</Label><Input autoFocus value={scan.barcode} onChange={(e) => setScan({ ...scan, barcode: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Scan…" className="h-10 text-lg font-mono" /></div>
            <div><Label className="text-xs">Item Code</Label><Input value={scan.item_code} onChange={(e) => setScan({ ...scan, item_code: e.target.value })} className="h-9" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Warehouse</Label><Input value={scan.warehouse_code} onChange={(e) => setScan({ ...scan, warehouse_code: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Bin</Label><Input value={scan.bin_code} onChange={(e) => setScan({ ...scan, bin_code: e.target.value })} className="h-9" /></div>
            </div>
            <div><Label className="text-xs">Quantity</Label><Input type="number" value={scan.quantity} onChange={(e) => setScan({ ...scan, quantity: parseFloat(e.target.value) })} className="h-9" /></div>
            <Button onClick={submit} className="w-full">Submit Scan</Button>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-sm">Recent Scans</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Barcode</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No scans yet</td></tr>}
                {data.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 text-xs">{format(new Date(s.scanned_at), 'HH:mm:ss')}</td>
                    <td className="p-2"><Badge variant="outline">{s.scan_type}</Badge></td>
                    <td className="p-2 font-mono text-xs">{s.barcode}</td>
                    <td className="p-2 font-mono text-xs">{s.item_code || '—'}</td>
                    <td className="p-2 text-xs">{s.warehouse_code}/{s.bin_code || '—'}</td>
                    <td className="p-2 text-right">{s.quantity}</td>
                    <td className="p-2 text-center"><Badge className={s.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
