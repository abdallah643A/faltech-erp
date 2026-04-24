import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Send, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyESSRequests, useMSSPendingApprovals, useDecideESSRequest } from "@/hooks/useHRLifecycle";
import { format } from "date-fns";

export default function HRSelfServicePage() {
  const { user } = useAuth();
  const { data: my = [] } = useMyESSRequests(user?.id);
  const { data: pending = [] } = useMSSPendingApprovals(user?.id);
  const decide = useDecideESSRequest();

  return (
    <div className="page-enter p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" /> Employee & Manager Self-Service
      </h1>

      <Tabs defaultValue="ess">
        <TabsList>
          <TabsTrigger value="ess" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> My Requests ({my.length})</TabsTrigger>
          <TabsTrigger value="mss" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Pending My Approval ({pending.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ess" className="space-y-2 mt-3">
          {my.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No requests yet</CardContent></Card>}
          {my.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.request_type.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.request_number ?? r.id.slice(0,8)} · {format(new Date(r.submitted_at ?? r.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mss" className="space-y-2 mt-3">
          {pending.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">All caught up</CardContent></Card>}
          {pending.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {r.request_type.replace(/_/g, " ")} —{" "}
                    {r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(r.submitted_at ?? r.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, decision: "approved" })}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}>
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
