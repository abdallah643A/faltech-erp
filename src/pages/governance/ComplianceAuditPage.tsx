import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useComplianceAudit } from "@/hooks/useGovernanceSuite";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const riskColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  critical: "bg-destructive text-destructive-foreground",
};

export default function ComplianceAuditPage() {
  const [filters, setFilters] = useState<any>({});
  const { data: rows = [], isLoading } = useComplianceAudit(filters);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck /> Compliance Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Unified, queryable log across workflow, ECM, approvals, signature, and sharing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <Select value={filters.module ?? "all"} onValueChange={(v) => setFilters({ ...filters, module: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
                <SelectItem value="ecm">ECM</SelectItem>
                <SelectItem value="approvals">Approvals</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
                <SelectItem value="sharing">Sharing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.risk_level ?? "all"} onValueChange={(v) => setFilters({ ...filters, risk_level: v === "all" ? undefined : v })}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risks</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Entity type" className="w-40" value={filters.entity_type ?? ""} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value || undefined })} />
            <Input placeholder="Entity ID" className="w-72" value={filters.entity_id ?? ""} onChange={(e) => setFilters({ ...filters, entity_id: e.target.value || undefined })} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audit entries match these filters</TableCell></TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "MMM dd HH:mm:ss")}</TableCell>
                  <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                  <TableCell className="text-xs font-medium">{r.action}</TableCell>
                  <TableCell className="text-xs">
                    {r.entity_type}
                    {r.entity_reference && <div className="text-muted-foreground">{r.entity_reference}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{r.actor_name ?? r.actor_id?.slice(0, 8) ?? "system"}</TableCell>
                  <TableCell><Badge className={riskColor[r.risk_level ?? "low"]}>{r.risk_level ?? "low"}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {(r.compliance_tags ?? []).map((t: string) => (
                      <Badge key={t} variant="secondary" className="me-1">{t}</Badge>
                    ))}
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
