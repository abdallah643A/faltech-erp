import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  useExternalShares, useCreateExternalShare, useRevokeShare,
} from "@/hooks/useGovernanceSuite";
import { Plus, Link as LinkIcon, Copy, Ban } from "lucide-react";
import { toast } from "sonner";

export default function ExternalSharesPage() {
  const { data: shares = [] } = useExternalShares();
  const create = useCreateExternalShare();
  const revoke = useRevokeShare();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    download_allowed: true,
    watermark_enabled: true,
  });

  const buildUrl = (token: string) =>
    `${window.location.origin}/share/${token}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LinkIcon /> Secure External Sharing</h1>
          <p className="text-sm text-muted-foreground">Signed links with expiry, password, view limits, and full audit log.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Share</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active & past shares</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Protection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No share links yet</TableCell></TableRow>
              )}
              {shares.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.recipient_name ?? s.recipient_email ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{s.document_id?.slice(0, 8) ?? s.entity_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{s.expires_at ? new Date(s.expires_at).toLocaleString() : "Never"}</TableCell>
                  <TableCell className="text-xs">{s.view_count}{s.max_views ? ` / ${s.max_views}` : ""}</TableCell>
                  <TableCell className="text-xs">
                    {s.password_hash ? <Badge variant="outline" className="me-1">🔒</Badge> : null}
                    {s.watermark_enabled ? <Badge variant="outline" className="me-1">WM</Badge> : null}
                    {!s.download_allowed ? <Badge variant="outline">View only</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_revoked ? "destructive" : "default"}>
                      {s.is_revoked ? "Revoked" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(buildUrl(s.share_token)); toast.success("Link copied"); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    {!s.is_revoked && (
                      <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>
                        <Ban className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New external share</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs">Document ID</label>
              <Input value={form.document_id ?? ""} onChange={(e) => setForm({ ...form, document_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Or entity type / id</label>
              <Input value={form.entity_type ?? ""} placeholder="entity_type" onChange={(e) => setForm({ ...form, entity_type: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Recipient name</label>
              <Input value={form.recipient_name ?? ""} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Recipient email</label>
              <Input type="email" value={form.recipient_email ?? ""} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Expires at</label>
              <Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Max views</label>
              <Input type="number" value={form.max_views ?? ""} onChange={(e) => setForm({ ...form, max_views: e.target.value ? +e.target.value : undefined })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs">Password (optional)</label>
              <Input type="password" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.download_allowed} onCheckedChange={(v) => setForm({ ...form, download_allowed: v })} />
              <span className="text-sm">Allow download</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.watermark_enabled} onCheckedChange={(v) => setForm({ ...form, watermark_enabled: v })} />
              <span className="text-sm">Watermark</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await create.mutateAsync(form);
              navigator.clipboard.writeText(buildUrl(r.share_token));
              toast.success("Share created — link copied");
              setOpen(false);
              setForm({ download_allowed: true, watermark_enabled: true });
            }}>Create & Copy Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
