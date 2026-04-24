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
import { useDelegations, useUpsertDelegation } from "@/hooks/useGovernanceSuite";
import { Plus, UserCheck } from "lucide-react";
import { format } from "date-fns";

export default function DelegationsPage() {
  const { data: rows = [] } = useDelegations();
  const upsert = useUpsertDelegation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    delegation_type: "temporary",
    scope: "all",
    is_active: true,
    starts_at: new Date().toISOString().slice(0, 16),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck /> Delegations & Substitutes</h1>
          <p className="text-sm text-muted-foreground">Temporarily reassign approvals during leave or vacation.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Delegation</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active & past delegations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegator</TableHead>
                <TableHead>Delegate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No delegations</TableCell></TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.delegator_name ?? r.delegator_id}</TableCell>
                  <TableCell>{r.delegate_name ?? r.delegate_id}</TableCell>
                  <TableCell><Badge variant="outline">{r.delegation_type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.scope}{r.scope_value ? ` (${r.scope_value})` : ""}</TableCell>
                  <TableCell className="text-xs">{format(new Date(r.starts_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-xs">{r.ends_at ? format(new Date(r.ends_at), "MMM dd, yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Delegation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs">Delegator user ID</label>
              <Input value={form.delegator_id ?? ""} onChange={(e) => setForm({ ...form, delegator_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Delegate user ID</label>
              <Input value={form.delegate_id ?? ""} onChange={(e) => setForm({ ...form, delegate_id: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Type</label>
              <Select value={form.delegation_type} onValueChange={(v) => setForm({ ...form, delegation_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs">Scope</label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="entity_type">Entity type</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs">Starts</label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Ends</label>
              <Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs">Reason</label>
              <Textarea value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(form); setOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
