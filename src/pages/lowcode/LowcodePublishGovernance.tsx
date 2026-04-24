import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePublishRequests, useDecidePublish } from "@/hooks/useLowcodeGovernance";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

export default function LowcodePublishGovernance() {
  const [status, setStatus] = useState("pending");
  const { data: requests = [], isLoading } = usePublishRequests(status);
  const decide = useDecidePublish();
  const [active, setActive] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");

  const handleDecide = async () => {
    if (!active) return;
    await decide.mutateAsync({ id: active.id, decision, notes });
    setActive(null);
    setNotes("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Builder Publish Governance</h1>
          <p className="text-sm text-muted-foreground">Review and approve form, report, dashboard, and workflow publish requests.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left px-4 py-2 font-medium">Requested</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Artifact</th>
                <th className="text-left px-4 py-2 font-medium">Version</th>
                <th className="text-left px-4 py-2 font-medium">Requester</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No requests</td></tr>
              ) : requests.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.requested_at).toLocaleString()}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{r.artifact_type}</Badge></td>
                  <td className="px-4 py-2 text-xs">{r.artifact_name || r.artifact_id}</td>
                  <td className="px-4 py-2 text-xs">{r.from_version ?? '—'} → {r.to_version ?? '—'}</td>
                  <td className="px-4 py-2 text-xs">{r.requested_by_name || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="default" onClick={() => { setActive(r); setDecision('approved'); }}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setActive(r); setDecision('rejected'); }}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'approved' ? 'Approve' : 'Reject'} publish request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {active?.artifact_type} · {active?.artifact_name || active?.artifact_id} · v{active?.to_version}
            </p>
            <Textarea placeholder="Decision notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={handleDecide} disabled={decide.isPending}>
              Confirm {decision}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
