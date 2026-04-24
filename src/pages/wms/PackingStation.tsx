import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWmsPackingStations, useWmsPackingSessions, useWmsScans } from '@/hooks/useWarehouseExecution';
import { Package, ScanLine, Plus, CheckCircle2, Printer, Box } from 'lucide-react';

export default function PackingStation() {
  const { data: stations, createStation } = useWmsPackingStations();
  const { data: sessions, createSession, updateSession } = useWmsPackingSessions();
  const { recordScan } = useWmsScans();
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');
  const [showAddStation, setShowAddStation] = useState(false);
  const [stationForm, setStationForm] = useState({ station_code: '', station_name: '', warehouse_code: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions?.find((s: any) => s.status === 'packing' && s.station_id === selectedStation?.id);

  const handleScan = async () => {
    if (!scanInput.trim() || !selectedStation) return;
    await recordScan.mutateAsync({
      scan_type: 'barcode', scan_value: scanInput, scan_result: 'success',
      item_code: scanInput, location: selectedStation.station_code,
    });
    if (activeSession) {
      await updateSession.mutateAsync({ id: activeSession.id, packed_items: (activeSession.packed_items || 0) + 1 });
    }
    setScanInput('');
    inputRef.current?.focus();
  };

  const startSession = async (orderRef: string) => {
    if (!selectedStation || !orderRef) return;
    await createSession.mutateAsync({ station_id: selectedStation.id, order_reference: orderRef, status: 'packing' });
  };

  const completeSession = async () => {
    if (!activeSession) return;
    await updateSession.mutateAsync({ id: activeSession.id, status: 'packed', completed_at: new Date().toISOString() });
  };

  const handleAddStation = async () => {
    await createStation.mutateAsync(stationForm);
    setShowAddStation(false);
    setStationForm({ station_code: '', station_name: '', warehouse_code: '' });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Packing Station</h1>
        </div>
        <Dialog open={showAddStation} onOpenChange={setShowAddStation}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Station</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Packing Station</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Station Code (e.g. PACK-01)" value={stationForm.station_code} onChange={e => setStationForm(p => ({ ...p, station_code: e.target.value }))} />
              <Input placeholder="Station Name" value={stationForm.station_name} onChange={e => setStationForm(p => ({ ...p, station_name: e.target.value }))} />
              <Input placeholder="Warehouse" value={stationForm.warehouse_code} onChange={e => setStationForm(p => ({ ...p, warehouse_code: e.target.value }))} />
              <Button onClick={handleAddStation} className="w-full">Create Station</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Station Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(stations || []).map((station: any) => (
          <Card key={station.id} className={`cursor-pointer transition-all ${selectedStation?.id === station.id ? 'border-2 border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`} onClick={() => setSelectedStation(station)}>
            <CardContent className="p-4 text-center">
              <Box className={`h-8 w-8 mx-auto mb-2 ${station.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div className="font-bold text-sm">{station.station_code}</div>
              <div className="text-xs text-muted-foreground">{station.station_name || 'Packing'}</div>
              <Badge variant={station.is_active ? 'default' : 'secondary'} className="mt-1 text-[10px]">{station.is_active ? 'Active' : 'Inactive'}</Badge>
            </CardContent>
          </Card>
        ))}
        {(!stations || stations.length === 0) && <p className="text-muted-foreground text-sm col-span-4 text-center py-8">No packing stations configured</p>}
      </div>

      {/* Active Session */}
      {selectedStation && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Station: {selectedStation.station_code}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSession ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Order: {activeSession.order_reference}</div>
                    <div className="text-sm text-muted-foreground">Packed: {activeSession.packed_items} / {activeSession.total_items || '?'} items • {activeSession.box_count} boxes</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Label</Button>
                    <Button size="sm" onClick={completeSession}><CheckCircle2 className="h-4 w-4 mr-1" /> Done</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input ref={inputRef} placeholder="Scan item into box..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="text-lg h-12" autoFocus />
                  <Button onClick={handleScan} className="h-12 px-6"><ScanLine className="h-5 w-5" /></Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">No active packing session</p>
                <div className="flex gap-2 justify-center">
                  <Input placeholder="Order Reference" className="max-w-xs" onKeyDown={e => { if (e.key === 'Enter') startSession((e.target as HTMLInputElement).value); }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Type order reference and press Enter to start</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Pack Sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Station</TableHead><TableHead>Items</TableHead><TableHead>Boxes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(sessions || []).slice(0, 20).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.order_reference}</TableCell>
                  <TableCell>{s.station_id}</TableCell>
                  <TableCell>{s.packed_items}/{s.total_items || '?'}</TableCell>
                  <TableCell>{s.box_count}</TableCell>
                  <TableCell><Badge variant={s.status === 'packed' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
