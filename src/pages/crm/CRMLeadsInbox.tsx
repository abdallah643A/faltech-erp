import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCRMLeads, useCreateLead, useScoreLead, useAssignLead,
  useCRMLeadActivities, useNextBestActions, useGenerateNBA, useCompleteNBA,
  type CRMLead,
} from "@/hooks/useCRMLeads";
import { Inbox, Plus, Sparkles, UserCheck, Mail, Phone, Globe, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const channelIcon = (c: string) => {
  if (c === "email") return <Mail className="h-3 w-3" />;
  if (c === "whatsapp") return <MessageSquare className="h-3 w-3" />;
  if (c.includes("phone") || c === "call") return <Phone className="h-3 w-3" />;
  if (c.includes("web")) return <Globe className="h-3 w-3" />;
  return <Inbox className="h-3 w-3" />;
};

const gradeColor = (g: string | null) =>
  g === "A" ? "bg-emerald-500" : g === "B" ? "bg-blue-500" : g === "C" ? "bg-amber-500" : "bg-muted";

export default function CRMLeadsInbox() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const { data: leads = [], isLoading } = useCRMLeads({
    status: statusFilter || undefined,
    channel: channelFilter || undefined,
  });
  const create = useCreateLead();
  const score = useScoreLead();
  const assign = useAssignLead();
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<CRMLead | null>(null);
  const [form, setForm] = useState<any>({ full_name: "", email: "", phone: "", company_name: "", channel: "manual", consent_email: true });

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    breached: leads.filter((l) => l.sla_breached).length,
    grade_a: leads.filter((l) => l.grade === "A").length,
  }), [leads]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-5 w-5" /> Leads Inbox</h1>
          <p className="text-sm text-muted-foreground">Omnichannel lead capture with hybrid scoring & SLA routing.</p>
        </div>
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> New lead</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">New</div><div className="text-2xl font-bold text-blue-600">{stats.new}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Grade A</div><div className="text-2xl font-bold text-emerald-600">{stats.grade_a}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">SLA breached</div><div className="text-2xl font-bold text-destructive">{stats.breached}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="working">Working</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="disqualified">Disqualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Channel</Label>
          <Select value={channelFilter || "all"} onValueChange={(v) => setChannelFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="web_form">Web form</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="meta_lead_ad">Meta Lead Ad</SelectItem>
              <SelectItem value="linkedin_lead_gen">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left px-4 py-2 font-medium">Lead</th>
              <th className="text-left px-4 py-2 font-medium">Channel</th>
              <th className="text-left px-4 py-2 font-medium">Score</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">SLA</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No leads</td></tr>
            ) : leads.map((l) => {
              const slaDue = l.sla_first_response_due ? new Date(l.sla_first_response_due) : null;
              const overdue = slaDue && slaDue < new Date();
              return (
                <tr key={l.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(l)}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{l.full_name}</div>
                    <div className="text-xs text-muted-foreground">{l.company_name || l.email || l.phone}</div>
                  </td>
                  <td className="px-4 py-2"><Badge variant="outline" className="gap-1">{channelIcon(l.channel)} {l.channel}</Badge></td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${gradeColor(l.grade)}`}>{l.grade ?? "?"}</span>
                      <span className="font-mono">{l.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2"><Badge variant={l.status === "new" ? "default" : "secondary"}>{l.status}</Badge></td>
                  <td className="px-4 py-2">
                    {slaDue ? (
                      <span className={overdue ? "text-destructive flex items-center gap-1" : "text-muted-foreground"}>
                        {overdue && <AlertTriangle className="h-3 w-3" />}
                        {formatDistanceToNow(slaDue, { addSuffix: true })}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); score.mutate(l.id); }}>
                      <Sparkles className="h-3 w-3 mr-1" /> Score
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); assign.mutate(l.id); }}>
                      <UserCheck className="h-3 w-3 mr-1" /> Route
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent></Card>

      {/* New lead */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="web_form">Web form</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button disabled={create.isPending} onClick={async () => {
              await create.mutateAsync({
                name: form.full_name, email: form.email, phone: form.phone,
                company: form.company_name, channel: form.channel,
                consent_email: form.consent_email,
              });
              setOpenNew(false);
              setForm({ full_name: "", email: "", phone: "", company_name: "", channel: "manual", consent_email: true });
            }}>Capture</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function LeadDrawer({ lead, onClose }: { lead: CRMLead | null; onClose: () => void }) {
  const { data: activities = [] } = useCRMLeadActivities(lead?.id);
  const { data: nbas = [] } = useNextBestActions("lead", lead?.id);
  const generate = useGenerateNBA();
  const complete = useCompleteNBA();

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{lead?.full_name}</SheetTitle></SheetHeader>
        {lead && (
          <Tabs defaultValue="nba" className="mt-4">
            <TabsList>
              <TabsTrigger value="nba">Next best actions</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="nba" className="space-y-3">
              <Button size="sm" disabled={generate.isPending} onClick={() => generate.mutate({ entity_type: "lead", entity_id: lead.id })}>
                <Sparkles className="h-3 w-3 mr-1" /> Generate AI recommendations
              </Button>
              {nbas.length === 0 ? <p className="text-sm text-muted-foreground">No open recommendations.</p> :
                nbas.map((n) => (
                  <Card key={n.id}><CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{n.title}</div>
                        <div className="text-xs text-muted-foreground">{n.rationale}</div>
                      </div>
                      <Badge variant={n.priority === "urgent" || n.priority === "high" ? "destructive" : "secondary"}>{n.priority}</Badge>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="outline" onClick={() => complete.mutate({ id: n.id, status: "done" })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => complete.mutate({ id: n.id, status: "dismissed" })}>Dismiss</Button>
                    </div>
                  </CardContent></Card>
                ))
              }
            </TabsContent>
            <TabsContent value="timeline" className="space-y-2">
              {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> :
                activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-primary/30 pl-3 py-1">
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })} · {a.activity_type}</div>
                    <div className="text-sm font-medium">{a.subject}</div>
                    {a.body && <div className="text-xs text-muted-foreground">{a.body}</div>}
                  </div>
                ))
              }
            </TabsContent>
            <TabsContent value="details" className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {lead.email || "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {lead.phone || "—"}</div>
              <div><span className="text-muted-foreground">Company:</span> {lead.company_name || "—"}</div>
              <div><span className="text-muted-foreground">Channel:</span> {lead.channel}</div>
              <div><span className="text-muted-foreground">Source:</span> {lead.source || "—"}</div>
              <div><span className="text-muted-foreground">Score:</span> {lead.score} ({lead.grade ?? "n/a"})</div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
