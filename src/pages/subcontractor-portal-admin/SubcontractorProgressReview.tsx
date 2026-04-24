import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorPackages, useProgressSubmissions, useReviewProgress } from "@/hooks/useSubcontractorPortal";
import { Check, X, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function SubcontractorProgressReview() {
  const { data: packages = [] } = useSubcontractorPackages();
  const [pkgId, setPkgId] = useState<string | undefined>();
  const { data: submissions = [] } = useProgressSubmissions(pkgId);
  const review = useReviewProgress();

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Progress Review</h1>
          <p className="text-sm text-muted-foreground">Approve WBS-line progress with photo evidence and GPS.</p>
        </div>
        <Select value={pkgId} onValueChange={setPkgId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select package" /></SelectTrigger>
          <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.package_code} — {p.package_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>WBS</TableHead><TableHead>Cum %</TableHead>
              <TableHead>Foreman</TableHead><TableHead>GPS</TableHead><TableHead>Photos</TableHead>
              <TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {submissions.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{format(new Date(s.submitted_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="font-mono text-xs">{s.wbs_code}</TableCell>
                  <TableCell><Badge>{s.cumulative_pct}%</Badge></TableCell>
                  <TableCell className="text-xs">{s.foreman_name ?? "—"}</TableCell>
                  <TableCell>{s.gps_lat ? <span className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />{s.gps_lat.toFixed(4)}, {s.gps_lng?.toFixed(4)}</span> : "—"}</TableCell>
                  <TableCell className="text-xs">{s.photos?.length ?? 0}</TableCell>
                  <TableCell><Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    {s.status === "submitted" && <>
                      <Button size="sm" variant="ghost" onClick={() => review.mutate({ id: s.id, status: "approved" })}><Check className="h-4 w-4 text-success" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => review.mutate({ id: s.id, status: "rejected" })}><X className="h-4 w-4 text-destructive" /></Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{pkgId ? "No submissions yet" : "Select a package to view submissions"}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
