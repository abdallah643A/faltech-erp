import { useState } from 'react';
import { useNormalizedAddresses, useUpsertAddress, useCountries, useCities } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus } from 'lucide-react';

export default function MDMAddressesPage() {
  const list = useNormalizedAddresses();
  const countries = useCountries();
  const upsert = useUpsertAddress();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ address_type: 'billing', country_code: 'SA' });
  const cities = useCities(form.country_code);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" />Normalized Addresses</h1>
          <p className="text-muted-foreground">Structured addresses validated against the GCC dictionary.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Address</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BP</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead>
                <TableHead>City</TableHead><TableHead>District</TableHead><TableHead>Street</TableHead>
                <TableHead>Postal</TableHead><TableHead>Validated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.bp_id}</TableCell>
                  <TableCell><Badge variant="secondary">{a.address_type}</Badge></TableCell>
                  <TableCell>{a.country_code}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell>{a.district ?? '—'}</TableCell>
                  <TableCell>{a.street ?? '—'}</TableCell>
                  <TableCell>{a.postal_code ?? '—'}</TableCell>
                  <TableCell>{a.is_validated ? <Badge>✓</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Address</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>BP ID</Label><Input value={form.bp_id ?? ''} onChange={(e) => setForm({ ...form, bp_id: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.address_type} onValueChange={(v) => setForm({ ...form, address_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['billing','shipping','registered','warehouse'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Country</Label>
                <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v, city: undefined })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(countries.data ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>City</Label>
              <Select value={form.city ?? ''} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {(cities.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.name_en}>{c.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>District</Label><Input value={form.district ?? ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
              <div><Label>Postal Code</Label><Input value={form.postal_code ?? ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
            </div>
            <div><Label>Street</Label><Input value={form.street ?? ''} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Building No</Label><Input value={form.building_no ?? ''} onChange={(e) => setForm({ ...form, building_no: e.target.value })} /></div>
              <div><Label>P.O. Box</Label><Input value={form.po_box ?? ''} onChange={(e) => setForm({ ...form, po_box: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync({ ...form, is_validated: !!form.city && !!form.country_code }); setOpen(false); }} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
