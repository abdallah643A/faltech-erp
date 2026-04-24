import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp } from "lucide-react";
import { useWorkforcePlans, useWorkforceGap } from "@/hooks/useHRLifecycle";

export default function HRWorkforcePlanningPage() {
  const { data: plans = [] } = useWorkforcePlans();
  const [planId, setPlanId] = useState<string>("");
  const { data: gaps = [] } = useWorkforceGap(planId);

  const totals = gaps.reduce((acc: any, g: any) => ({
    current: acc.current + (g.current_headcount || 0),
    planned: acc.planned + (g.planned_headcount || 0),
    hires: acc.hires + (g.hires_planned || 0),
    gap: acc.gap + (g.net_gap || 0),
    budget: acc.budget + Number(g.budget_amount || 0),
  }), { current: 0, planned: 0, hires: 0, gap: 0, budget: 0 });

  return (
    <div className="page-enter p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Workforce Planning
        </h1>
        <div className="w-72">
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>
              {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name} ({p.fiscal_year} · {p.scenario})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {planId && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <Kpi label="Current" value={totals.current} />
            <Kpi label="Planned" value={totals.planned} />
            <Kpi label="Net Gap" value={totals.gap} tone={totals.gap > 0 ? "warn" : undefined} />
            <Kpi label="Hires Planned" value={totals.hires} />
            <Kpi label="Budget" value={totals.budget.toLocaleString()} />
          </div>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <TrendingUp className="h-4 w-4" /><CardTitle className="text-sm">Gap by Position</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Department</TableHead><TableHead>Position</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Attrition</TableHead>
                  <TableHead className="text-right">Hires</TableHead>
                  <TableHead className="text-right">Net Gap</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {gaps.map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.department_name ?? "—"}</TableCell>
                      <TableCell>{g.position_title ?? "—"}</TableCell>
                      <TableCell className="text-right">{g.current_headcount}</TableCell>
                      <TableCell className="text-right">{g.planned_headcount}</TableCell>
                      <TableCell className="text-right">{g.attrition_estimate}</TableCell>
                      <TableCell className="text-right">{g.hires_planned}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <Badge variant={g.net_gap > 0 ? "destructive" : g.net_gap < 0 ? "secondary" : "outline"}>
                          {g.net_gap}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {gaps.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No plan lines yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const Kpi = ({ label, value, tone }: { label: string; value: any; tone?: "warn" }) => (
  <Card><CardContent className="p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-2xl font-semibold ${tone === "warn" ? "text-warning" : ""}`}>{value}</p>
  </CardContent></Card>
);
