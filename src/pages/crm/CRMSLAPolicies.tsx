import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSLAPolicies, useUpsertSLAPolicy } from "@/hooks/useCRMGovernance";
import { Plus, Timer } from "lucide-react";

export default function CRMSLAPolicies() {
  const { data: policies = [] } = useSLAPolicies();
  const upsert = useUpsertSLAPolicy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ policy_name: "", applies_to: "lead", first_response_minutes: 60, escalate_after_minutes: 120, priority_order: 100, is_active: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Timer className="h-5 w-5" /> SLA Policies</h1>
          <p className="text-sm text-muted-foreground">Response and escalation SLAs for inbound leads and cases.</p>
        </div>
        <Button onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New policy</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Policy</th>
            <th className="text-left px-4 py-2 font-medium">Applies to</th>
            <th className="text-left px-4 py-2 font-medium">Channel</th>
            <th className="text-left px-4 py-2 font-medium">Response (min)</th>
            <th className="text-left px-4 py-2 font-medium">Escalate (min)</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {policies.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No policies</td></tr>
              : policies.map((p:any) => (
              <tr key={p.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{p.policy_name}</td>
                <td className="px-4 py-2">{p.applies_to}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{p.source_channel || 'any'}</td>
                <td className="px-4 py-2">{p.first_response_minutes}</td>
                <td className="px-4 py-2">{p.escalate_after_minutes ?? '—'}</td>
                <td className="px-4 py-2">{p.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New SLA policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.policy_name} onChange={e=>setForm({...form, policy_name: e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Source channel (optional)</Label><Input placeholder="web/email/whatsapp/..." value={form.source_channel||''} onChange={e=>setForm({...form, source_channel: e.target.value || null})}/></div>
              <div><Label>Priority order</Label><Input type="number" value={form.priority_order} onChange={e=>setForm({...form, priority_order: Number(e.target.value)})}/></div>
              <div><Label>First response (min)</Label><Input type="number" value={form.first_response_minutes} onChange={e=>setForm({...form, first_response_minutes: Number(e.target.value)})}/></div>
              <div><Label>Escalate after (min)</Label><Input type="number" value={form.escalate_after_minutes} onChange={e=>setForm({...form, escalate_after_minutes: Number(e.target.value)})}/></div>
            </div>
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
