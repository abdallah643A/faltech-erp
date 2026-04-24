import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubconTasks, useTaskMessages, useTaskActions } from "@/hooks/useSubcontractorPortal";
import { MessageSquare, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function SubcontractorTasks() {
  const { data: tasks = [] } = useSubconTasks();
  const { send, close } = useTaskActions();
  const [active, setActive] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const { data: messages = [] } = useTaskMessages(active?.id);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tasks & Messaging</h1>
        <p className="text-sm text-muted-foreground">RFI / NCR / Transmittal threads tied to CPMS records.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Priority</TableHead>
              <TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {tasks.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell><Badge variant="outline">{t.task_type}</Badge></TableCell>
                  <TableCell>{t.title}</TableCell>
                  <TableCell><Badge variant={t.priority === "high" ? "destructive" : "secondary"}>{t.priority}</Badge></TableCell>
                  <TableCell className="text-xs">{t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}</TableCell>
                  <TableCell><Badge variant={t.status === "closed" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setActive(t)}><MessageSquare className="h-4 w-4" /></Button>
                    {t.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => close.mutate(t.id)}><CheckCircle className="h-4 w-4 text-success" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No tasks</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{active?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{active?.description}</p>
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
            <Textarea placeholder="Write a message..." value={msg} onChange={e => setMsg(e.target.value)} />
            <Button onClick={async () => { await send.mutateAsync({ task_id: active.id, message: msg, sender_role: "engineer" }); setMsg(""); }} disabled={!msg.trim()}>Send</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
