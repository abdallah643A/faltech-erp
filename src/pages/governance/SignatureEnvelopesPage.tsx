import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useSignatureEnvelopes, useCreateEnvelope, useVoidEnvelope, useEnvelopeRecipients,
} from "@/hooks/useGovernanceSuite";
import { Plus, FileSignature, Trash2, Eye } from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  in_progress: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  completed: "bg-green-500/15 text-green-700 dark:text-green-300",
  declined: "bg-destructive/15 text-destructive",
  voided: "bg-secondary text-secondary-foreground",
  expired: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

export default function SignatureEnvelopesPage() {
  const { data: envelopes = [] } = useSignatureEnvelopes();
  const create = useCreateEnvelope();
  const voidEnv = useVoidEnvelope();

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const { data: recipients = [] } = useEnvelopeRecipients(viewing?.id);

  const [form, setForm] = useState<any>({
    envelope_name: "",
    signing_order: "parallel",
    recipients: [{ recipient_name: "", recipient_email: "", recipient_role: "signer" }],
  });

  const addRecipient = () =>
    setForm({
      ...form,
      recipients: [...form.recipients, { recipient_name: "", recipient_email: "", recipient_role: "signer" }],
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature /> E-Signature Envelopes</h1>
          <p className="text-sm text-muted-foreground">Generic envelope model: parallel/sequential signing with OTP & full audit.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Envelope</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Envelopes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envelopes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No envelopes</TableCell></TableRow>
              )}
              {envelopes.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.envelope_name}</TableCell>
                  <TableCell className="text-xs font-mono">{e.document_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{e.signing_order}</Badge></TableCell>
                  <TableCell><Badge className={statusColor[e.status]}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs">{e.expires_at ? new Date(e.expires_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(e)}><Eye className="w-3 h-3" /></Button>
                    {!["voided", "completed"].includes(e.status) && (
                      <Button size="sm" variant="ghost" onClick={() => voidEnv.mutate(e.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New envelope</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs">Envelope name</label>
              <Input value={form.envelope_name} onChange={(e) => setForm({ ...form, envelope_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Document ID</label>
              <Input value={form.document_id ?? ""} onChange={(e) => setForm({ ...form, document_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Signing order</label>
              <Select value={form.signing_order} onValueChange={(v) => setForm({ ...form, signing_order: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parallel">Parallel</SelectItem>
                  <SelectItem value="sequential">Sequential</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs">Expires at</label>
              <Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs">Message to signers</label>
              <Textarea value={form.message_to_signers ?? ""} onChange={(e) => setForm({ ...form, message_to_signers: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs">Recipients</label>
              {form.recipients.map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Name" value={r.recipient_name} onChange={(e) => {
                    const arr = [...form.recipients]; arr[i].recipient_name = e.target.value;
                    setForm({ ...form, recipients: arr });
                  }} />
                  <Input placeholder="Email" type="email" value={r.recipient_email} onChange={(e) => {
                    const arr = [...form.recipients]; arr[i].recipient_email = e.target.value;
                    setForm({ ...form, recipients: arr });
                  }} />
                  <Select value={r.recipient_role} onValueChange={(v) => {
                    const arr = [...form.recipients]; arr[i].recipient_role = v;
                    setForm({ ...form, recipients: arr });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signer">Signer</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="cc">CC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addRecipient}><Plus className="w-3 h-3 mr-1" /> Add recipient</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await create.mutateAsync(form);
              setOpen(false);
              setForm({ envelope_name: "", signing_order: "parallel", recipients: [{ recipient_name: "", recipient_email: "", recipient_role: "signer" }] });
            }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.envelope_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Cert hash: <span className="font-mono">{viewing?.certificate_hash?.slice(0, 32)}…</span></div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.recipient_order}</TableCell>
                    <TableCell>{r.recipient_name}</TableCell>
                    <TableCell className="text-xs">{r.recipient_email}</TableCell>
                    <TableCell><Badge variant="outline">{r.recipient_role}</Badge></TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
