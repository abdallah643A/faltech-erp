import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAuditPacks, useAuditPackEvidence } from '@/hooks/useFinanceEnhanced';
import { Archive, Plus, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditPacks() {
  const { data: packs, create, review, remove } = useAuditPacks();
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [evOpen, setEvOpen] = useState(false);
  const [form, setForm] = useState<any>({
    pack_name: '', fiscal_year: new Date().getFullYear(), period_number: new Date().getMonth() + 1,
    pack_type: 'period_close', notes: '',
  });
  const [evForm, setEvForm] = useState<any>({ evidence_type: 'reconciliation', reference_label: '', description: '', file_url: '', file_name: '' });
  const { data: evidence, add, remove: removeEv } = useAuditPackEvidence(selected?.id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Archive className="h-6 w-6" /> Audit Packs</h1>
          <p className="text-muted-foreground">Bundled evidence for period audits, statutory reviews, and external auditors</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Pack</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Audit Pack</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Pack Name *</Label><Input value={form.pack_name} onChange={e => setForm({ ...form, pack_name: e.target.value })} /></div>
              <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: +e.target.value })} /></div>
              <div><Label>Period</Label><Input type="number" value={form.period_number} onChange={e => setForm({ ...form, period_number: +e.target.value })} /></div>
              <div className="col-span-2"><Label>Pack Type</Label>
                <Select value={form.pack_type} onValueChange={v => setForm({ ...form, pack_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="period_close">Period Close</SelectItem>
                    <SelectItem value="annual_audit">Annual Audit</SelectItem>
                    <SelectItem value="zatca_audit">ZATCA Audit</SelectItem>
                    <SelectItem value="internal_audit">Internal Audit</SelectItem>
                    <SelectItem value="statutory_review">Statutory Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={async () => { await create.mutateAsync(form); setOpen(false); }}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Packs ({packs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {packs.map((p: any) => (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full p-2 rounded text-left hover:bg-accent ${selected?.id === p.id ? 'bg-accent' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{p.pack_name}</div>
                    <div className="text-xs text-muted-foreground">FY{p.fiscal_year} P{p.period_number || '—'} · {p.pack_type}</div>
                  </div>
                  <Badge variant={p.status === 'reviewed' ? 'default' : 'secondary'}>{p.status}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Evidence {selected ? `· ${selected.pack_name}` : ''}</CardTitle>
            {selected && (
              <div className="space-x-2">
                {selected.status === 'draft' && <Button size="sm" variant="outline" onClick={() => review.mutate(selected.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Reviewed</Button>}
                <Dialog open={evOpen} onOpenChange={setEvOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Evidence</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Evidence</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Type</Label>
                        <Select value={evForm.evidence_type} onValueChange={v => setEvForm({ ...evForm, evidence_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reconciliation">Reconciliation</SelectItem>
                            <SelectItem value="trial_balance">Trial Balance</SelectItem>
                            <SelectItem value="je_listing">JE Listing</SelectItem>
                            <SelectItem value="bank_statement">Bank Statement</SelectItem>
                            <SelectItem value="confirmation">Confirmation Letter</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Reference Label</Label><Input value={evForm.reference_label} onChange={e => setEvForm({ ...evForm, reference_label: e.target.value })} /></div>
                      <div><Label>File Name</Label><Input value={evForm.file_name} onChange={e => setEvForm({ ...evForm, file_name: e.target.value })} /></div>
                      <div><Label>File URL</Label><Input value={evForm.file_url} onChange={e => setEvForm({ ...evForm, file_url: e.target.value })} /></div>
                      <div><Label>Description</Label><Input value={evForm.description} onChange={e => setEvForm({ ...evForm, description: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button onClick={async () => { await add.mutateAsync(evForm); setEvOpen(false); }}>Add</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? <p className="text-sm text-muted-foreground">Select a pack</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(evidence || []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No evidence yet</TableCell></TableRow> :
                    (evidence || []).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell><Badge variant="outline">{e.evidence_type}</Badge></TableCell>
                        <TableCell>{e.reference_label || '—'}</TableCell>
                        <TableCell>{e.file_url ? <a className="text-primary hover:underline flex items-center gap-1" href={e.file_url} target="_blank" rel="noreferrer"><FileText className="h-3 w-3" /> {e.file_name || 'View'}</a> : '—'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(e.uploaded_at), 'PP')}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => removeEv.mutate(e.id)}>Remove</Button></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
