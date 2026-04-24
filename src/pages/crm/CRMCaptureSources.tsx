import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCaptureSources, useUpsertCaptureSource, useCaptureLog } from "@/hooks/useCRMGovernance";
import { Plus, Inbox, Copy } from "lucide-react";
import { toast } from "sonner";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;

export default function CRMCaptureSources() {
  const { data: sources = [] } = useCaptureSources();
  const { data: logs = [] } = useCaptureLog();
  const upsert = useUpsertCaptureSource();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ source_name: "", channel: "web", config: {}, webhook_secret: "", is_active: true });

  const webhookUrl = (s: any) => s.channel === 'web'
    ? `${PROJECT_URL}/functions/v1/crm-capture-lead`
    : `${PROJECT_URL}/functions/v1/crm-social-webhook?provider=${s.channel === 'meta_lead_ad' ? 'meta' : s.channel === 'linkedin_lead_gen' ? 'linkedin' : 'generic'}&source_id=${s.id}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-5 w-5" /> Capture Sources</h1>
          <p className="text-sm text-muted-foreground">Web forms, email, WhatsApp, Meta Lead Ads, LinkedIn Lead Gen.</p>
        </div>
        <Button onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New source</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Name</th>
            <th className="text-left px-4 py-2 font-medium">Channel</th>
            <th className="text-left px-4 py-2 font-medium">Total</th>
            <th className="text-left px-4 py-2 font-medium">Webhook</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {sources.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No sources</td></tr>
              : sources.map((s:any) => (
              <tr key={s.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{s.source_name}</td>
                <td className="px-4 py-2"><Badge variant="outline">{s.channel}</Badge></td>
                <td className="px-4 py-2">{s.total_received}</td>
                <td className="px-4 py-2">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(webhookUrl(s)); toast.success('URL copied'); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy URL
                  </Button>
                </td>
                <td className="px-4 py-2">{s.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-2 border-b font-medium text-sm">Recent capture log</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="border-b">
              <th className="text-left px-4 py-2 font-medium">When</th>
              <th className="text-left px-4 py-2 font-medium">Channel</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Result</th>
            </tr></thead>
            <tbody>
              {logs.slice(0,30).map((l:any) => (
                <tr key={l.id} className="border-b">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{l.channel}</td>
                  <td className="px-4 py-2"><Badge variant={l.status==='processed'?'default':l.status==='failed'?'destructive':'secondary'}>{l.status}</Badge></td>
                  <td className="px-4 py-2 font-mono text-xs">{l.resulting_partner_id?.slice(0,8) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New capture source</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.source_name} onChange={e=>setForm({...form, source_name: e.target.value})}/></div>
            <div><Label>Channel</Label>
              <Select value={form.channel} onValueChange={v=>setForm({...form, channel: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web form</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="meta_lead_ad">Meta Lead Ads</SelectItem>
                  <SelectItem value="linkedin_lead_gen">LinkedIn Lead Gen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Webhook secret (optional)</Label><Input value={form.webhook_secret} onChange={e=>setForm({...form, webhook_secret: e.target.value})}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={async()=>{await upsert.mutateAsync(form); setOpen(false);}} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
