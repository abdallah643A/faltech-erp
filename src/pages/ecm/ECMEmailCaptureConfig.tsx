import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Plus, RefreshCw, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ECMEmailCaptureConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [polling, setPolling] = useState<string | null>(null);

  const empty = {
    config_name: "",
    imap_host: "",
    imap_port: 993,
    imap_username: "",
    imap_password_secret_name: "IMAP_PASSWORD",
    use_ssl: true,
    folder: "INBOX",
    is_enabled: true,
    poll_interval_minutes: 15,
    default_document_type: "ap_invoice",
  };
  const [form, setForm] = useState(empty);

  const { data: configs = [] } = useQuery({
    queryKey: ["imap-configs"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_email_imap_config" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("ecm_email_imap_config" as any).insert({ ...form, created_by: user?.id ?? null }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imap-configs"] });
      setOpen(false);
      setForm(empty);
      toast({ title: "IMAP config saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase.from("ecm_email_imap_config" as any).update({ is_enabled: enabled }).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["imap-configs"] }),
  });

  const triggerPoll = async (configId: string) => {
    setPolling(configId);
    try {
      const { data, error } = await supabase.functions.invoke("email-capture-poll", { body: { config_id: configId } });
      if (error) throw error;
      toast({ title: "Poll complete", description: `Inserted: ${data?.results?.[0]?.inserted ?? 0}` });
      qc.invalidateQueries({ queryKey: ["imap-configs"] });
    } catch (e) {
      toast({ title: "Poll failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setPolling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" />Email Capture Configuration</h1>
          <p className="text-muted-foreground">Connect IMAP mailboxes to automatically capture incoming emails as draft ERP records.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Mailbox</Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm space-y-1">
          <p>📬 Each mailbox is polled every <strong>15 minutes</strong> by default. The IMAP password must be stored as a backend secret named <code>IMAP_PASSWORD</code> (or override per config).</p>
          <p>🤖 Incoming emails are auto-classified by AI (vendor invoice, customer inquiry, etc.) and queued for review on <code>/email-document-capture</code>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Configured Mailboxes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last Polled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.config_name}</TableCell>
                  <TableCell className="text-sm">{c.imap_host}:{c.imap_port}</TableCell>
                  <TableCell className="text-sm">{c.imap_username}</TableCell>
                  <TableCell><Badge variant="outline">{c.folder}</Badge></TableCell>
                  <TableCell>
                    <Switch checked={c.is_enabled}
                      onCheckedChange={(v) => toggle.mutate({ id: c.id, enabled: v })} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.last_polled_at ? format(new Date(c.last_polled_at), "dd MMM HH:mm") : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => triggerPoll(c.id)} disabled={polling === c.id}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${polling === c.id ? "animate-spin" : ""}`} />
                      Poll Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No mailboxes configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add IMAP Mailbox</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Config Name</Label>
              <Input value={form.config_name} onChange={(e) => setForm({ ...form, config_name: e.target.value })} placeholder="AP Invoices Inbox" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>IMAP Host</Label>
                <Input value={form.imap_host} onChange={(e) => setForm({ ...form, imap_host: e.target.value })} placeholder="imap.gmail.com" />
              </div>
              <div>
                <Label>Port</Label>
                <Input type="number" value={form.imap_port} onChange={(e) => setForm({ ...form, imap_port: parseInt(e.target.value) || 993 })} />
              </div>
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.imap_username} onChange={(e) => setForm({ ...form, imap_username: e.target.value })} placeholder="invoices@company.com" />
            </div>
            <div>
              <Label>Password Secret Name</Label>
              <Input value={form.imap_password_secret_name}
                onChange={(e) => setForm({ ...form, imap_password_secret_name: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Name of the backend secret containing the IMAP password.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Folder</Label>
                <Input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Use SSL</Label>
                <Switch checked={form.use_ssl} onCheckedChange={(v) => setForm({ ...form, use_ssl: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.config_name || !form.imap_host || save.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
