import { useState } from 'react';
import { useFleetFuelTransactions, useFleetFuelMutations } from '@/hooks/useFleetEnhanced';
import { useFleetAssets, useFleetDrivers } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/currency';

export default function FleetFuelControl() {
  const { data: tx = [], isLoading } = useFleetFuelTransactions();
  const { data: assets = [] } = useFleetAssets();
  const { data: drivers = [] } = useFleetDrivers();
  const { create } = useFleetFuelMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    asset_id: '', driver_id: '', fuel_card_number: '', vendor: '', station_name: '',
    fuel_type: 'diesel', liters: 0, price_per_liter: 0, odometer_reading: 0,
    location: '', notes: '',
  });

  const submit = async () => {
    if (!form.asset_id || !form.liters || !form.price_per_liter) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ ...form, liters: 0, price_per_liter: 0, odometer_reading: 0 });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" /> Fuel Controls & Transactions</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Log Fuel</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Log Fuel Transaction</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vehicle *</Label>
                <Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={form.driver_id} onValueChange={v => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel Card #</Label>
                <Input value={form.fuel_card_number} onChange={e => setForm({ ...form, fuel_card_number: e.target.value })} />
              </div>
              <div>
                <Label>Vendor / Station</Label>
                <Input value={form.station_name} onChange={e => setForm({ ...form, station_name: e.target.value })} />
              </div>
              <div>
                <Label>Liters *</Label>
                <Input type="number" step="0.01" value={form.liters} onChange={e => setForm({ ...form, liters: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Price / Liter *</Label>
                <Input type="number" step="0.01" value={form.price_per_liter} onChange={e => setForm({ ...form, price_per_liter: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Odometer (km)</Label>
                <Input type="number" value={form.odometer_reading} onChange={e => setForm({ ...form, odometer_reading: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Total</Label>
                <Input value={formatSAR((form.liters || 0) * (form.price_per_liter || 0))} disabled />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={create.isPending}>Log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent transactions — efficiency auto-calculated</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Card</TableHead>
              <TableHead className="text-right">Liters</TableHead><TableHead className="text-right">Price/L</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Odometer</TableHead>
              <TableHead className="text-right">km/L</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
                tx.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow> :
                tx.map((t: any) => {
                  const asset = assets.find((a: any) => a.id === t.asset_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{format(new Date(t.transaction_date), 'PP')}</TableCell>
                      <TableCell className="text-xs">{asset?.asset_code || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{t.fuel_card_number || '—'}</TableCell>
                      <TableCell className="text-xs text-right">{t.liters}</TableCell>
                      <TableCell className="text-xs text-right">{formatSAR(t.price_per_liter)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatSAR(t.total_cost)}</TableCell>
                      <TableCell className="text-xs text-right">{t.odometer_reading?.toLocaleString() || '—'}</TableCell>
                      <TableCell className="text-xs text-right">
                        {t.fuel_efficiency_kmpl ? t.fuel_efficiency_kmpl.toFixed(2) : '—'}
                        {t.is_anomaly && <AlertTriangle className="h-3 w-3 inline ml-1 text-destructive" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
