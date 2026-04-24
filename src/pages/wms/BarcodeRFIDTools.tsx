import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWmsScans } from '@/hooks/useWarehouseExecution';
import { QRCodeSVG } from 'qrcode.react';
import { ScanLine, Radio, QrCode, Download, Plus, CheckCircle2, XCircle, Wifi, WifiOff, History } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeItem {
  id: string;
  value: string;
  label: string;
  type: 'item' | 'bin' | 'lot' | 'serial' | 'custom';
}

export default function BarcodeRFIDTools() {
  const { data: scans = [] } = useWmsScans();
  const [activeTab, setActiveTab] = useState('generator');
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([]);
  const [newBarcode, setNewBarcode] = useState({ value: '', label: '', type: 'item' as BarcodeItem['type'] });
  const [rfidMode, setRfidMode] = useState<'idle' | 'scanning' | 'paused'>('idle');
  const [rfidBuffer, setRfidBuffer] = useState<{ tag: string; rssi: number; timestamp: Date }[]>([]);
  const [rfidInterval, setRfidInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResults, setScanResults] = useState<{ value: string; time: Date; valid: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addBarcode = () => {
    if (!newBarcode.value) { toast.error('Value required'); return; }
    setBarcodeItems(prev => [...prev, { id: crypto.randomUUID(), ...newBarcode }]);
    setNewBarcode({ value: '', label: '', type: 'item' });
  };

  const printBarcodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const svgs = document.querySelectorAll('.barcode-print-item');
    printWindow.document.write('<html><head><title>Barcode Labels</title><style>body{font-family:sans-serif;} .label{display:inline-block;border:1px solid #ddd;padding:12px;margin:8px;text-align:center;page-break-inside:avoid;} .label-text{font-size:10px;margin-top:4px;}</style></head><body>');
    svgs.forEach(el => { printWindow.document.write(el.outerHTML); });
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // RFID Simulation
  const startRfidScan = () => {
    setRfidMode('scanning');
    const id = setInterval(() => {
      const tag = `E200${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
      const rssi = -(Math.floor(Math.random() * 40) + 30);
      setRfidBuffer(prev => {
        const existing = prev.find(p => p.tag === tag);
        if (existing) return prev.map(p => p.tag === tag ? { ...p, rssi, timestamp: new Date() } : p);
        return [...prev, { tag, rssi, timestamp: new Date() }];
      });
    }, 800);
    setRfidInterval(id);
  };

  const stopRfidScan = () => {
    setRfidMode('paused');
    if (rfidInterval) clearInterval(rfidInterval);
    setRfidInterval(null);
  };

  const clearRfid = () => {
    stopRfidScan();
    setRfidBuffer([]);
    setRfidMode('idle');
  };

  const handleTestScan = () => {
    if (!scanInput.trim()) return;
    const isValid = barcodeItems.some(b => b.value === scanInput);
    setScanResults(prev => [{ value: scanInput, time: new Date(), valid: isValid }, ...prev.slice(0, 49)]);
    if (isValid) toast.success(`Valid: ${scanInput}`);
    else toast.error(`Unknown barcode: ${scanInput}`);
    setScanInput('');
    inputRef.current?.focus();
  };

  const recentScans = (scans as any[]).slice(0, 50);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Barcode & RFID Tools</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generator"><QrCode className="h-3.5 w-3.5 mr-1" />Label Generator</TabsTrigger>
          <TabsTrigger value="rfid"><Radio className="h-3.5 w-3.5 mr-1" />RFID Simulator</TabsTrigger>
          <TabsTrigger value="test"><ScanLine className="h-3.5 w-3.5 mr-1" />Scan Tester</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />Scan History</TabsTrigger>
        </TabsList>

        {/* BARCODE GENERATOR */}
        <TabsContent value="generator" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Generate Barcode / QR Labels</CardTitle>
                <div className="flex gap-2">
                  {barcodeItems.length > 0 && <Button size="sm" variant="outline" onClick={printBarcodes}><Download className="h-3.5 w-3.5 mr-1" />Print All</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Select value={newBarcode.type} onValueChange={v => setNewBarcode(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="bin">Bin Location</SelectItem>
                    <SelectItem value="lot">Lot #</SelectItem>
                    <SelectItem value="serial">Serial #</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Value (e.g. ITM-001)" value={newBarcode.value} onChange={e => setNewBarcode(p => ({ ...p, value: e.target.value }))} className="w-48" />
                <Input placeholder="Label (optional)" value={newBarcode.label} onChange={e => setNewBarcode(p => ({ ...p, label: e.target.value }))} className="w-48" />
                <Button onClick={addBarcode}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>

              {barcodeItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Add items to generate barcode labels</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {barcodeItems.map(item => (
                    <div key={item.id} className="barcode-print-item border rounded-lg p-3 text-center hover:bg-muted/30 cursor-pointer" onClick={() => setBarcodeItems(prev => prev.filter(p => p.id !== item.id))}>
                      <QRCodeSVG value={item.value} size={80} className="mx-auto" />
                      <div className="mt-2 font-mono text-xs font-bold">{item.value}</div>
                      {item.label && <div className="text-[10px] text-muted-foreground">{item.label}</div>}
                      <Badge variant="outline" className="mt-1 text-[9px]">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFID SIMULATOR */}
        <TabsContent value="rfid" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center"><div className="text-2xl font-bold text-primary">{rfidBuffer.length}</div><div className="text-xs text-muted-foreground">Tags Detected</div></Card>
            <Card className="p-3 text-center"><div className={`text-2xl font-bold ${rfidMode === 'scanning' ? 'text-green-400 animate-pulse' : 'text-muted-foreground'}`}>{rfidMode === 'scanning' ? 'ACTIVE' : rfidMode === 'paused' ? 'PAUSED' : 'IDLE'}</div><div className="text-xs text-muted-foreground">Reader Status</div></Card>
            <Card className="p-3 text-center"><div className="text-2xl font-bold">{rfidBuffer.length > 0 ? `${Math.max(...rfidBuffer.map(b => b.rssi))} dBm` : '—'}</div><div className="text-xs text-muted-foreground">Best Signal</div></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {rfidMode === 'scanning' ? <Wifi className="h-4 w-4 text-green-500 animate-pulse" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  RFID Reader Simulation
                </CardTitle>
                <div className="flex gap-2">
                  {rfidMode !== 'scanning' ? (
                    <Button size="sm" onClick={startRfidScan}><Radio className="h-3.5 w-3.5 mr-1" />{rfidMode === 'paused' ? 'Resume' : 'Start Scan'}</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={stopRfidScan}>Pause</Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={clearRfid}>Clear</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>EPC Tag</TableHead><TableHead>Signal (RSSI)</TableHead><TableHead>Proximity</TableHead><TableHead>Last Seen</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rfidBuffer.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Start scanning to detect RFID tags</TableCell></TableRow> :
                    rfidBuffer.sort((a, b) => b.rssi - a.rssi).map(tag => {
                      const prox = tag.rssi > -40 ? 'Near' : tag.rssi > -55 ? 'Medium' : 'Far';
                      const proxColor = tag.rssi > -40 ? 'bg-green-500/20 text-green-400' : tag.rssi > -55 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
                      return (
                        <TableRow key={tag.tag}>
                          <TableCell className="font-mono text-xs">{tag.tag}</TableCell>
                          <TableCell>{tag.rssi} dBm</TableCell>
                          <TableCell><Badge className={proxColor}>{prox}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tag.timestamp.toLocaleTimeString()}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCAN TESTER */}
        <TabsContent value="test" className="space-y-4">
          <Card className="border-2 border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /><span className="font-semibold">Barcode Scan Tester</span></div>
              <p className="text-xs text-muted-foreground">Scan or type a barcode value to validate against generated labels</p>
              <div className="flex gap-2">
                <Input ref={inputRef} placeholder="Scan barcode here..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTestScan()} className="text-lg h-12" autoFocus />
                <Button onClick={handleTestScan} className="h-12 px-6">Test</Button>
              </div>
            </CardContent>
          </Card>

          {scanResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Test Results</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Value</TableHead><TableHead>Result</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scanResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.value}</TableCell>
                        <TableCell>{r.valid ? <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Valid</Badge> : <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Unknown</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.time.toLocaleTimeString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SCAN HISTORY */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Recent Scan Activity (Last 50)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Result</TableHead><TableHead>Item</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentScans.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scan history</TableCell></TableRow> :
                    recentScans.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{s.scan_type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{s.scan_value}</TableCell>
                        <TableCell><Badge className={s.scan_result === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{s.scan_result}</Badge></TableCell>
                        <TableCell>{s.item_code || '—'}</TableCell>
                        <TableCell>{s.location || '—'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
