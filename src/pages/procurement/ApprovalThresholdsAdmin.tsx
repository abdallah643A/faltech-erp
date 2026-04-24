import { useState } from 'react';
import { useApprovalThresholds } from '@/hooks/useApprovalThresholds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, GitBranch, Trash2 } from 'lucide-react';

const DOC_TYPES = ['purchase_request','rfq','purchase_order','ap_invoice','match_override'];

export default function ApprovalThresholdsAdmin() {
  const { data, isLoading, upsert, remove } = useApprovalThresholds();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ doc_type: 'purchase_order', min_amount: 0, max_amount: null, approver_roles: ['manager'], approval_level: 1, is_active: true });

  const submit = async () => {
    await upsert.mutateAsync({ ...form, approver_roles: typeof form.approver_roles === 'string' ? form.approver_roles.split(',').map((s:string)=>s.trim()) : form.approver_roles });
    setOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" /> Approval Thresholds</h1>
          <p className="text-xs text-muted-foreground">Multi-level approval matrix by document type, amount, cost center & vendor category</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Threshold</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Approval Threshold</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Doc Type</Label>
                <Select value={form.doc_type} onValueChange={v => setForm({...form, doc_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Approval Level</Label><Input type="number" value={form.approval_level} onChange={e => setForm({...form, approval_level: +e.target.value})} /></div>
              <div><Label>Min Amount (SAR)</Label><Input type="number" value={form.min_amount} onChange={e => setForm({...form, min_amount: +e.target.value})} /></div>
              <div><Label>Max Amount (SAR)</Label><Input type="number" value={form.max_amount ?? ''} onChange={e => setForm({...form, max_amount: e.target.value === '' ? null : +e.target.value})} /></div>
              <div><Label>Cost Center (optional)</Label><Input value={form.cost_center_code || ''} onChange={e => setForm({...form, cost_center_code: e.target.value || null})} /></div>
              <div><Label>Vendor Category (optional)</Label><Input value={form.vendor_category || ''} onChange={e => setForm({...form, vendor_category: e.target.value || null})} /></div>
              <div className="col-span-2"><Label>Approver Roles (comma-separated)</Label><Input value={Array.isArray(form.approver_roles) ? form.approver_roles.join(',') : form.approver_roles} onChange={e => setForm({...form, approver_roles: e.target.value})} placeholder="manager,finance_lead" /></div>
            </div>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Approval Matrix</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !data?.length ? (
            <div className="text-center text-muted-foreground py-8">No thresholds yet. Add a rule to enforce multi-level approvals.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Doc Type</TableHead><TableHead>Level</TableHead>
                <TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead>
                <TableHead>Cost Ctr</TableHead><TableHead>Vendor Cat</TableHead>
                <TableHead>Roles</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.doc_type}</Badge></TableCell>
                    <TableCell>L{r.approval_level}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.min_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.max_amount ? Number(r.max_amount).toLocaleString() : '∞'}</TableCell>
                    <TableCell className="text-xs">{r.cost_center_code || '—'}</TableCell>
                    <TableCell className="text-xs">{r.vendor_category || '—'}</TableCell>
                    <TableCell className="text-xs">{(r.approver_roles || []).join(', ')}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
