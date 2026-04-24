import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, History, Lock, CheckCircle2, Send } from "lucide-react";
import { format } from "date-fns";
import { usePayrollRuns, usePayrollAuditLog, useUpdatePayrollStatus } from "@/hooks/useHRLifecycle";

const STATUS_FLOW: Record<string, string | null> = {
  draft: "calculated",
  calculated: "approved",
  approved: "posted",
  posted: "paid",
  paid: null,
};

export default function HRPayrollAuditPage() {
  const { data: runs = [] } = usePayrollRuns();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: audit = [] } = usePayrollAuditLog(selected ?? undefined);
  const update = useUpdatePayrollStatus();

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n || 0);

  return (
    <div className="page-enter p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" /> Payroll Runs & Audit
      </h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Runs</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Period</TableHead><TableHead>Pay Date</TableHead>
                  <TableHead>Empl.</TableHead><TableHead>Net</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {runs.map((r: any) => (
                    <TableRow key={r.id} className={`cursor-pointer ${selected === r.id ? 'bg-muted/50' : ''}`} onClick={() => setSelected(r.id)}>
                      <TableCell className="text-xs">{r.run_number}</TableCell>
                      <TableCell className="text-xs">{r.pay_period_start} → {r.pay_period_end}</TableCell>
                      <TableCell className="text-xs">{r.pay_date}</TableCell>
                      <TableCell>{r.total_employees}</TableCell>
                      <TableCell className="font-medium">{fmt(r.total_net)}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {STATUS_FLOW[r.status] && (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); update.mutate({ id: r.id, status: STATUS_FLOW[r.status] as string }); }}>
                            {r.status === 'calculated' && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                            {r.status === 'approved' && <Lock className="h-3.5 w-3.5 mr-1" />}
                            {r.status === 'posted' && <Send className="h-3.5 w-3.5 mr-1" />}
                            → {STATUS_FLOW[r.status]}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {runs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm">No payroll runs yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <History className="h-4 w-4" /><CardTitle className="text-sm">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {!selected && <p className="text-xs text-muted-foreground">Select a run</p>}
            {audit.map((a: any) => (
              <div key={a.id} className="border-l-2 border-primary/30 pl-2 py-1">
                <p className="text-xs font-medium">{a.action}</p>
                {a.field_changed && <p className="text-[10px] text-muted-foreground">{a.field_changed}: {a.old_value} → {a.new_value}</p>}
                {a.reason && <p className="text-[10px] italic">{a.reason}</p>}
                <p className="text-[10px] text-muted-foreground">{format(new Date(a.performed_at), "MMM d, HH:mm")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
