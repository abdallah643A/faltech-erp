import { useState } from 'react';
import { useCreditProfiles, useUpsertCreditProfile } from '@/hooks/useMDMSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus } from 'lucide-react';

export default function MDMCreditProfilesPage() {
  const list = useCreditProfiles();
  const upsert = useUpsertCreditProfile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ currency: 'SAR', credit_limit: 0, current_exposure: 0 });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6" />Credit Profiles</h1>
          <p className="text-muted-foreground">Credit limits, terms, exposure and risk per BP.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Profile</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BP</TableHead><TableHead>Limit</TableHead><TableHead>Exposure</TableHead>
                <TableHead>Available</TableHead><TableHead>Rating</TableHead><TableHead>Risk</TableHead>
                <TableHead>Terms</TableHead><TableHead>Next Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.bp_id}</TableCell>
                  <TableCell>{p.credit_limit?.toLocaleString()} {p.currency}</TableCell>
                  <TableCell>{p.current_exposure?.toLocaleString()}</TableCell>
                  <TableCell>{p.available_credit?.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{p.credit_rating ?? '—'}</Badge></TableCell>
                  <TableCell>{p.risk_score ?? '—'}</TableCell>
                  <TableCell>{p.payment_terms ?? '—'}</TableCell>
                  <TableCell className="text-sm">{p.next_review_date ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Credit Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>BP ID</Label><Input value={form.bp_id ?? ''} onChange={(e) => setForm({ ...form, bp_id: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Credit Limit</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['SAR','AED','USD','EUR','KWD','QAR','BHD','OMR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Current Exposure</Label><Input type="number" value={form.current_exposure} onChange={(e) => setForm({ ...form, current_exposure: Number(e.target.value) })} /></div>
              <div><Label>Risk Score (0-100)</Label><Input type="number" value={form.risk_score ?? ''} onChange={(e) => setForm({ ...form, risk_score: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Payment Terms</Label><Input value={form.payment_terms ?? ''} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="e.g. Net 30" /></div>
            <div><Label>Credit Rating</Label><Input value={form.credit_rating ?? ''} onChange={(e) => setForm({ ...form, credit_rating: e.target.value })} placeholder="A / B / C" /></div>
            <div><Label>Next Review Date</Label><Input type="date" value={form.next_review_date ?? ''} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></div>
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
