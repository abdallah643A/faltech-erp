import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  useRetentionRules, useUpsertRetentionRule, useRetentionHolds,
} from "@/hooks/useGovernanceSuite";
import { Plus, Archive, Lock } from "lucide-react";

export default function RetentionRulesPage() {
  const { data: rules = [] } = useRetentionRules();
  const { data: holds = [] } = useRetentionHolds();
  const upsert = useUpsertRetentionRule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    rule_name: "",
    retention_period_years: 7,
    action_on_expiry: "archive",
    is_active: true,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Archive /> Retention & Legal Holds</h1>
          <p className="text-sm text-muted-foreground">Compliance-grade retention rules and legal hold management.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Rule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Retention Rules</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>On Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No rules</TableCell></TableRow>
              )}
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell className="text-xs">{r.document_type ?? "All"} {r.category ? `· ${r.category}` : ""}</TableCell>
                  <TableCell>{r.retention_period_years}y {r.retention_period_months ? `+${r.retention_period_months}m` : ""}</TableCell>
                  <TableCell><Badge variant="outline">{r.action_on_expiry}</Badge></TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Legal Holds</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holds.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active holds</TableCell></TableRow>
              )}
              {holds.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs font-mono">{h.document_id?.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant="outline">{h.hold_type}</Badge></TableCell>
                  <TableCell className="text-xs">{h.hold_reason}</TableCell>
                  <TableCell className="text-xs">{new Date(h.placed_at).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={h.is_active ? "destructive" : "secondary"}>{h.is_active ? "On Hold" : "Released"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Retention Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs">Rule name</label>
              <Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs">Arabic name</label>
              <Input value={form.rule_name_ar ?? ""} onChange={(e) => setForm({ ...form, rule_name_ar: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Document type</label>
              <Input value={form.document_type ?? ""} onChange={(e) => setForm({ ...form, document_type: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Category</label>
              <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Retention years</label>
              <Input type="number" value={form.retention_period_years} onChange={(e) => setForm({ ...form, retention_period_years: +e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Retention months</label>
              <Input type="number" value={form.retention_period_months ?? 0} onChange={(e) => setForm({ ...form, retention_period_months: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs">On expiry</label>
              <Select value={form.action_on_expiry} onValueChange={(v) => setForm({ ...form, action_on_expiry: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="review">Review required</SelectItem>
                  <SelectItem value="legal_hold">Legal hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs">Legal basis</label>
              <Input value={form.legal_basis ?? ""} onChange={(e) => setForm({ ...form, legal_basis: e.target.value })} placeholder="e.g. ZATCA Art. 66, GCC Tax Law…" />
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
