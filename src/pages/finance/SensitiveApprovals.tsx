import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApprovalPolicies, useApprovalRequests } from '@/hooks/useFinanceEnhanced';
import { ShieldCheck, Plus, Check, X } from 'lucide-react';

export default function SensitiveApprovals() {
  const { data: policies, upsert, remove } = useApprovalPolicies();
  const { data: requests, approveLevel, reject } = useApprovalRequests();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    policy_name: '', document_type: 'journal_entry', threshold_amount: 50000, currency: 'SAR',
    approval_levels: 1, level_1_role: 'controller', level_2_role: '', level_3_role: '', is_active: true,
  });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Sensitive Transaction Approvals</h1>
        <p className="text-muted-foreground">Multi-level approval chains for high-value or restricted postings</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Pending Requests ({requests.filter((r: any) => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="policies">Approval Policies ({policies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Doc</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {requests.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No requests</TableCell></TableRow> :
                    requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.document_number || r.document_id?.slice(0, 8)}</TableCell>
                        <TableCell>{r.document_type}</TableCell>
                        <TableCell>{Number(r.total_amount).toLocaleString()} {r.currency}</TableCell>
                        <TableCell>{r.current_level}/{r.required_levels}</TableCell>
                        <TableCell><Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{r.requested_by_name}</TableCell>
                        <TableCell className="space-x-1">
                          {r.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => approveLevel.mutate({ id: r.id, level: r.current_level })}><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <div className="flex justify-end mb-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Policy</Button></DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Approval Policy</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Policy Name *</Label><Input value={form.policy_name} onChange={e => setForm({ ...form, policy_name: e.target.value })} /></div>
                  <div><Label>Document Type</Label>
                    <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="journal_entry">Journal Entry</SelectItem>
                        <SelectItem value="cash_journal">Cash Journal</SelectItem>
                        <SelectItem value="adjusting_entry">Adjusting Entry</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Threshold</Label><Input type="number" value={form.threshold_amount} onChange={e => setForm({ ...form, threshold_amount: +e.target.value })} /></div>
                  <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
                  <div><Label>Levels</Label>
                    <Select value={String(form.approval_levels)} onValueChange={v => setForm({ ...form, approval_levels: +v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>L1 Role</Label><Input value={form.level_1_role} onChange={e => setForm({ ...form, level_1_role: e.target.value })} /></div>
                  {form.approval_levels >= 2 && <div><Label>L2 Role</Label><Input value={form.level_2_role} onChange={e => setForm({ ...form, level_2_role: e.target.value })} /></div>}
                  {form.approval_levels >= 3 && <div><Label>L3 Role</Label><Input value={form.level_3_role} onChange={e => setForm({ ...form, level_3_role: e.target.value })} /></div>}
                </div>
                <DialogFooter><Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Policy</TableHead><TableHead>Doc Type</TableHead><TableHead>Threshold</TableHead>
                <TableHead>Levels</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {policies.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.policy_name}</TableCell>
                    <TableCell>{p.document_type}</TableCell>
                    <TableCell>{Number(p.threshold_amount).toLocaleString()} {p.currency}</TableCell>
                    <TableCell>{p.approval_levels} ({[p.level_1_role, p.level_2_role, p.level_3_role].filter(Boolean).join(' → ')})</TableCell>
                    <TableCell>{p.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>Delete</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <Label>Reason</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (rejectId) reject.mutate({ id: rejectId, reason }); setRejectId(null); setReason(''); }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
