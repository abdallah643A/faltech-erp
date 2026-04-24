import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePartnerReferrals, useUpsertPartnerReferral } from "@/hooks/useCRMLeads";
import { Handshake, Plus } from "lucide-react";

const empty = { partner_name: "", partner_contact_email: "", referral_code: "", commission_pct: 5, status: "submitted", notes: "" };

export default function CRMPartnerReferrals() {
  const { data: refs = [] } = usePartnerReferrals();
  const upsert = useUpsertPartnerReferral();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="h-5 w-5" /> Partner Referrals</h1>
          <p className="text-sm text-muted-foreground">Track partner-sourced leads & opportunities with commission management.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New referral</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Partner</th>
            <th className="text-left px-4 py-2 font-medium">Code</th>
            <th className="text-left px-4 py-2 font-medium">Linked</th>
            <th className="text-left px-4 py-2 font-medium">Commission</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {refs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No referrals</td></tr>
              : refs.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.partner_name}<div className="text-xs text-muted-foreground">{r.partner_contact_email}</div></td>
                  <td className="px-4 py-2 font-mono text-xs">{r.referral_code || "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.opportunities?.name ? <Badge variant="outline">Opp: {r.opportunities.name}</Badge> :
                     r.crm_leads?.full_name ? <Badge variant="outline">Lead: {r.crm_leads.full_name}</Badge> :
                     <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">{r.commission_pct}% / {Number(r.commission_amount).toLocaleString()}</td>
                  <td className="px-4 py-2"><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge></td>
                </tr>
              ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New partner referral</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Partner name</Label><Input value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Contact email</Label><Input type="email" value={form.partner_contact_email} onChange={(e) => setForm({ ...form, partner_contact_email: e.target.value })} /></div>
              <div><Label>Referral code</Label><Input value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Commission %</Label><Input type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={upsert.isPending} onClick={async () => { await upsert.mutateAsync(form); setOpen(false); setForm(empty); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
