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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useTaskInbox, useInboxStats, useCompleteTask, useDelegateTask,
  useEscalateTask, useMarkSlaBreaches,
} from "@/hooks/useGovernanceSuite";
import {
  Inbox, AlertTriangle, CheckCircle2, Clock, Zap, RefreshCw, Send, ArrowUpCircle,
} from "lucide-react";
import { format } from "date-fns";

const priorityColor: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  normal: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};
const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  completed: "bg-green-500/15 text-green-700 dark:text-green-300",
  escalated: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  delegated: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  expired: "bg-destructive/15 text-destructive",
};

export default function TaskInboxPage() {
  const [filters, setFilters] = useState<any>({ onlyMine: true, status: "pending" });
  const { data: tasks = [], isLoading } = useTaskInbox(filters);
  const { data: stats } = useInboxStats();
  const complete = useCompleteTask();
  const delegate = useDelegateTask();
  const escalate = useEscalateTask();
  const breaches = useMarkSlaBreaches();

  const [actionTask, setActionTask] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "delegate" | "escalate" | null>(null);
  const [comment, setComment] = useState("");
  const [targetUser, setTargetUser] = useState("");

  const submit = async () => {
    if (!actionTask || !actionType) return;
    if (actionType === "approve")
      await complete.mutateAsync({ id: actionTask.id, action: "approved", comment });
    if (actionType === "reject")
      await complete.mutateAsync({ id: actionTask.id, action: "rejected", comment });
    if (actionType === "delegate")
      await delegate.mutateAsync({ id: actionTask.id, toUserId: targetUser });
    if (actionType === "escalate")
      await escalate.mutateAsync({ id: actionTask.id, toUserId: targetUser, reason: comment });
    setActionTask(null);
    setActionType(null);
    setComment("");
    setTargetUser("");
  };

  const kpis = [
    { label: "Pending", value: stats?.pending ?? 0, icon: Inbox, color: "text-yellow-600" },
    { label: "Due Today", value: stats?.dueToday ?? 0, icon: Clock, color: "text-orange-600" },
    { label: "SLA Breached", value: stats?.breached ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Urgent", value: stats?.urgent ?? 0, icon: Zap, color: "text-red-600" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Unified inbox: approvals, reviews, signatures, action items.
          </p>
        </div>
        <Button variant="outline" onClick={() => breaches.mutate()} disabled={breaches.isPending}>
          <RefreshCw className="w-4 h-4 mr-2" /> Re-check SLA breaches
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-bold">{k.value}</div>
              </div>
              <k.icon className={`w-6 h-6 ${k.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Tasks</CardTitle>
          <div className="flex gap-2">
            <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="delegated">Delegated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority ?? "all"} onValueChange={(v) => setFilters({ ...filters, priority: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={filters.onlyMine ? "default" : "outline"}
              onClick={() => setFilters({ ...filters, onlyMine: !filters.onlyMine })}
            >
              Mine only
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!isLoading && tasks.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tasks</TableCell></TableRow>
              )}
              {tasks.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.title}
                    {t.sla_breached && (
                      <Badge variant="destructive" className="ml-2">SLA</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{t.task_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.entity_type}{t.entity_reference ? ` · ${t.entity_reference}` : ""}
                  </TableCell>
                  <TableCell><Badge className={priorityColor[t.priority]}>{t.priority}</Badge></TableCell>
                  <TableCell><Badge className={statusColor[t.status]}>{t.status}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {t.due_at ? format(new Date(t.due_at), "MMM dd, HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {t.status === "pending" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => { setActionTask(t); setActionType("approve"); }}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => { setActionTask(t); setActionType("reject"); }}>Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setActionTask(t); setActionType("delegate"); }}><Send className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setActionTask(t); setActionType("escalate"); }}><ArrowUpCircle className="w-3 h-3" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!actionTask} onOpenChange={(o) => !o && setActionTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve task"}
              {actionType === "reject" && "Reject task"}
              {actionType === "delegate" && "Delegate task"}
              {actionType === "escalate" && "Escalate task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{actionTask?.title}</div>
            {(actionType === "delegate" || actionType === "escalate") && (
              <div>
                <label className="text-xs">Target user ID</label>
                <Input value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="UUID" />
              </div>
            )}
            <div>
              <label className="text-xs">{actionType === "approve" ? "Comment (optional)" : "Reason"}</label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTask(null)}>Cancel</Button>
            <Button onClick={submit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
