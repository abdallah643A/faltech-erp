import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVariationRequests, useVRMessages, useVRActions } from "@/hooks/useSubcontractorPortal";
import { MessageSquare, Check, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function SubcontractorVariations() {
  const { data: vrs = [] } = useVariationRequests();
  const { reply, decide } = useVRActions();
  const [activeVR, setActiveVR] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const { data: messages = [] } = useVRMessages(activeVR?.id);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Variation Requests</h1>
        <p className="text-sm text-muted-foreground">Review VRs with cost/time impact, threaded clarifications, auto-link to PCN/Change Order.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{vrs.length} VR{vrs.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>VR #</TableHead><TableHead>Title</TableHead><TableHead>Cost Impact</TableHead>
              <TableHead>Time (d)</TableHead><TableHead>Status</TableHead><TableHead>Linked</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {vrs.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.vr_number ?? v.id.slice(0, 8)}</TableCell>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>{v.cost_impact?.toLocaleString()} {v.currency}</TableCell>
                  <TableCell>{v.time_impact_days}</TableCell>
                  <TableCell><Badge variant={v.status === "approved" ? "default" : v.status === "rejected" ? "destructive" : "secondary"}>{v.status}</Badge></TableCell>
                  <TableCell>{v.pcn_id ? <Badge variant="outline">PCN linked</Badge> : "—"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setActiveVR(v)}><MessageSquare className="h-4 w-4" /></Button>
                    {v.status === "submitted" && <>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: v.id, status: "approved" })}><Check className="h-4 w-4 text-success" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: v.id, status: "needs_info" })}><AlertCircle className="h-4 w-4 text-orange-500" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: v.id, status: "rejected" })}><X className="h-4 w-4 text-destructive" /></Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
              {vrs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No variation requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!activeVR} onOpenChange={() => setActiveVR(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{activeVR?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{activeVR?.description}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
              {messages.map((m: any) => (
                <div key={m.id} className="text-xs border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m.sender_role ?? "user"}</Badge>
                    <span className="font-medium">{m.sender_name ?? "—"}</span>
                    <span className="text-muted-foreground">{format(new Date(m.created_at), "MMM d HH:mm")}</span>
                  </div>
                  <p className="mt-1">{m.message}</p>
                </div>
              ))}
              {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>}
            </div>
            <Textarea placeholder="Reply..." value={msg} onChange={e => setMsg(e.target.value)} />
            <Button onClick={async () => { await reply.mutateAsync({ vr_id: activeVR.id, message: msg, sender_role: "engineer" }); setMsg(""); }} disabled={!msg.trim()}>Send</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
