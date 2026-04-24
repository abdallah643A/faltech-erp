import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useSLARules, useUpsertSLARule } from "@/hooks/useCRMLeads";
import { Plus, Timer } from "lucide-react";

const empty = {
  rule_name: "", is_active: true, priority: 100,
  channel: "", source: "", min_score: null,
  routing_strategy: "round_robin", specific_user_id: "", eligible_user_ids: [] as string[],
  first_response_minutes: 60, qualification_hours: 48,
};

export default function CRMSLARules() {
  const { data: rules = [] } = useSLARules();
  const upsert = useUpsertSLARule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const save = async () => {
    const payload = { ...form };
    if (!payload.channel) delete payload.channel;
    if (!payload.source) delete payload.source;
    if (!payload.min_score) delete payload.min_score;
    if (!payload.specific_user_id) delete payload.specific_user_id;
    if (typeof payload.eligible_user_ids === "string") {
      payload.eligible_user_ids = payload.eligible_user_ids.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    await upsert.mutateAsync(payload);
    setOpen(false); setForm(empty);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Timer className="h-5 w-5" /> SLA & Assignment Rules</h1>
          <p className="text-sm text-muted-foreground">Route leads automatically and enforce first-response SLAs.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New rule</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Priority</th>
            <th className="text-left px-4 py-2 font-medium">Rule</th>
            <th className="text-left px-4 py-2 font-medium">Match</th>
            <th className="text-left px-4 py-2 font-medium">Routing</th>
            <th className="text-left px-4 py-2 font-medium">SLA</th>
            <th className="text-left px-4 py-2 font-medium">Active</th>
          </tr></thead>
          <tbody>
            {rules.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No rules</td></tr>
              : rules.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 font-mono">{r.priority}</td>
                <td className="px-4 py-2 font-medium">{r.rule_name}</td>
                <td className="px-4 py-2 text-xs">
                  {r.channel ? <Badge variant="outline" className="mr-1">channel={r.channel}</Badge> : null}
                  {r.source ? <Badge variant="outline" className="mr-1">source={r.source}</Badge> : null}
                  {r.min_score ? <Badge variant="outline">score≥{r.min_score}</Badge> : null}
                  {!r.channel && !r.source && !r.min_score && <span className="text-muted-foreground">any</span>}
                </td>
                <td className="px-4 py-2"><Badge>{r.routing_strategy}</Badge></td>
                <td className="px-4 py-2 text-xs">{r.first_response_minutes}m / {r.qualification_hours}h</td>
                <td className="px-4 py-2">{r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New SLA rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Channel</Label>
                <Select value={form.channel || "any"} onValueChange={(v) => setForm({ ...form, channel: v === "any" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="web_form">Web form</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Source</Label><Input placeholder="any" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <div><Label>Min score</Label><Input type="number" value={form.min_score ?? ""} onChange={(e) => setForm({ ...form, min_score: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Routing</Label>
                <Select value={form.routing_strategy} onValueChange={(v) => setForm({ ...form, routing_strategy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round robin</SelectItem>
                    <SelectItem value="load_balanced">Load balanced</SelectItem>
                    <SelectItem value="owner_of_territory">Territory owner</SelectItem>
                    <SelectItem value="specific_user">Specific user</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.routing_strategy === "specific_user" ? (
                <div><Label>User ID</Label><Input value={form.specific_user_id} onChange={(e) => setForm({ ...form, specific_user_id: e.target.value })} /></div>
              ) : (
                <div><Label>Eligible user IDs (csv)</Label><Input value={Array.isArray(form.eligible_user_ids) ? form.eligible_user_ids.join(",") : form.eligible_user_ids} onChange={(e) => setForm({ ...form, eligible_user_ids: e.target.value })} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>First-response SLA (min)</Label><Input type="number" value={form.first_response_minutes} onChange={(e) => setForm({ ...form, first_response_minutes: Number(e.target.value) })} /></div>
              <div><Label>Qualification SLA (hours)</Label><Input type="number" value={form.qualification_hours} onChange={(e) => setForm({ ...form, qualification_hours: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={upsert.isPending} onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
