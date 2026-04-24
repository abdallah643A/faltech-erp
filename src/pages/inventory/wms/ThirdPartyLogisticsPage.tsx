import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { use3PLProviders, use3PLShipments } from '@/hooks/useWMS';
import { format } from 'date-fns';
import { Truck, Package } from 'lucide-react';

const statusColor: Record<string, string> = { pending: 'bg-gray-100 text-gray-800', picked_up: 'bg-blue-100 text-blue-800', in_transit: 'bg-yellow-100 text-yellow-800', delivered: 'bg-green-100 text-green-800', exception: 'bg-red-100 text-red-800' };

export default function ThirdPartyLogisticsPage() {
  const { data: providers = [], create: createProvider } = use3PLProviders();
  const { data: shipments = [], create: createShipment, update: updateShipment } = use3PLShipments();
  const [provForm, setProvForm] = useState<any>({ provider_code: '', provider_name: '', service_types: [], default_currency: 'SAR' });
  const [shipForm, setShipForm] = useState<any>({ provider_id: '', warehouse_code: '', ship_to_name: '', ship_to_city: '', ship_to_country: 'SA', weight_kg: 0, pieces: 1, declared_value: 0, currency: 'SAR', service_type: 'standard' });

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Truck className="h-5 w-5" /> 3PL Integration Hub</h1>
        <p className="text-xs text-blue-100">Aramex, SMSA, Naqel, DHL, FedEx — providers & shipments</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Active Providers</div><div className="text-2xl font-bold">{providers.filter((p: any) => p.is_active).length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Open Shipments</div><div className="text-2xl font-bold text-blue-600">{shipments.filter((s: any) => ['pending', 'picked_up', 'in_transit'].includes(s.shipment_status)).length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Delivered</div><div className="text-2xl font-bold text-green-600">{shipments.filter((s: any) => s.shipment_status === 'delivered').length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Exceptions</div><div className="text-2xl font-bold text-red-600">{shipments.filter((s: any) => s.shipment_status === 'exception').length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList><TabsTrigger value="shipments">Shipments</TabsTrigger><TabsTrigger value="providers">Providers</TabsTrigger></TabsList>

        <TabsContent value="shipments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild><Button size="sm"><Package className="h-4 w-4 mr-1" /> New Shipment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New 3PL Shipment</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <div><Label className="text-xs">Provider</Label>
                    <Select value={shipForm.provider_id} onValueChange={(v) => setShipForm({ ...shipForm, provider_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.provider_name} ({p.provider_code})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Warehouse</Label><Input value={shipForm.warehouse_code} onChange={(e) => setShipForm({ ...shipForm, warehouse_code: e.target.value })} className="h-9" /></div>
                  <div><Label className="text-xs">Ship To Name</Label><Input value={shipForm.ship_to_name} onChange={(e) => setShipForm({ ...shipForm, ship_to_name: e.target.value })} className="h-9" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">City</Label><Input value={shipForm.ship_to_city} onChange={(e) => setShipForm({ ...shipForm, ship_to_city: e.target.value })} className="h-9" /></div>
                    <div><Label className="text-xs">Country</Label><Input value={shipForm.ship_to_country} onChange={(e) => setShipForm({ ...shipForm, ship_to_country: e.target.value })} className="h-9" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Weight (kg)</Label><Input type="number" value={shipForm.weight_kg} onChange={(e) => setShipForm({ ...shipForm, weight_kg: parseFloat(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Pieces</Label><Input type="number" value={shipForm.pieces} onChange={(e) => setShipForm({ ...shipForm, pieces: parseInt(e.target.value) })} className="h-9" /></div>
                    <div><Label className="text-xs">Value (SAR)</Label><Input type="number" value={shipForm.declared_value} onChange={(e) => setShipForm({ ...shipForm, declared_value: parseFloat(e.target.value) })} className="h-9" /></div>
                  </div>
                  <Button className="w-full" onClick={() => createShipment.mutate(shipForm)}>Create Shipment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">AWB</th>
                  <th className="p-2 text-left">Provider</th>
                  <th className="p-2 text-left">Ship To</th>
                  <th className="p-2 text-right">Pieces / Weight</th>
                  <th className="p-2 text-right">Value</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2"></th>
                </tr></thead>
                <tbody>
                  {shipments.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No shipments yet</td></tr>}
                  {shipments.map((s: any) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{s.awb_number}</td>
                      <td className="p-2 text-xs">{s.provider?.provider_name || '—'}</td>
                      <td className="p-2 text-xs">{s.ship_to_name}, {s.ship_to_city}</td>
                      <td className="p-2 text-right text-xs">{s.pieces} / {s.weight_kg} kg</td>
                      <td className="p-2 text-right">{s.declared_value} {s.currency}</td>
                      <td className="p-2 text-center"><Badge className={statusColor[s.shipment_status]}>{s.shipment_status}</Badge></td>
                      <td className="p-2">
                        <Select value={s.shipment_status} onValueChange={(v) => updateShipment.mutate({ id: s.id, shipment_status: v })}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="picked_up">Picked Up</SelectItem>
                            <SelectItem value="in_transit">In Transit</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="exception">Exception</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild><Button size="sm">Add Provider</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New 3PL Provider</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <div><Label className="text-xs">Code</Label><Input value={provForm.provider_code} onChange={(e) => setProvForm({ ...provForm, provider_code: e.target.value.toUpperCase() })} className="h-9" /></div>
                  <div><Label className="text-xs">Name</Label><Input value={provForm.provider_name} onChange={(e) => setProvForm({ ...provForm, provider_name: e.target.value })} className="h-9" /></div>
                  <div><Label className="text-xs">Currency</Label><Input value={provForm.default_currency} onChange={(e) => setProvForm({ ...provForm, default_currency: e.target.value })} className="h-9" /></div>
                  <Button className="w-full" onClick={() => createProvider.mutate(provForm)}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Arabic</th>
                  <th className="p-2 text-left">Services</th>
                  <th className="p-2 text-left">Coverage</th>
                  <th className="p-2 text-center">Active</th>
                </tr></thead>
                <tbody>
                  {providers.map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2 font-mono">{p.provider_code}</td>
                      <td className="p-2">{p.provider_name}</td>
                      <td className="p-2" dir="rtl">{p.provider_name_ar || '—'}</td>
                      <td className="p-2 text-xs">{p.service_types?.join(', ')}</td>
                      <td className="p-2 text-xs">{p.coverage_regions?.join(', ')}</td>
                      <td className="p-2 text-center">{p.is_active ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
