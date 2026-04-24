import { useState } from "react";
import { useRetentionPolicies, useRetentionEligibleDocs, useToggleLegalHold } from "@/hooks/useECMRetention";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Plus, Lock, Unlock, AlertTriangle, FileWarning } from "lucide-react";
import { format } from "date-fns";

export default function ECMRetentionPolicies() {
  const { policies, upsertPolicy } = useRetentionPolicies();
  const { data: eligible = [] } = useRetentionEligibleDocs();
  const toggleHold = useToggleLegalHold();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [holdDialog, setHoldDialog] = useState<{ id: string; title: string } | null>(null);
  const [holdReason, setHoldReason] = useState("");

  const [form, setForm] = useState({
    policy_name: "",
    document_type: "general",
    retention_years: 7,
    action_on_expiry: "flag",
    legal_hold_default: false,
    is_active: true,
  });

  const save = async () => {
    if (!form.policy_name) return;
    await upsertPolicy.mutateAsync(form);
    setDialogOpen(false);
    setForm({ ...form, policy_name: "", retention_years: 7 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Retention Policies
          </h1>
          <p className="text-muted-foreground">
            Define retention periods and review documents eligible for archival or deletion (soft — flag only).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{policies.data?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Active Policies</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{eligible.length}</div>
            <div className="text-xs text-muted-foreground">Eligible for Action</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {eligible.filter((e) => e.days_overdue > 365).length}
            </div>
            <div className="text-xs text-muted-foreground">Overdue &gt; 1 Year</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Retention (yrs)</TableHead>
                <TableHead>Action on Expiry</TableHead>
                <TableHead>Legal Hold Default</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.policy_name}</TableCell>
                  <TableCell>{p.document_type ?? "All"}</TableCell>
                  <TableCell>{p.retention_years}</TableCell>
                  <TableCell><Badge variant="outline">{p.action_on_expiry}</Badge></TableCell>
                  <TableCell>{p.legal_hold_default ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {policies.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No policies defined yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-orange-600" />
            Documents Eligible for Retention Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Retention Until</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-sm">{d.title}</TableCell>
                  <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                  <TableCell className="text-sm">{d.policy_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {d.retention_until ? format(new Date(d.retention_until), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.days_overdue > 365 ? "destructive" : "secondary"}>
                      {d.days_overdue} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHoldDialog({ id: d.id, title: d.title });
                        setHoldReason("");
                      }}
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Apply Legal Hold
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {eligible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No documents eligible for retention action.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Retention Policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Policy Name</Label>
              <Input value={form.policy_name} onChange={(e) => setForm({ ...form, policy_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general", "ap_invoice", "contract", "hr", "tax", "audit"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Retention (years)</Label>
                <Input type="number" min={1} value={form.retention_years}
                  onChange={(e) => setForm({ ...form, retention_years: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div>
              <Label>Action on Expiry</Label>
              <Select value={form.action_on_expiry} onValueChange={(v) => setForm({ ...form, action_on_expiry: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flag">Flag for review</SelectItem>
                  <SelectItem value="archive">Suggest archive</SelectItem>
                  <SelectItem value="notify">Notify only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Apply Legal Hold by Default</Label>
              <Switch checked={form.legal_hold_default}
                onCheckedChange={(v) => setForm({ ...form, legal_hold_default: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.policy_name}>Save Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!holdDialog} onOpenChange={() => setHoldDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" /> Apply Legal Hold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Document: <strong>{holdDialog?.title}</strong>
            </p>
            <div>
              <Label>Reason for Hold</Label>
              <Input value={holdReason} onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g. ongoing litigation, audit request" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldDialog(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!holdDialog) return;
                await toggleHold.mutateAsync({ documentId: holdDialog.id, hold: true, reason: holdReason });
                setHoldDialog(null);
              }}
              disabled={!holdReason}
            >
              <Unlock className="h-4 w-4 mr-2" /> Apply Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
