import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileSignature } from 'lucide-react';
import { useContracts } from '@/hooks/useHREnhanced';

export default function ContractLifecyclePage() {
  const { data: contracts = [], upsert } = useContracts();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ contract_type: 'fixed_term', currency: 'SAR', working_hours_per_week: 48, notice_period_days: 60, status: 'active', start_date: new Date().toISOString().slice(0, 10) });
  const fmt = (v: any) => new Intl.NumberFormat('en-SA').format(Number(v) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6 text-primary" />Contract Lifecycle</h1>
          <p className="text-muted-foreground">Probation → Active → Renewal → Termination (Saudi Labor Law aligned)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Contract</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Number</TableHead><TableHead>Type</TableHead><TableHead>Position</TableHead>
            <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Probation</TableHead>
            <TableHead className="text-right">Total (SAR)</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contracts.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                <TableCell><Badge variant="outline">{c.contract_type}</Badge></TableCell>
                <TableCell>{c.position_title}</TableCell>
                <TableCell className="text-xs">{c.start_date}</TableCell>
                <TableCell className="text-xs">{c.end_date || '—'}</TableCell>
                <TableCell className="text-xs">{c.probation_end_date || '—'}</TableCell>
                <TableCell className="text-right font-mono">{fmt(c.total_salary)}</TableCell>
                <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
            {contracts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No contracts</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Contract Number</Label><Input value={draft.contract_number || ''} onChange={(e) => setDraft({ ...draft, contract_number: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.contract_type} onValueChange={(v) => setDraft({ ...draft, contract_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['fixed_term', 'unlimited', 'part_time', 'temporary', 'project_based', 'consultant'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Position Title</Label><Input value={draft.position_title || ''} onChange={(e) => setDraft({ ...draft, position_title: e.target.value })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={draft.end_date || ''} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></div>
            <div><Label>Probation End</Label><Input type="date" value={draft.probation_end_date || ''} onChange={(e) => setDraft({ ...draft, probation_end_date: e.target.value })} /></div>
            <div><Label>Notice Period (days)</Label><Input type="number" value={draft.notice_period_days} onChange={(e) => setDraft({ ...draft, notice_period_days: Number(e.target.value) })} /></div>
            <div><Label>Basic Salary</Label><Input type="number" value={draft.basic_salary || ''} onChange={(e) => setDraft({ ...draft, basic_salary: Number(e.target.value) })} /></div>
            <div><Label>Housing</Label><Input type="number" value={draft.housing_allowance || ''} onChange={(e) => setDraft({ ...draft, housing_allowance: Number(e.target.value) })} /></div>
            <div><Label>Transport</Label><Input type="number" value={draft.transport_allowance || ''} onChange={(e) => setDraft({ ...draft, transport_allowance: Number(e.target.value) })} /></div>
            <div><Label>Other Allowances</Label><Input type="number" value={draft.other_allowances || ''} onChange={(e) => setDraft({ ...draft, other_allowances: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.contract_number || !draft.start_date}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
