import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator } from 'lucide-react';
import { useDepreciationSchedules, useDepreciationBooks } from '@/hooks/useAssetEnhanced';

export default function DepreciationSchedules() {
  const { data: schedules = [], upsert } = useDepreciationSchedules();
  const { data: books = [] } = useDepreciationBooks();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ method: 'straight_line', acquisition_cost: 0, salvage_value: 0, useful_life_months: 60, start_date: new Date().toISOString().slice(0, 10) });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA').format(Number(v) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />Depreciation Schedules</h1>
          <p className="text-muted-foreground">Per-asset, per-book schedules with IFRS methods</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Schedule</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Book</TableHead><TableHead>Method</TableHead>
              <TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Salvage</TableHead>
              <TableHead>Life (mo)</TableHead><TableHead>Start</TableHead>
              <TableHead className="text-right">Accum</TableHead><TableHead className="text-right">NBV</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {schedules.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><Badge variant="outline">{s.asset_depreciation_books?.book_code}</Badge></TableCell>
                  <TableCell className="text-xs">{s.method}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.acquisition_cost)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.salvage_value)}</TableCell>
                  <TableCell>{s.useful_life_months}</TableCell>
                  <TableCell className="text-xs">{s.start_date}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.accumulated_depreciation)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(s.net_book_value)}</TableCell>
                  <TableCell><Badge>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
              {schedules.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No schedules</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Depreciation Schedule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Book</Label>
              <Select value={draft.book_id || ''} onValueChange={(v) => setDraft({ ...draft, book_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{books.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.book_code} — {b.book_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={draft.method} onValueChange={(v) => setDraft({ ...draft, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['straight_line', 'declining_balance', 'double_declining', 'units_of_production', 'sum_of_years'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Acquisition Cost</Label><Input type="number" value={draft.acquisition_cost} onChange={(e) => setDraft({ ...draft, acquisition_cost: Number(e.target.value) })} /></div>
            <div><Label>Salvage Value</Label><Input type="number" value={draft.salvage_value} onChange={(e) => setDraft({ ...draft, salvage_value: Number(e.target.value) })} /></div>
            <div><Label>Useful Life (months)</Label><Input type="number" value={draft.useful_life_months} onChange={(e) => setDraft({ ...draft, useful_life_months: Number(e.target.value) })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Asset Reference (UUID)</Label><Input value={draft.asset_id || ''} onChange={(e) => setDraft({ ...draft, asset_id: e.target.value || null })} placeholder="optional asset_id or equipment_id" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.book_id || !draft.acquisition_cost}>Save & Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
