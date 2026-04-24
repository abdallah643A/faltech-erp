import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, MessageSquare, ArrowUpCircle, CheckCircle2, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useDisputes, useDisputeMessages, useDisputeActions } from '@/hooks/useSupplierPortalEnhanced';

const statusColor = (s: string) => ({
  open: 'bg-blue-500/10 text-blue-500',
  in_review: 'bg-yellow-500/10 text-yellow-500',
  awaiting_supplier: 'bg-purple-500/10 text-purple-500',
  resolved: 'bg-green-500/10 text-green-500',
  escalated: 'bg-red-500/10 text-red-500',
  closed: 'bg-gray-500/10 text-gray-500',
}[s] || 'bg-gray-500/10');

export default function SupplierDisputes() {
  const { data: disputes = [] } = useDisputes();
  const { create, reply, updateStatus, escalate } = useDisputeActions();
  const [selected, setSelected] = useState<any | null>(null);
  const { data: messages = [] } = useDisputeMessages(selected?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [newD, setNewD] = useState({ entity_type: 'po', entity_reference: '', subject: '', description: '', priority: 'normal', sla_hours: 48, vendor_name: '' });
  const [replyText, setReplyText] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Disputes</h2>
          <p className="text-sm text-muted-foreground">Threaded disputes with SLA tracking and escalation</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><AlertTriangle className="h-4 w-4 mr-2" />Open Dispute</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Entity</TableHead><TableHead>Subject</TableHead><TableHead>Priority</TableHead><TableHead>SLA</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {disputes.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No disputes</TableCell></TableRow> :
                disputes.map((d: any) => {
                  const overdue = d.sla_due_at && isPast(new Date(d.sla_due_at)) && !['resolved', 'closed'].includes(d.status);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.vendor_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{d.entity_type?.toUpperCase()}</Badge> {d.entity_reference}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{d.subject}</TableCell>
                      <TableCell><Badge variant="outline">{d.priority}</Badge></TableCell>
                      <TableCell className={overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {d.sla_due_at ? formatDistanceToNow(new Date(d.sla_due_at), { addSuffix: true }) : '-'}
                      </TableCell>
                      <TableCell><Badge className={statusColor(d.status)}>{d.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'dd MMM')}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(d)}>Open</Button></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open New Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entity Type</Label>
                <Select value={newD.entity_type} onValueChange={v => setNewD(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="po">PO</SelectItem><SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="rfq">RFQ</SelectItem><SelectItem value="grpo">GRPO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Entity Reference</Label><Input value={newD.entity_reference} onChange={e => setNewD(p => ({ ...p, entity_reference: e.target.value }))} /></div>
            </div>
            <div><Label>Vendor name</Label><Input value={newD.vendor_name} onChange={e => setNewD(p => ({ ...p, vendor_name: e.target.value }))} /></div>
            <div><Label>Subject</Label><Input value={newD.subject} onChange={e => setNewD(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={newD.description} onChange={e => setNewD(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={newD.priority} onValueChange={v => setNewD(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>SLA (hours)</Label><Input type="number" value={newD.sla_hours} onChange={e => setNewD(p => ({ ...p, sla_hours: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await create.mutateAsync(newD); setCreateOpen(false); setNewD({ entity_type: 'po', entity_reference: '', subject: '', description: '', priority: 'normal', sla_hours: 48, vendor_name: '' }); }}>Open Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={statusColor(selected.status)}>{selected.status}</Badge>
                <Badge variant="outline">{selected.entity_type?.toUpperCase()} {selected.entity_reference}</Badge>
                <Badge variant="outline">SLA: {selected.sla_hours}h</Badge>
              </div>
              <p className="text-sm">{selected.description}</p>
              <div className="border-t pt-3 space-y-2 max-h-72 overflow-y-auto">
                {messages.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p> :
                  messages.map((m: any) => (
                    <div key={m.id} className={`p-2 rounded ${m.sender_type === 'buyer' ? 'bg-primary/10 ml-8' : m.sender_type === 'system' ? 'bg-muted text-xs italic' : 'bg-muted mr-8'}`}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{m.sender_name || m.sender_type}</span>
                        <span className="text-muted-foreground">{format(new Date(m.created_at), 'dd MMM HH:mm')}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))}
              </div>
              <div className="border-t pt-3 space-y-2">
                <Textarea placeholder="Reply as buyer..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} />
                <Button size="sm" onClick={async () => { await reply.mutateAsync({ dispute_id: selected.id, sender_type: 'buyer', sender_name: 'Buyer', message: replyText }); setReplyText(''); }} disabled={!replyText.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />Send Reply
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => selected && escalate.mutate({ id: selected.id })}><ArrowUpCircle className="h-4 w-4 mr-2" />Escalate</Button>
            <Button variant="outline" onClick={() => selected && updateStatus.mutate({ id: selected.id, status: 'awaiting_supplier' })}>Awaiting Supplier</Button>
            <Button className="bg-green-600" onClick={() => selected && updateStatus.mutate({ id: selected.id, status: 'resolved' })}><CheckCircle2 className="h-4 w-4 mr-2" />Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
