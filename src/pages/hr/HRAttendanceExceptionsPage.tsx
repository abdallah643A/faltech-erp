import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, X } from "lucide-react";
import { useAttendanceExceptions, useResolveException } from "@/hooks/useHRLifecycle";
import { format } from "date-fns";

export default function HRAttendanceExceptionsPage() {
  const { data: pending = [] } = useAttendanceExceptions("pending");
  const { data: all = [] } = useAttendanceExceptions();
  const resolve = useResolveException();

  return (
    <div className="page-enter p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" /> Attendance Exceptions
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pending" value={pending.length} tone="warn" />
        <Kpi label="Approved" value={all.filter((e: any) => e.status === 'approved').length} />
        <Kpi label="Rejected" value={all.filter((e: any) => e.status === 'rejected').length} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Resolution</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead>
              <TableHead>Reason</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pending.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No pending exceptions</TableCell></TableRow>
              )}
              {pending.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell>{ex.employees ? `${ex.employees.first_name} ${ex.employees.last_name}` : "—"}</TableCell>
                  <TableCell>{format(new Date(ex.exception_date), "MMM d, yyyy")}</TableCell>
                  <TableCell><Badge variant="outline">{ex.exception_type}</Badge></TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{ex.reason}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: ex.id, status: "approved" })}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: ex.id, status: "rejected" })}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const Kpi = ({ label, value, tone }: { label: string; value: number; tone?: "warn" }) => (
  <Card><CardContent className="p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-2xl font-semibold ${tone === "warn" ? "text-warning" : ""}`}>{value}</p>
  </CardContent></Card>
);
