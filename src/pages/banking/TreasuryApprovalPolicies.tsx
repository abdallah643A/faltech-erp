import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShieldCheck } from 'lucide-react';
import { useTreasApprovalPolicies } from '@/hooks/useTreasuryEnhanced';

export default function TreasuryApprovalPolicies() {
  const { data: policies = [], upsert } = useTreasApprovalPolicies();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ amount_min: 0, required_approvers: 1, approver_roles: ['treasury_manager'], requires_dual_control: false, requires_cfo: false, is_active: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Treasury Approval Policies</h1>
          <p className="text-muted-foreground">Tiered approvals by amount band, currency, and payment method (Saudi/GCC defaults)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Policy</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Amount Range</TableHead>
                <TableHead>Approvers</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.policy_name}</TableCell>
                  <TableCell>{p.payment_method || <span className="text-muted-foreground">any</span>}</TableCell>
                  <TableCell>{p.currency || <span className="text-muted-foreground">any</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{Number(p.amount_min).toLocaleString()} – {p.amount_max ? Number(p.amount_max).toLocaleString() : '∞'}</TableCell>
                  <TableCell><Badge>{p.required_approvers}</Badge></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{(p.approver_roles || []).map((r: string) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}</div></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.requires_dual_control && <Badge variant="secondary" className="text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Dual</Badge>}
                      {p.requires_cfo && <Badge variant="default" className="text-xs">CFO</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No policies defined</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Approval Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input value={draft.policy_name || ''} onChange={(e) => setDraft({ ...draft, policy_name: e.target.value })} /></div>
            <div><Label>Payment Method</Label><Input value={draft.payment_method || ''} onChange={(e) => setDraft({ ...draft, payment_method: e.target.value })} placeholder="wire/ach/sarie/mada" /></div>
            <div><Label>Currency</Label><Input value={draft.currency || ''} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} placeholder="SAR/USD/…" /></div>
            <div><Label>Amount Min</Label><Input type="number" value={draft.amount_min} onChange={(e) => setDraft({ ...draft, amount_min: Number(e.target.value) })} /></div>
            <div><Label>Amount Max</Label><Input type="number" value={draft.amount_max || ''} onChange={(e) => setDraft({ ...draft, amount_max: Number(e.target.value) || null })} /></div>
            <div><Label>Required Approvers</Label><Input type="number" value={draft.required_approvers} onChange={(e) => setDraft({ ...draft, required_approvers: Number(e.target.value) })} /></div>
            <div><Label>Roles (comma)</Label><Input value={(draft.approver_roles || []).join(',')} onChange={(e) => setDraft({ ...draft, approver_roles: e.target.value.split(',').map(s => s.trim()) })} /></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={draft.requires_dual_control} onCheckedChange={(v) => setDraft({ ...draft, requires_dual_control: v })} /><Label>Dual control</Label></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={draft.requires_cfo} onCheckedChange={(v) => setDraft({ ...draft, requires_cfo: v })} /><Label>Require CFO</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={upsert.isPending || !draft.policy_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
