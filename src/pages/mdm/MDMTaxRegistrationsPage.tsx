import { useState } from 'react';
import { useTaxRegistrations, useUpsertTaxRegistration, useCountries } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus } from 'lucide-react';

export default function MDMTaxRegistrationsPage() {
  const list = useTaxRegistrations();
  const countries = useCountries();
  const upsert = useUpsertTaxRegistration();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ registration_type: 'VAT', country_code: 'SA', is_primary: true });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" />Tax Registrations</h1>
          <p className="text-muted-foreground">VAT, CR, national-ID and other registrations per country.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Registration</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BP</TableHead><TableHead>Type</TableHead><TableHead>Number</TableHead>
                <TableHead>Country</TableHead><TableHead>Issued</TableHead><TableHead>Expiry</TableHead>
                <TableHead>Verified</TableHead><TableHead>Primary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.bp_id}</TableCell>
                  <TableCell><Badge variant="secondary">{t.registration_type}</Badge></TableCell>
                  <TableCell className="font-mono">{t.registration_number}</TableCell>
                  <TableCell>{t.country_code}</TableCell>
                  <TableCell className="text-sm">{t.issued_date ?? '—'}</TableCell>
                  <TableCell className="text-sm">{t.expiry_date ?? '—'}</TableCell>
                  <TableCell>{t.is_verified ? <Badge>Verified</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell>{t.is_primary ? '★' : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Tax Registration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>BP ID</Label><Input value={form.bp_id ?? ''} onChange={(e) => setForm({ ...form, bp_id: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.registration_type} onValueChange={(v) => setForm({ ...form, registration_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['VAT','CR','TIN','NationalID','Customs','License'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Country</Label>
                <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(countries.data ?? []).map((c: any) => <SelectItem key={c.code} value={c.code}>{c.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Registration Number</Label><Input value={form.registration_number ?? ''} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issued</Label><Input type="date" value={form.issued_date ?? ''} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} /></div>
              <div><Label>Expiry</Label><Input type="date" value={form.expiry_date ?? ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={!!form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} /><Label>Verified</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} /><Label>Primary</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
