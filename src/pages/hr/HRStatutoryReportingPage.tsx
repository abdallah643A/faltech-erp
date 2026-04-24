import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileBadge2, Plus } from "lucide-react";
import { useStatutoryConfigs, useStatutoryFilings } from "@/hooks/useHRLifecycle";

const PRESETS: Record<string, string[]> = {
  SA: ["GOSI", "WPS", "Mudad", "Qiwa", "ZATCA-Payroll"],
  AE: ["WPS-AE", "Pension"],
  EG: ["Social-Insurance", "Tax-Form-4"],
};

export default function HRStatutoryReportingPage() {
  const { data: configs = [] } = useStatutoryConfigs();
  const { data: filings = [] } = useStatutoryFilings();

  return (
    <div className="page-enter p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <FileBadge2 className="h-5 w-5 text-primary" /> Statutory Reporting
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Active Schemes ({configs.length})</CardTitle>
            <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Add Scheme</Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {configs.length === 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="mb-2">No schemes configured. Available presets:</p>
                {Object.entries(PRESETS).map(([country, schemes]) => (
                  <div key={country} className="mb-1">
                    <Badge variant="outline" className="mr-1">{country}</Badge>
                    {schemes.join(", ")}
                  </div>
                ))}
              </div>
            )}
            {configs.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <p className="text-sm font-medium">{c.scheme_name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.country_code} · {c.scheme_code}</p>
                </div>
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Filings ({filings.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Period</TableHead><TableHead>Scheme</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filings.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground">No filings yet</TableCell></TableRow>}
                {filings.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{f.filing_period}</TableCell>
                    <TableCell className="text-xs">{f.country_code} · {f.scheme_code}</TableCell>
                    <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
