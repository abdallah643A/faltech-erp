import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useDisputes, useDisputeMessages, useDisputeActions } from '@/hooks/useSupplierPortalEnhanced';

export default function SupplierPortalDisputes({ account }: { account: any }) {
  const { data: disputes = [] } = useDisputes({ portal_account_id: account.id });
  const { create, reply } = useDisputeActions();
  const [selected, setSelected] = useState<any | null>(null);
  const { data: messages = [] } = useDisputeMessages(selected?.id);
  const [openNew, setOpenNew] = useState(false);
  const [newD, setNewD] = useState({ entity_type: 'po', entity_reference: '', subject: '', description: '', priority: 'normal' });
  const [replyText, setReplyText] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My Disputes</h2>
        <Button onClick={() => setOpenNew(true)}><AlertTriangle className="h-4 w-4 mr-2" />Raise Dispute</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>SLA</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {disputes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No disputes</TableCell></TableRow> :
                disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">{d.entity_type?.toUpperCase()}</Badge> {d.entity_reference}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.subject}</TableCell>
                    <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.sla_due_at && formatDistanceToNow(new Date(d.sla_due_at), { addSuffix: true })}</TableCell>
                    <TableCell className="text-xs">{format(new Date(d.created_at), 'dd MMM')}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(d)}>Open</Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise New Dispute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={newD.entity_type} onValueChange={v => setNewD(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="po">Purchase Order</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="rfq">RFQ</SelectItem>
                    <SelectItem value="grpo">GRPO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={newD.entity_reference} onChange={e => setNewD(p => ({ ...p, entity_reference: e.target.value }))} /></div>
            </div>
            <div><Label>Subject</Label><Input value={newD.subject} onChange={e => setNewD(p => ({ ...p, subject: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={newD.description} onChange={e => setNewD(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button onClick={async () => {
              await create.mutateAsync({
                ...newD, vendor_name: account.contact_name, vendor_id: account.vendor_id,
                portal_account_id: account.id, company_id: account.company_id,
              });
              setOpenNew(false); setNewD({ entity_type: 'po', entity_reference: '', subject: '', description: '', priority: 'normal' });
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="outline">{selected.status}</Badge>
                <Badge variant="outline">{selected.entity_type?.toUpperCase()} {selected.entity_reference}</Badge>
              </div>
              <p className="text-sm">{selected.description}</p>
              <div className="border-t pt-2 space-y-2 max-h-64 overflow-y-auto">
                {messages.map((m: any) => (
                  <div key={m.id} className={`p-2 rounded ${m.sender_type === 'supplier' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                    <div className="flex justify-between text-xs mb-1"><span className="font-medium">{m.sender_name}</span><span className="text-muted-foreground">{format(new Date(m.created_at), 'dd MMM HH:mm')}</span></div>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
              </div>
              <Textarea placeholder="Type your reply..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} />
              <Button size="sm" onClick={async () => { await reply.mutateAsync({ dispute_id: selected.id, sender_type: 'supplier', sender_name: account.contact_name, message: replyText }); setReplyText(''); }} disabled={!replyText.trim()}>
                <MessageSquare className="h-4 w-4 mr-2" />Send
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
